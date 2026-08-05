import {useEffect, useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {
    ApprovalDecisionType,
    type ApprovalProcessResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {
    VndApprovalRouteView
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalRouteView.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    VndApprovalSummary
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalSummary.tsx";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {downloadWithToast} from "@/utils/downloadFile.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {
    RedactionDocumentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionDocumentsPanel.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {
    VndApproverResolutionPanel,
    type ResolutionChoice,
} from "./componentsCoordinationTab/VndApproverResolutionPanel.tsx";
import {VndRevisionNeededPanel} from "./componentsCoordinationTab/VndRevisionNeededPanel.tsx";

interface VndCoordinationTabProps {
    vnd: VndResponse;
}


const DECISION_MAP: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};

// Дебажный вывод process в консоль с подписями по-русски, чтобы удобно было смотреть в devtools
function logProcessDebug(process: ApprovalProcessResponse) {
    console.groupCollapsed(`[VndCoordinationTab] Согласование по ВНД: process.id=${process.id}, статус=${process.status}`);

    console.log("Статус:", process.status);
    console.log("Норматив первичного согласования (ч):", process.primaryDeadlineMinutes);
    console.log("Норматив повторного согласования (ч):", process.repeatDeadlineMinutes);
    console.log("Норматив финальной выдержки (ч):", process.finalHoldDeadlineMinutes);
    console.log("Первичное согласование начато:", process.primaryStartedAt);
    console.log("Дедлайн первичного согласования:", process.primaryDeadlineAt);
    console.log("Повторное согласование начато:", process.repeatStartedAt ?? "—");
    console.log("Дедлайн повторного согласования:", process.repeatDeadlineAt ?? "—");
    console.log("Комментарий инициатора при повторной отправке:", process.repeatInitiatorComment ?? "—");
    console.log("Финальная выдержка начата:", process.finalHoldStartedAt ?? "—");
    console.log("Дедлайн финальной выдержки:", process.finalHoldDeadlineAt ?? "—");
    console.log("Завершено:", process.completedAt ?? "—");
    console.log("Создано:", process.createdAt);
    console.log("Обновлено:", process.updatedAt);

    if (process.disagreementMatrixRows.length > 0) {
        console.group("Матрица разногласий:");
        process.disagreementMatrixRows.forEach((row) => {
            console.log(`Строка id=${row.id}`, {
                "Редакция разработчика": row.developerPosition,
                "Редакция и комментарий оппонента": row.opponentPosition,
                "Обоснование": row.developerJustification ?? "—",
            });
        });
        console.groupEnd();
    }

    console.group("Этапы согласования:");
    if (process.stages.length === 0) {
        console.log("Этапов нет");
    }
    process.stages.forEach((stage) => {
        console.log(`Этап #${stage.order} (id: ${stage.id})`, {
            "Тип": stage.kind,
            "Подразделение": `${stage.orgUnitName} (id: ${stage.orgUnitId})`,
            "Согласующий": `${stage.approverName} (id: ${stage.approverUserId})`,
            "Первичное решение": stage.primaryDecision,
            "Комментарий (первично)": stage.primaryComment ?? "—",
            "Дата решения (первично)": stage.primaryDecidedAt ?? "—",
            "Участвует в повторном": stage.participatesInRepeat ? "да" : "нет",
            "Повторное решение": stage.repeatDecision ?? "—",
            "Комментарий (повторно)": stage.repeatComment ?? "—",
            "Дата решения (повторно)": stage.repeatDecidedAt ?? "—",
            "Решение (финальная выдержка)": stage.finalHoldDecision ?? "—",
            "Комментарий (финальная выдержка)": stage.finalHoldComment ?? "—",
            "Дата решения (финальная выдержка)": stage.finalHoldDecidedAt ?? "—",
        });
    });
    console.groupEnd();

    console.groupEnd();
}

export function VndCoordinationTab({vnd}: VndCoordinationTabProps) {
    const {user} = useAuth();
    const currentUserId = user?.id;

    const [process, setProcess] = useState<ApprovalProcessResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [decisionError, setDecisionError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadProcess = async () => {
        try {
            const data = await coordinationService.getByVndId(vnd.id);
            setProcess(data);
        } catch (err) {
            setProcess(null);
            setError(err instanceof Error ? err.message : "Не удалось загрузить согласование");
        }
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await coordinationService.getByVndId(vnd.id);
                if (!cancelled) setProcess(data);
            } catch (err) {
                if (!cancelled) {
                    setProcess(null);
                    setError(err instanceof Error ? err.message : "Не удалось загрузить согласование");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [vnd.id]);

    // Логируем process в консоль каждый раз, когда он обновляется
    useEffect(() => {
        if (process) {
            logProcessDebug(process);
        }
    }, [process]);

    // Редакции ВНД грузим, чтобы достать ту, что связана с process.redactionId
    const {data: redactions, loading: redactionsLoading, error: redactionsError} = useVndRedactions(vnd.id);

    const download = useAsyncAction<number>();
    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), "Не удалось скачать файл");

    if (loading || redactionsLoading) {
        return <Loader label="Загрузка страница хода согласования…" fullHeight={false}/>;
    }

    if (error) {
        return (
            <EmptyState
                variant="error"
                title="Не удалось загрузить страницу хода согласования!"
                description={error}
            />
        );
    }

    if (!process) {
        return <div className="py-6 text-[13px] text-[#8b97ab]">Согласование ещё не запущено</div>;
    }

    const redaction = redactions?.find((r) => r.id === process.redactionId);

    const isPrimaryPhase = process.status === "primary";
    const isRepeatedPhase = process.status === "repeated";
    const isFinalHoldPhase = process.status === "final_hold";
    const isRevisionNeeded = process.status === "revision_needed";

    // На финальной выдержке решение может принять ЛЮБОЙ согласующий маршрута (participatesInRepeat
    // здесь не фильтрует — бэк на этом этапе открывает FinalHoldDecision всем этапам сразу)
    const myStage = process.stages.find((s) => {
        if (isPrimaryPhase) return s.approverUserId === currentUserId;
        if (isRepeatedPhase) return s.approverUserId === currentUserId && s.participatesInRepeat;
        if (isFinalHoldPhase) return s.approverUserId === currentUserId;
        return false;
    });

    const isInitiator = process.initiatorUserId === currentUserId;
    const isApprover = !isInitiator && !!myStage;

    // На финальной выдержке участие добровольное: дедлайна как такового нет, "pending" здесь
    // означает лишь "ещё не высказался", а не "просрочил" — просрочка на этом этапе не считается
    // нарушением и обрабатывается на бэке отдельно (см. ProcessTimeoutsAsync)
    const isPendingForMe =
        !!myStage &&
        ((isPrimaryPhase && myStage.primaryDecision === "pending") ||
            (isRepeatedPhase && (myStage.repeatDecision === null || myStage.repeatDecision === "pending")) ||
            (isFinalHoldPhase && (myStage.finalHoldDecision === null || myStage.finalHoldDecision === "pending")));

    const handleResolutionSubmit = async (choice: ResolutionChoice, comment: string) => {
        if (!myStage) return;
        setSubmitting(true);
        setDecisionError(null);
        try {
            await coordinationService.decide(vnd.id, myStage.id, {
                decision: DECISION_MAP[choice],
                comment: comment || undefined,
            });
            await loadProcess();
        } catch (err) {
            setDecisionError(err instanceof Error ? err.message : "Не удалось отправить резолюцию");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Вид для согласующего ---
    if (isApprover) {
        return (
            <div className="py-4">
                <VndApprovalSummary process={process}/>

                {redactionsError && (
                    <div>
                        <EmptyState
                            variant="error"
                            title="Не удалось загрузить документы редакции: "
                            description={redactionsError}
                        />
                    </div>
                )}

                <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">Данная редакция:</div>
                {redaction && (
                    <div className="mb-5 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                        <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] px-5 py-[13px]">
                            <div className="text-[13.5px] font-semibold text-[#1c2740]">{redaction.code}</div>
                            <span className="text-[12px] text-[#8b97ab]">{formatDate(redaction.createdAt)}</span>
                        </div>

                        {redaction.description && (
                            <div className="border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3 text-[13px] leading-[1.6] text-[#3c424a]">
                                <span className="font-semibold">Описание редакции:</span> {redaction.description}
                            </div>
                        )}

                        {download.error && (
                            <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                                {download.error}
                            </div>
                        )}

                        <RedactionDocumentsPanel
                            vnd={vnd}
                            selected={redaction}
                            downloadingId={download.activeId}
                            onDownload={handleDownload}
                        />
                    </div>
                )}

                <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">Установленный маршрут согласования:</div>
                <VndApprovalRouteView process={process} highlightStageId={myStage?.id}/>

                {isPendingForMe && (
                    <div className="mt-6">
                        {isFinalHoldPhase && (
                            <div className="mb-3 rounded-[10px] border border-[#e0e6ef] bg-[#f6f8fb] px-4 py-[10px] text-[12.5px] text-[#5c6779]">
                                Финальная выдержка — этап ознакомления. Оставлять решение по нему необязательно:
                                если у вас нет замечаний, можно ничего не делать, документ пройдёт дальше сам.
                            </div>
                        )}
                        <VndApproverResolutionPanel
                            onSubmit={handleResolutionSubmit}
                            submitting={submitting}
                            error={decisionError}
                            phase={isFinalHoldPhase ? "finalHold" : isRepeatedPhase ? "repeated" : "primary"}
                        />
                    </div>
                )}
            </div>
        );
    }

    // --- Вид для инициатора ---
    return (
        <div className="py-4">
            <VndApprovalSummary process={process}/>

            {redactionsError && (
                <div>
                    <EmptyState
                        variant="error"
                        title="Не удалось загрузить документы редакции: "
                        description={redactionsError}
                    />
                </div>
            )}

            <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">Данная редакция:</div>
            {redaction && (
                <div className="mb-5 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] px-5 py-[13px]">
                        <div className="text-[13.5px] font-semibold text-[#1c2740]">{redaction.code}</div>
                        <span className="text-[12px] text-[#8b97ab]">{formatDate(redaction.createdAt)}</span>
                    </div>

                    {redaction.description && (
                        <div className="border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3 text-[13px] leading-[1.6] text-[#3c424a]">
                            <span className="font-semibold">Описание редакции:</span> {redaction.description}
                        </div>
                    )}

                    {download.error && (
                        <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {download.error}
                        </div>
                    )}

                    <RedactionDocumentsPanel
                        vnd={vnd}
                        selected={redaction}
                        downloadingId={download.activeId}
                        onDownload={handleDownload}
                    />
                </div>
            )}

            <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">Установленный маршрут согласования:</div>
            <VndApprovalRouteView process={process}/>

            {isRevisionNeeded && isInitiator && (
                <VndRevisionNeededPanel
                    vndId={vnd.id}
                    process={process}
                    requiresTid={!!redaction && redaction.number > 1}
                    onChanged={loadProcess}
                />
            )}
        </div>
    );
}