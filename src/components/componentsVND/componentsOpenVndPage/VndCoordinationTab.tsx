// Таб "Ход согласования"
import {useRef, useState} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {
    ApprovalDecisionType,
    type ApprovalStageResponse
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {downloadWithToast} from "@/utils/downloadFile.ts";

///
import {
    VndApprovalRouteView
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalRouteView.tsx";
import {
    VndApprovalSummary
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalSummary.tsx";
import {
    VndStartApprovalModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndStartApprovalModal.tsx";
import {
    VndApproverResolutionPanel,
    type ResolutionChoice,
} from "./componentsCoordinationTab/VndApproverResolutionPanel.tsx";
import {VndRevisionNeededPanel} from "./componentsCoordinationTab/VndRevisionNeededPanel.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    RedactionSummaryCard
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionSummaryCard.tsx";
import {
    RedactionCompareModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionCompareModal.tsx";
import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {AlertTriangle, CheckCircle2, Clock3, Columns2, FileCheck2, XCircle} from "lucide-react";
import type {RedactionLanguage} from "@/utils/redactionLanguagePanelUtils.ts";
import {useApprovalProcess} from "@/hooks/coordinationHooks/useApprovalProcess.ts";

///

interface VndCoordinationTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void; // Для перезагрузки
}

// Этапы, из которых инициатор ещё может отозвать согласование
// Первичное согласование, Согласование после внесённых изменений, Согласование после внесённых изменений, Доработка документа после правок
// * approved - согласовано, rejected - отклонено;
const CANCELLABLE_PHASE = ["primary", "repeated", "final_hold", "revision_needed"];
// Резолюции
const DECISION_MAP: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};

// Какая из модалок сейчас открыта: стартовая модалка согласования,
// сравнение редакций или просмотр одной редакции.
type CoordinationModal =
    | { kind: "startApproval" }
    | { kind: "compare" }
    | { kind: "view"; redaction: VndRedactionResponse; language: RedactionLanguage };

export function VndCoordinationTab({vnd, onVndChanged}: VndCoordinationTabProps) {
    const {user, hasPermission} = useAuth();
    const currentUserId = user?.id;

    const {process, loading, error, reload} = useApprovalProcess(vnd.id); // Сами данные о согласовании

    const [modal, setModal] = useState<CoordinationModal | null>(null);
    const openView = (redaction: VndRedactionResponse, language: RedactionLanguage) =>
        setModal({kind: "view", redaction, language});

    const [cancelling, setCancelling] = useState(false); // Отзыв согласования
    const [cancelModalOpen, setCancelModalOpen] = useState(false); // Модалка отзыва согласования

    // Набор прав на создание/актуализацию ВНД без запроса права.
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);
    // Право на отзыв чужого согласования (роль главного редактора).
    const canCancelAnyApproval = hasPermission(PermissionCode.CancelAnyVndApproval);

    const [submitting, setSubmitting] = useState(false); // Идёт ли отправка резолюции
    const [decisionError, setDecisionError] = useState<string | null>(null); // Ошибка отправки резолюции
    // Синхронный лок поверх стейта submitting — на случай двойного клика/повторного вызова
    // раньше, чем успеет прийти обновлённый проп submitting (см. подробный комментарий
    // у submitLockRef в VndApproverResolutionPanel). Хук должен стоять здесь, ДО всех
    // условных return ниже (loading/error/!process) — иначе порядок хуков между рендерами
    // не совпадает, и React падает с "Rendered more hooks than during the previous render".
    const decisionInFlightRef = useRef(false);

    // Редакции ВНД грузим, чтобы достать ту, что связана с process.redactionId
    const {data: redactions, loading: redactionsLoading, error: redactionsError} = useVndRedactions(vnd.id);

    const download = useAsyncAction<number>();
    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), "Не удалось скачать редакцию!");

    if (loading || redactionsLoading) {
        return <Loader label="Загрузка страницы хода согласования…" fullHeight={false}/>;
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
                            onClick={() => setModal({kind: "startApproval"})}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                        >
                            Начать согласование (без изменений)
                        </button>
                    </div>
                )}

                {modal?.kind === "startApproval" && (
                    <VndStartApprovalModal
                        vndId={vnd.id}
                        onClose={() => setModal(null)}
                        onStarted={() => {
                            setModal(null);
                            onVndChanged?.();
                        }}
                    />
                )}
            </div>
        );
    }

    const redaction = redactions?.find((r) => r.id === process.redactionId);

    // Если у редакции, вынесенной на согласование, номер 1 — это первая редакция ВНД,
    // предыдущей ещё не существует. Иначе ВНД актуализируется, и есть предыдущая
    // (действовавшая до старта этой актуализации) редакция — её тоже показываем рядом.
    const isFirstRedaction = redaction?.number === 1;
    const previousRedaction = redaction
        ? redactions?.find((r) => r.number === redaction.number - 1)
        : undefined;

    const isPrimaryPhase = process.status === "primary";
    const isRepeatedPhase = process.status === "repeated";
    const isFinalHoldPhase = process.status === "final_hold";
    const isRevisionNeeded = process.status === "revision_needed";
    const isApproved = process.status === "approved";
    const isRejected = process.status === "rejected";

    // На финальной выдержке решение может принять ЛЮБОЙ согласующий маршрута
    const myStage = process.stages.find((s: ApprovalStageResponse) => {
        if (isPrimaryPhase) return s.approverUserId === currentUserId;
        if (isRepeatedPhase) return s.approverUserId === currentUserId && s.participatesInRepeat;
        if (isFinalHoldPhase) return s.approverUserId === currentUserId;
        return false;
    });

    const isInitiator = process.initiatorUserId === currentUserId;
    const isApprover = !isInitiator && !!myStage;

    // На финальной выдержке участие добровольное
    const isPendingForMe =
        !!myStage &&
        ((isPrimaryPhase && myStage.primaryDecision === "pending") ||
            (isRepeatedPhase && (myStage.repeatDecision === null || myStage.repeatDecision === "pending")) ||
            (isFinalHoldPhase && (myStage.finalHoldDecision === null || myStage.finalHoldDecision === "pending")));

    const handleResolutionSubmit = async (choice: ResolutionChoice, comment: string, files: File[]) => {
        if (!myStage || decisionInFlightRef.current) return;
        decisionInFlightRef.current = true;
        setSubmitting(true);
        setDecisionError(null);
        try {
            await coordinationService.decide(vnd.id, myStage.id, {
                decision: DECISION_MAP[choice],
                comment: comment || undefined,
                files: files.length > 0 ? files : undefined,
            });
            await reload();
        } catch (err) {
            setDecisionError(err instanceof Error ? err.message : "Не удалось отправить резолюцию");
        } finally {
            decisionInFlightRef.current = false;
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        setCancelling(true);
        try {
            await coordinationService.cancel(vnd.id);
            toast.success("Согласование отозвано", "Документ возвращён в черновик");
            setCancelModalOpen(false);
            onVndChanged?.();
        } catch (err) {
            toast.error("Не удалось отозвать", err instanceof Error ? err.message : undefined);
        } finally {
            setCancelling(false);
        }
    };

    // Конфиг шапки над установленным маршрутом
    const routeHeaderConfig = isApproved
        ? {
            border: "border-[#bfe3cc]", bg: "bg-[#eef9f2]",
            icon: CheckCircle2, iconColor: "text-[#1f7a4c]",
            titleColor: "text-[#1c5e37]", textColor: "text-[#2f6b47]",
            title: "Редакция согласована",
            description: "Все согласующие приняли решение без замечаний. Осталось дождаться консолидации редакции — её выполняет инициатор согласования или главный редактор.",
        }
        : isRejected
            ? {
                border: "border-[#f2c2c2]", bg: "bg-[#fdf1f1]",
                icon: XCircle, iconColor: "text-[#c0392b]",
                titleColor: "text-[#8f2a1f]", textColor: "text-[#a63a2c]",
                title: "Редакция отклонена",
                description: "Один из согласующих отклонил редакцию — согласование прекращено. Редакция вернулась в черновик, изменения нужно внести заново и отправить на новое согласование.",
            }
            : (isRevisionNeeded && !isInitiator)
                ? {
                    border: "border-[#f0dcae]", bg: "bg-[#fdf6e8]",
                    icon: Clock3, iconColor: "text-[#9a6408]",
                    titleColor: "text-[#7a5006]", textColor: "text-[#8a6a1f]",
                    title: "Инициатор согласования работает над замечаниями",
                    description: "Все согласующие уже приняли решение на этом этапе. Документ вернётся к вам на повторное согласование, как только инициатор внесёт правки по замечаниям или заполнит матрицу разногласий.",
                }
                : null;

    // --- Вид для согласующего ---
    if (isApprover) {
        return (
            <div className="py-4 px-4 sm:px-6">
                {vnd.actualizationPlannedNoChanges && (
                    <div
                        className="mb-3 inline-flex items-start gap-2.5 rounded-[12px] border border-[#dde0fa] bg-[#f4f5fd] px-3.5 py-3 max-w-full">
                        <FileCheck2 size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#4e57d6]"/>
                        <p className="text-[12.5px] leading-[1.55] text-[#3a4560]">
                            Обратите внимание: Инициатор текущего согласования считает, что актуализация данного ВНД
                            должна пройти без изменений редакции. На согласовании находится
                            существующая действующая редакция как есть, без нового файла.
                        </p>
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

                <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[13.5px] font-bold text-[#1c2740]">
                        {isFirstRedaction
                            ? "Данная редакция (первая для этого ВНД):"
                            : "Новая редакция и предыдущая для этого ВНД:"}
                    </div>
                    {!isFirstRedaction && redaction && previousRedaction && (
                        <button
                            type="button"
                            onClick={() => setModal({kind: "compare"})}
                            className="cursor-pointer flex h-[35px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                        >
                            <Columns2 size={15} strokeWidth={2}/>
                            Просмотр и сравнение редакций
                        </button>
                    )}
                </div>
                {redaction && (
                    <RedactionSummaryCard
                        vnd={vnd}
                        redaction={redaction}
                        previousRedaction={!isFirstRedaction ? previousRedaction : undefined}
                        downloadingId={download.activeId}
                        downloadError={download.error}
                        onDownload={handleDownload}
                        onView={openView}
                    />
                )}
                {modal?.kind === "compare" && redaction && previousRedaction && (
                    <RedactionCompareModal
                        vnd={vnd}
                        redaction={redaction}
                        previousRedaction={previousRedaction}
                        downloadingId={download.activeId}
                        onDownload={handleDownload}
                        onClose={() => setModal(null)}
                    />
                )}
                {modal?.kind === "view" && (
                    <RedactionViewModal
                        vnd={vnd}
                        redaction={modal.redaction}
                        initialLanguage={modal.language}
                        downloadingId={download.activeId}
                        onDownload={handleDownload}
                        onClose={() => setModal(null)}
                    />
                )}

                <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">Установленный маршрут согласования:</div>
                <div
                    className={`rounded-[16px] border overflow-hidden ${routeHeaderConfig ? routeHeaderConfig.border : "border-[#e5e9f0]"}`}>
                    {routeHeaderConfig && (
                        <div
                            className={`flex items-start gap-3 border-b px-5 py-3 ${routeHeaderConfig.border} ${routeHeaderConfig.bg}`}>
                            <routeHeaderConfig.icon size={18}
                                                    className={`mt-[1px] flex-none ${routeHeaderConfig.iconColor}`}/>
                            <div>
                                <div className={`text-[13px] font-semibold ${routeHeaderConfig.titleColor}`}>
                                    {routeHeaderConfig.title}
                                </div>
                                <div className={`mt-0.5 text-[12.5px] leading-[1.5] ${routeHeaderConfig.textColor}`}>
                                    {routeHeaderConfig.description}
                                </div>
                            </div>
                        </div>
                    )}
                    <VndApprovalRouteView process={process} highlightStageId={myStage?.id}
                                          frameless={!!routeHeaderConfig}/>
                </div>

                {isPendingForMe && (
                    <div className="mt-6">
                        {isFinalHoldPhase && (
                            <div
                                className="mb-3 rounded-[10px] border border-[#e0e6ef] bg-[#f6f8fb] px-4 py-[10px] text-[12.5px] text-[#5c6779]">
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

    // --- Вид для инициатора согласования ---
    return (
        <div className="py-4 px-6">
            {/* Если актуализация без изменений */}
            {vnd.actualizationPlannedNoChanges && (
                <div
                    className="mb-3 inline-flex items-start gap-2.5 rounded-[12px] border border-[#dde0fa] bg-[#f4f5fd] px-3.5 py-3 max-w-full">
                    <FileCheck2 size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#4e57d6]"/>
                    <p className="text-[12.5px] leading-[1.55] text-[#3a4560]">
                        Обратите внимание: Вы заявили, что актуализация должна пройти без
                        изменений. На согласовании действующая редакция как есть, без нового
                        файла. Согласующие также увидят соответствующее сообщение.
                    </p>
                </div>
            )}

            {/* Плашка для инициатора: редакцию отправили на доработку, есть замечания */}
            {isRevisionNeeded && (
                <div className="mx-auto mb-5 flex w-fit max-w-full items-start gap-2.5 rounded-[12px] border border-[#f0dcae] bg-[#fdf6e8] px-4 py-3">
                    <AlertTriangle size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#9a6408]"/>
                    <p className="text-[12.5px] leading-[1.55] text-[#7a5006]">
                        <span className="font-semibold">Редакцию ВНД отправили на доработку — есть замечания.</span>
                        {" "}Пожалуйста, исправьте их: после отправки согласование перейдёт на следующий этап
                        «Согласование после внесённых изменений».
                    </p>
                </div>
            )}

            {/* Информационный блок */}
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

            {/* Блок ознакомления с редакцией ("Данная редакция:") (+ кнопка сравнения) */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[13.5px] font-bold text-[#1c2740]">
                    {isFirstRedaction
                        ? "Данная редакция (первая для этого ВНД):"
                        : "Новая редакция и предыдущая для этого ВНД:"}
                </div>
                {!isFirstRedaction && redaction && previousRedaction && (
                    <button
                        type="button"
                        onClick={() => setModal({kind: "compare"})}
                        className="cursor-pointer flex h-[35px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                    >
                        <Columns2 size={15} strokeWidth={2}/>
                        Просмотр и сравнение редакций
                    </button>
                )}
            </div>

            {/* Панель с редакциями */}
            {redaction && (
                <RedactionSummaryCard
                    vnd={vnd}
                    redaction={redaction}
                    previousRedaction={!isFirstRedaction ? previousRedaction : undefined}
                    downloadingId={download.activeId}
                    downloadError={download.error}
                    onDownload={handleDownload}
                    onView={openView}
                />
            )}
            {/* Сравнение двух редакций */}
            {modal?.kind === "compare" && redaction && previousRedaction && (
                <RedactionCompareModal
                    vnd={vnd}
                    redaction={redaction}
                    previousRedaction={previousRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setModal(null)}
                />
            )}
            {/* Открытие одной редакции */}
            {modal?.kind === "view" && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={modal.redaction}
                    initialLanguage={modal.language}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setModal(null)}
                />
            )}

            {/* Установленный маршрут согласования — с цветной шапкой-статусом, если применимо */}
            <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">Установленный маршрут согласования:</div>
            <div
                className={`rounded-[16px] border overflow-hidden ${routeHeaderConfig ? routeHeaderConfig.border : "border-[#e5e9f0]"}`}>
                {routeHeaderConfig && (
                    <div
                        className={`flex items-start gap-3 border-b px-5 py-3 ${routeHeaderConfig.border} ${routeHeaderConfig.bg}`}>
                        <routeHeaderConfig.icon size={18}
                                                className={`mt-[1px] flex-none ${routeHeaderConfig.iconColor}`}/>
                        <div>
                            <div className={`text-[13px] font-semibold ${routeHeaderConfig.titleColor}`}>
                                {routeHeaderConfig.title}
                            </div>
                            <div className={`mt-0.5 text-[12.5px] leading-[1.5] ${routeHeaderConfig.textColor}`}>
                                {routeHeaderConfig.description}
                            </div>
                        </div>
                    </div>
                )}
                <VndApprovalRouteView process={process} frameless={!!routeHeaderConfig}/>
            </div>

            {/* Панель с замечаниями (если они есть) на этапе исправления замечаний для инициатора */}
            {isRevisionNeeded && isInitiator && (
                <VndRevisionNeededPanel
                    vndId={vnd.id}
                    vnd={vnd}
                    process={process}
                    redaction={redaction}
                    requiresTid={!!redaction && redaction.number > 1}
                    onChanged={reload}
                />
            )}

            {/* Отзыв редакции с согласования */}
            {(isInitiator || canCancelAnyApproval) && CANCELLABLE_PHASE.includes(process.status) && (
                <div className="mt-8 rounded-[14px] border border-[#f0dede] overflow-hidden">
                    <div className="bg-[#fdf6f5] px-4 py-2.5 border-b border-[#f0dede]">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#c0392b]">
                            Опасная зона
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white">
                        <div>
                            <div className="text-[13px] font-semibold text-[#1c2740]">
                                Отозвать согласование
                            </div>
                            <span className="text-[12.5px] text-[#8b97ab]">
                                Документ вернётся в черновик, задачи у согласующих будут сняты.
                            </span>
                        </div>
                        <button
                            onClick={() => setCancelModalOpen(true)}
                            className="shrink-0 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] transition-colors"
                        >
                            Отозвать
                        </button>
                    </div>
                </div>
            )}
            <ConfirmActionModal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleCancel}
                title="Отозвать согласование?"
                message="Редакция и документ вернутся в черновик, задача у согласующих будет снята."
                confirmLabel="Отозвать"
                loadingLabel="Отзываю…"
                loading={cancelling}
                variant="danger"
                icon={AlertTriangle}
            />
        </div>
    );
}