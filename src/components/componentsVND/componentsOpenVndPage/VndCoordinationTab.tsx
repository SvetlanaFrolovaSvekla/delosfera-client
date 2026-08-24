import {useEffect, useState} from "react";
import axios from "axios";
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
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {
    VndStartApprovalModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndStartApprovalModal.tsx";

interface VndCoordinationTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void;
}

// Статусы, из которых инициатор ещё может отозвать согласование
const CANCELLABLE_STATUSES = ["primary", "repeated", "final_hold", "revision_needed"];


const DECISION_MAP: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};


export function VndCoordinationTab({vnd, onVndChanged}: VndCoordinationTabProps) {
    const {user, hasPermission} = useAuth();
    const currentUserId = user?.id;
    const [cancelling, setCancelling] = useState(false);
    const [startApprovalOpen, setStartApprovalOpen] = useState(false);

    // Зеркалит бэковый IsChiefEditor() (VndApprovalService/VndService) — главному редактору
    // разрешено отзывать согласование даже когда он не инициатор (см. VndApprovalService.CancelAsync).
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    const [process, setProcess] = useState<ApprovalProcessResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [decisionError, setDecisionError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // 404 от GET .../approval означает "для последней редакции согласование ещё не запускалось" —
    // это ожидаемое, а не ошибочное состояние (черновик ещё не отправлен, или заявлена
    // актуализация без изменений и запуск согласования только предстоит). Раньше это тоже
    // считалось ошибкой загрузки, и вкладка вместо кнопки "Начать согласование (без изменений)"
    // всегда показывала EmptyState с сырым текстом ошибки бэка.
    const isNotStartedYet = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 404;

    const loadProcess = async () => {
        try {
            const data = await coordinationService.getByVndId(vnd.id);
            setProcess(data);
            setError(null);
        } catch (err) {
            setProcess(null);
            setError(isNotStartedYet(err)
                ? null
                : err instanceof Error ? err.message : "Не удалось загрузить согласование");
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
                    setError(isNotStartedYet(err)
                        ? null
                        : err instanceof Error ? err.message : "Не удалось загрузить согласование");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [vnd.id]);

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
        // Особый случай: заявлена "актуализация без изменений" с согласованием — новая редакция
        // не загружалась, но согласование всё равно нужно запустить (над существующей действующей
        // редакцией, см. послабление в VndApprovalService.StartAsync). Обычный триггер запуска
        // согласования (RedactionStatusBanner на вкладке «Редакции») здесь не появится — там нет
        // черновика, который можно было бы отправить, — поэтому даём отдельную кнопку прямо тут.
        const canStartNoChangesReview =
            vnd.status === "onact" && vnd.actualizationRequiresApproval && vnd.actualizationPlannedNoChanges &&
            (isChiefEditor || vnd.actualizationResponsibleUserId === currentUserId);

        return (
            <div className="py-6">
                <div className="text-[13px] text-[#8b97ab]">Согласование ещё не запущено</div>
                {canStartNoChangesReview && (
                    <div className="mt-4 flex flex-col items-start gap-2">
                        <p className="text-[12.5px] leading-[1.6] text-[#55617a]">
                            Заявлена актуализация без изменений — можно отправить существующую
                            действующую редакцию на согласование как есть, без загрузки нового файла.
                        </p>
                        <button
                            type="button"
                            onClick={() => setStartApprovalOpen(true)}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                        >
                            Начать согласование (без изменений)
                        </button>
                    </div>
                )}

                {startApprovalOpen && (
                    <VndStartApprovalModal
                        vndId={vnd.id}
                        onClose={() => setStartApprovalOpen(false)}
                        onStarted={() => {
                            setStartApprovalOpen(false);
                            onVndChanged?.();
                        }}
                    />
                )}
            </div>
        );
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

    const handleCancel = async () => {
        if (!window.confirm(
            "Отозвать согласование? Редакция и документ вернутся в черновик, задача у согласующих будет снята.")) return;
        setCancelling(true);
        try {
            await coordinationService.cancel(vnd.id);
            toast.success("Согласование отозвано", "Документ возвращён в черновик");
            onVndChanged?.();
        } catch (err) {
            toast.error("Не удалось отозвать", err instanceof Error ? err.message : undefined);
        } finally {
            setCancelling(false);
        }
    };

    // --- Вид для согласующего ---
    if (isApprover) {
        return (
            <div className="py-4 px-4 sm:px-6">
                {vnd.actualizationPlannedNoChanges && (
                    <div className="mb-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf6e8] px-4 py-[10px] text-[12.5px] text-[#7a5006]">
                        Заявлена актуализация без изменений — на согласовании существующая действующая
                        редакция как есть, без нового файла.
                    </div>
                )}

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
            {vnd.actualizationPlannedNoChanges && (
                <div className="mb-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf6e8] px-4 py-[10px] text-[12.5px] text-[#7a5006]">
                    Заявлена актуализация без изменений — на согласовании существующая действующая
                    редакция как есть, без нового файла.
                </div>
            )}

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

            {(isInitiator || isChiefEditor) && CANCELLABLE_STATUSES.includes(process.status) && (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-[12px] border border-[#f0dede] bg-[#fdf6f5] px-4 py-3">
                    <span className="text-[12.5px] text-[#8b6a68]">
                        Можно отозвать согласование — документ вернётся в черновик для правок.
                    </span>
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="shrink-0 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] disabled:opacity-60"
                    >
                        {cancelling ? "Отзываю…" : "Отозвать согласование"}
                    </button>
                </div>
            )}
        </div>
    );
}