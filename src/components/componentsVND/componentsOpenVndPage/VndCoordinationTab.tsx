// Таб "Ход согласования"
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {
    ApprovalDecisionType,
    type ApprovalQuoteItem,
    type ApprovalStageResponse
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useApprovalProcess} from "@/hooks/coordinationHooks/useApprovalProcess.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";

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
    VndSelectApproverModal, type ApproverOption
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";
import {
    VndApproverResolutionPanel,
    type ResolutionChoice,
    type VndApproverResolutionPanelHandle,
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
import {AlertTriangle, CheckCircle2, Clock3, Columns2, FileCheck2, Info, XCircle} from "lucide-react";
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
    | {
    kind: "view";
    redaction: VndRedactionResponse;
    /* Не указывается для режима "сослаться на текст" (см. handleCiteRequest) - там нет
     конкретной вкладки, с которой имело бы смысл начинать, открываем как есть (первый
     доступный язык), и пользователь сам переключается, если нужно). Для "перейти к цитате"
     (см. handleJumpToQuote) - вкладка, к которой относится сама цитата. */
    language?: RedactionViewTarget;
    /* Передаётся только когда модалка открыта через "+ Сослаться на текст редакции" -
     превращает обычный просмотр в режим цитирования (см. RedactionViewModal.onInsertQuote). */
    onInsertQuote?: (selectedText: string, documentTarget: RedactionViewTarget) => void;
    /* Передаётся только когда модалка открыта, чтобы сразу проскроллить к месту одной из
     уже вставленных цитат (см. handleJumpToQuote/RedactionViewModal.initialSearchQuery). */
    initialSearchQuery?: string;
    /* Версия документа редакции, к которой относится цитата (см.
     FormattedCommentQuoteRef.revisionIndex) - передаётся вместе с initialSearchQuery, чтобы
     "Показать в тексте" открывало именно ту версию, к которой относится цитата, а не текущую
     живую (см. handleShowQuoteInText/RedactionViewModal.initialRevisionIndex). */
    initialRevisionIndex?: number;
};

export function VndCoordinationTab({vnd, onVndChanged}: VndCoordinationTabProps) {
    const {t} = useTranslation();
    const {user, hasPermission} = useAuth();
    const currentUserId = user?.id;

    const {process, loading, error, reload} = useApprovalProcess(vnd.id); // Сами данные о согласовании

    const [modal, setModal] = useState<CoordinationModal | null>(null);
    const openView = (redaction: VndRedactionResponse, language: RedactionViewTarget) =>
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
    // Право редактировать маршрут уже запущенного согласования - добавлять/убирать
    // согласующих (роль главного редактора, см. VndApprovalService.AddApproverAsync/
    // RemoveApproverAsync на бэке).
    const canEditApprovalRoute = hasPermission(PermissionCode.EditAnyVndApprovalRoute);

    const [addApproverModalOpen, setAddApproverModalOpen] = useState(false); // Модалка "Добавить согласующего"
    // Этап, который сейчас предлагается убрать (открывает модалку подтверждения) - null, если
    // модалка закрыта.
    const [removingStage, setRemovingStage] = useState<ApprovalStageResponse | null>(null);
    const [removingApprover, setRemovingApprover] = useState(false);

    const [submitting, setSubmitting] = useState(false); // Идёт ли отправка резолюции
    const [decisionError, setDecisionError] = useState<string | null>(null); // Ошибка отправки резолюции
    // Синхронный лок поверх стейта submitting — на случай двойного клика/повторного вызова
    // раньше, чем успеет прийти обновлённый проп submitting (см. подробный комментарий
    // у submitLockRef в VndApproverResolutionPanel). Хук должен стоять здесь, ДО всех
    // условных return ниже (loading/error/!process) — иначе порядок хуков между рендерами
    // не совпадает, и React падает с "Rendered more hooks than during the previous render".
    const decisionInFlightRef = useRef(false);

    // "+ Сослаться на текст редакции" в "Ваша резолюция" - ref должен стоять здесь же, ДО
    // условных return ниже (см. комментарий у decisionInFlightRef чуть выше) - иначе он не
    // вызывается при early return и React падает с "Rendered more hooks than during the
    // previous render". Сам handleCiteRequest (не хук) определён ниже, рядом с redaction.
    const resolutionPanelRef = useRef<VndApproverResolutionPanelHandle>(null);

    // Редакции ВНД грузим, чтобы достать ту, что связана с process.redactionId
    const {
        data: redactions, loading: redactionsLoading, error: redactionsError, refetch: refetchRedactions,
    } = useVndRedactions(vnd.id);

    // После повторной отправки перезагружаем и процесс согласования, и список редакций —
    // метка "Обновлено, <дата>" в "Данная редакция:" берётся из персистентных полей
    // redaction.docRuUpdatedAt/docKgUpdatedAt/docEnUpdatedAt (см. RedactionDocumentsPanel),
    // которые уже придут в свежих данных с бэка, отдельного состояния для этого не нужно.
    const handleResubmitted = async () => {
        await reload();
        refetchRedactions();
        toast.success(t("openVndPage.coordinationTab.resubmittedToastTitle"), t("openVndPage.coordinationTab.resubmittedToastDescription"));
    };

    const download = useAsyncAction<number>();
    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), t("openVndPage.coordinationTab.downloadError"));

    if (loading || redactionsLoading) {
        return <Loader label={t("openVndPage.coordinationTab.loadingLabel")} fullHeight={false}/>;
    }

    if (error) {
        return (
            <EmptyState
                variant="error"
                title={t("openVndPage.coordinationTab.loadErrorTitle")}
                description={error}
            />
        );
    }

    if (!process) {
        const canStartNoChangesReview =
            vnd.status === "onact" && vnd.actualizationRequiresApproval && vnd.actualizationPlannedNoChanges &&
            (isChiefEditor || vnd.actualizationResponsibleUserId === currentUserId);

        return (
            <div className="px-6 py-4">
                <div className="rounded-[16px] border border-[#e5e9f0] bg-white overflow-hidden">
                    <EmptyState
                        embedded
                        icon={Clock3}
                        title={t("openVndPage.coordinationTab.notStartedTitle")}
                        description={t("openVndPage.coordinationTab.notStartedDescription")}
                    />
                </div>
                {canStartNoChangesReview && (
                    <div className="mt-4 flex flex-col items-start gap-2">
                        <p className="text-[12.5px] leading-[1.6] text-[#55617a]">
                            {t("openVndPage.coordinationTab.noChangesReviewHint")}
                        </p>
                        <button
                            type="button"
                            onClick={() => setModal({kind: "startApproval"})}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                        >
                            {t("openVndPage.coordinationTab.startNoChangesButton")}
                        </button>
                    </div>
                )}

                {modal?.kind === "startApproval" && (
                    <VndStartApprovalModal
                        vndId={vnd.id}
                        draftOwnerUserId={vnd.createdByUserId}
                        draftOwnerUserName={vnd.createdByUserName}
                        currentUserId={currentUserId}
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
    // Согласование ещё идёт - маркеры цитат в тексте редакции кликабельны (открывают резолюцию
    // целиком) только пока это так; после завершения (согласовано/отклонено) маркеры остаются
    // видны, но клик по ним больше ничего не открывает - см. RedactionViewModal.quoteMarksClickable.
    const isProcessActive = !isApproved && !isRejected;

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

    const handleResolutionSubmit = async (
        choice: ResolutionChoice, comment: string, files: File[], quotes: ApprovalQuoteItem[],
    ) => {
        if (!myStage || decisionInFlightRef.current) return;
        decisionInFlightRef.current = true;
        setSubmitting(true);
        setDecisionError(null);
        try {
            await coordinationService.decide(vnd.id, myStage.id, {
                decision: DECISION_MAP[choice],
                comment: comment || undefined,
                files: files.length > 0 ? files : undefined,
                quotes: quotes.length > 0 ? quotes : undefined,
            });
            await reload();
            toast.success(t("openVndPage.coordinationTab.decisionSubmittedToastTitle"), t("openVndPage.coordinationTab.decisionSubmittedToastDescription"));
        } catch (err) {
            setDecisionError(err instanceof Error ? err.message : t("openVndPage.coordinationTab.decisionErrorDefault"));
        } finally {
            decisionInFlightRef.current = false;
            setSubmitting(false);
        }
    };

    // "+ Сослаться на текст редакции" в "Ваша резолюция" - открывает просмотр проверяемой
    // редакции в режиме цитирования, а вставка выделенного текста в комментарий делегируется
    // самой панели резолюции через imperative handle (resolutionPanelRef объявлен выше, до
    // условных return - см. комментарий там).
    const handleCiteRequest = () => {
        if (!redaction) return;
        setModal({
            kind: "view",
            redaction,
            onInsertQuote: (selectedText, documentTarget) =>
                resolutionPanelRef.current?.insertQuote(selectedText, documentTarget),
        });
    };

    // "Показать в тексте" у уже вставленной (но ещё не отправленной) цитаты в "Ваша резолюция" -
    // открывает просмотр редакции сразу на нужной вкладке, с прокруткой к месту цитаты (через
    // обычный поиск по тексту - см. RedactionViewModal.initialSearchQuery).
    const handleJumpToQuote = (quote: ApprovalQuoteItem) => {
        if (!redaction) return;
        setModal({
            kind: "view",
            redaction,
            language: quote.documentTarget as RedactionViewTarget,
            initialSearchQuery: quote.text,
        });
    };

    // Кнопка-лупа "Показать в тексте" рядом с цитатой в уже ОТПРАВЛЕННОЙ резолюции любого
    // согласующего на маршруте (см. StageCardView/VndApprovalRouteView.onShowQuoteInText) - тот
    // же приём, что и handleJumpToQuote выше (там - для ещё не отправленной резолюции текущего
    // пользователя), просто с другим источником цитаты (quote: {documentTarget, text} вместо
    // ApprovalQuoteItem, форма та же).
    const handleShowQuoteInText = (quote: { documentTarget: string; text: string; revisionIndex?: number }) => {
        if (!redaction) return;
        setModal({
            kind: "view",
            redaction,
            language: quote.documentTarget as RedactionViewTarget,
            initialSearchQuery: quote.text,
            initialRevisionIndex: quote.revisionIndex,
        });
    };

    const handleCancel = async () => {
        setCancelling(true);
        try {
            await coordinationService.cancel(vnd.id);
            toast.success(t("openVndPage.coordinationTab.cancelledToastTitle"), t("openVndPage.coordinationTab.cancelledToastDescription"));
            setCancelModalOpen(false);
            onVndChanged?.();
        } catch (err) {
            toast.error(t("openVndPage.coordinationTab.cancelErrorTitle"), err instanceof Error ? err.message : undefined);
        } finally {
            setCancelling(false);
        }
    };

    // Действующие (не убранные) согласующие уже на маршруте - показываем недоступными в модалке
    // выбора нового согласующего (см. VndSelectApproverModal.excludedUserIds).
    const activeApproverUserIds = new Set(
        process.stages.filter((s) => !s.isRemovedByEditor).map((s) => s.approverUserId),
    );

    // Главный редактор добавляет согласующего в уже запущенный процесс согласования. Модалка
    // выбора (VndSelectApproverModal) закрывается сама сразу после выбора - не ждёт ответа
    // сервера, поэтому здесь нет отдельного состояния загрузки.
    const handleAddApprover = async (approver: ApproverOption) => {
        try {
            await coordinationService.addApprover(vnd.id, {approverUserId: approver.id});
            await reload();
            toast.success("Согласующий добавлен", `${approver.fullName} добавлен в маршрут согласования`);
        } catch (err) {
            toast.error("Не удалось добавить согласующего", err instanceof Error ? err.message : undefined);
        }
    };

    // Клик по кнопке "Убрать" на карточке этапа - открывает модалку подтверждения
    // (см. StageCardView.onRemoveApprover/VndApprovalRouteView.onRemoveApprover).
    const handleRequestRemoveApprover = (stageId: number) => {
        const stage = process.stages.find((s) => s.id === stageId);
        if (stage) setRemovingStage(stage);
    };

    // Главный редактор убирает согласующего из уже запущенного процесса согласования - этап
    // помечается недействующим, задача с него снимается (см. VndApprovalService.RemoveApproverAsync).
    const handleConfirmRemoveApprover = async () => {
        if (!removingStage) return;
        setRemovingApprover(true);
        try {
            await coordinationService.removeApprover(vnd.id, removingStage.id, {});
            await reload();
            toast.success("Согласующий убран", `${removingStage.approverName} убран из маршрута согласования`);
            setRemovingStage(null);
        } catch (err) {
            toast.error("Не удалось убрать согласующего", err instanceof Error ? err.message : undefined);
        } finally {
            setRemovingApprover(false);
        }
    };

    // Конфиг шапки над установленным маршрутом
    const routeHeaderConfig = isApproved
        ? {
            border: "border-[#bfe3cc]", bg: "bg-[#eef9f2]",
            icon: CheckCircle2, iconColor: "text-[#1f7a4c]",
            titleColor: "text-[#1c5e37]", textColor: "text-[#2f6b47]",
            title: t("openVndPage.coordinationTab.approvedTitle"),
            description: t("openVndPage.coordinationTab.approvedDescription"),
        }
        : isRejected
            ? {
                border: "border-[#f2c2c2]", bg: "bg-[#fdf1f1]",
                icon: XCircle, iconColor: "text-[#c0392b]",
                titleColor: "text-[#8f2a1f]", textColor: "text-[#a63a2c]",
                title: t("openVndPage.coordinationTab.rejectedTitle"),
                description: t("openVndPage.coordinationTab.rejectedDescription"),
            }
            : (isRevisionNeeded && !isInitiator)
                ? {
                    border: "border-[#f0dcae]", bg: "bg-[#fdf6e8]",
                    icon: Clock3, iconColor: "text-[#9a6408]",
                    titleColor: "text-[#7a5006]", textColor: "text-[#8a6a1f]",
                    title: t("openVndPage.coordinationTab.revisionInProgressTitle"),
                    description: t("openVndPage.coordinationTab.revisionInProgressDescription"),
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
                            {t("openVndPage.coordinationTab.noChangesApproverHint")}
                        </p>
                    </div>
                )}

                {/* Плашка для согласующего на этапе "Согласование после внесённых изменений" —
                    только для тех, чей этап участвует в повторном круге (participatesInRepeat,
                    т.е. кто оставлял замечания/не согласовал чисто на первичном этапе - см.
                    myStage выше), именно им нужно перепроверить обновлённые файлы. */}
                {isRepeatedPhase && (
                    <div
                        className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-[#bcd6f5] bg-[#eef5fd] px-3.5 py-3 max-w-full">
                        <Info size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#2f68c4]"/>
                        <p className="text-[12.5px] leading-[1.55] text-[#1c4a80]">
                            <span className="font-semibold">{t("openVndPage.coordinationTab.repeatedPhaseHintBold")}</span>
                            {" "}{t("openVndPage.coordinationTab.repeatedPhaseHintRest")}
                        </p>
                    </div>
                )}

                <VndApprovalSummary process={process}/>

                {redactionsError && (
                    <div>
                        <EmptyState
                            variant="error"
                            title={t("openVndPage.coordinationTab.redactionsLoadErrorTitle")}
                            description={redactionsError}
                        />
                    </div>
                )}

                <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[13.5px] font-bold text-[#1c2740]">
                        {isFirstRedaction
                            ? t("openVndPage.coordinationTab.firstRedactionLabel")
                            : t("openVndPage.coordinationTab.newRedactionLabel")}
                    </div>
                    {!isFirstRedaction && redaction && previousRedaction && (
                        <button
                            type="button"
                            onClick={() => setModal({kind: "compare"})}
                            className="cursor-pointer flex h-[35px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                        >
                            <Columns2 size={15} strokeWidth={2}/>
                            {t("openVndPage.coordinationTab.compareButton")}
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
                        redactions={redactions ?? []}
                        initialLeft={redaction}
                        initialRight={previousRedaction}
                        reviewedRedactionId={redaction.id}
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
                        initialSearchQuery={modal.initialSearchQuery}
                        initialRevisionIndex={modal.initialRevisionIndex}
                        downloadingId={download.activeId}
                        onDownload={handleDownload}
                        onClose={() => setModal(null)}
                        onInsertQuote={modal.onInsertQuote}
                        approvalProcess={process}
                        quoteMarksClickable={isProcessActive}
                    />
                )}

                <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.coordinationTab.establishedRouteLabel")}</div>
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
                                          frameless={!!routeHeaderConfig}
                                          onShowQuoteInText={handleShowQuoteInText}
                                          canEditRoute={canEditApprovalRoute}
                                          onAddApprover={() => setAddApproverModalOpen(true)}
                                          onRemoveApprover={handleRequestRemoveApprover}/>
                </div>

                {isPendingForMe && (
                    <div className="mt-6">
                        {isFinalHoldPhase && (
                            <div
                                className="mb-3 rounded-[10px] border border-[#e0e6ef] bg-[#f6f8fb] px-4 py-[10px] text-[12.5px] text-[#5c6779]">
                                {t("openVndPage.coordinationTab.finalHoldPendingHint")}
                            </div>
                        )}
                        <VndApproverResolutionPanel
                            ref={resolutionPanelRef}
                            onSubmit={handleResolutionSubmit}
                            submitting={submitting}
                            error={decisionError}
                            phase={isFinalHoldPhase ? "finalHold" : isRepeatedPhase ? "repeated" : "primary"}
                            onCiteRequest={redaction ? handleCiteRequest : undefined}
                            onJumpToQuote={redaction ? handleJumpToQuote : undefined}
                        />
                    </div>
                )}

                {/* Отзыв чужого согласования главным редактором — тот же блок "Опасная зона",
                    что и в виде инициатора ниже (см. isInitiator-ветку/CANCELLABLE_PHASE), но
                    здесь мы уже в ветке isApprover (isInitiator заведомо false), так что условие
                    упрощается до одной только проверки права CancelAnyVndApproval. Раньше в этой
                    ветке кнопки не было вовсе — главный редактор, будучи согласующим на маршруте,
                    не мог отозвать согласование, хотя право у него есть (бэкенд это уже
                    поддерживает — см. VndApprovalService.CancelAsync/CancelInternalAsync:
                    авторизация, уведомление инициатору и запись в историю там общие для обоих
                    случаев отзыва). */}
                {canCancelAnyApproval && CANCELLABLE_PHASE.includes(process.status) && (
                    <div className="mt-8 rounded-[14px] border border-[#f0dede] overflow-hidden">
                        <div className="bg-[#fdf6f5] px-4 py-2.5 border-b border-[#f0dede]">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-[#c0392b]">
                                {t("openVndPage.coordinationTab.dangerZoneLabel")}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white">
                            <div>
                                <div className="text-[13px] font-semibold text-[#1c2740]">
                                    {t("openVndPage.coordinationTab.cancelApprovalTitle")}
                                </div>
                                <span className="text-[12.5px] text-[#8b97ab]">
                                    {t("openVndPage.coordinationTab.cancelApprovalHint")}
                                </span>
                            </div>
                            <button
                                onClick={() => setCancelModalOpen(true)}
                                className="shrink-0 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] transition-colors"
                            >
                                {t("openVndPage.coordinationTab.cancelButton")}
                            </button>
                        </div>
                    </div>
                )}
                <ConfirmActionModal
                    open={cancelModalOpen}
                    onClose={() => setCancelModalOpen(false)}
                    onConfirm={handleCancel}
                    title={t("openVndPage.coordinationTab.cancelConfirmTitle")}
                    message={t("openVndPage.coordinationTab.cancelConfirmMessage")}
                    confirmLabel={t("openVndPage.coordinationTab.cancelButton")}
                    loadingLabel={t("openVndPage.coordinationTab.cancelLoadingLabel")}
                    loading={cancelling}
                    variant="danger"
                    icon={AlertTriangle}
                />

                {addApproverModalOpen && (
                    <VndSelectApproverModal
                        excludedUserIds={activeApproverUserIds}
                        onClose={() => setAddApproverModalOpen(false)}
                        onSelect={handleAddApprover}
                    />
                )}
                <ConfirmActionModal
                    open={!!removingStage}
                    onClose={() => setRemovingStage(null)}
                    onConfirm={handleConfirmRemoveApprover}
                    title="Убрать согласующего?"
                    message={removingStage ? `${removingStage.approverName} будет убран из маршрута согласования, его задача снимется. Действие необратимо.` : ""}
                    confirmLabel="Убрать"
                    loadingLabel="Убираем…"
                    loading={removingApprover}
                    variant="danger"
                    icon={AlertTriangle}
                />
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
                        {t("openVndPage.coordinationTab.noChangesInitiatorHint")}
                    </p>
                </div>
            )}

            {/* Плашка для инициатора: редакцию отправили на доработку, есть замечания.
                Только для него - согласующим адресована не эта плашка (у них другой статус
                этапа, и это сообщение адресовано именно тому, кто должен исправлять). */}
            {isRevisionNeeded && isInitiator && (
                <div
                    className="mx-auto mb-5 flex w-fit max-w-full items-start gap-2.5 rounded-[12px] border border-[#f0dcae] bg-[#fdf6e8] px-4 py-3">
                    <AlertTriangle size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#9a6408]"/>
                    <p className="text-[12.5px] leading-[1.55] text-[#7a5006]">
                        <span className="font-semibold">{t("openVndPage.coordinationTab.revisionNeededInitiatorBold")}</span>
                        {" "}{t("openVndPage.coordinationTab.revisionNeededInitiatorRest")}
                    </p>
                </div>
            )}

            {/* Информационный блок */}
            <VndApprovalSummary process={process}/>

            {redactionsError && (
                <div>
                    <EmptyState
                        variant="error"
                        title={t("openVndPage.coordinationTab.redactionsLoadErrorTitle")}
                        description={redactionsError}
                    />
                </div>
            )}

            {/* Блок ознакомления с редакцией ("Данная редакция:") (+ кнопка сравнения) */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[13.5px] font-bold text-[#1c2740]">
                    {isFirstRedaction
                        ? t("openVndPage.coordinationTab.firstRedactionLabel")
                        : t("openVndPage.coordinationTab.newRedactionLabel")}
                </div>
                {!isFirstRedaction && redaction && previousRedaction && (
                    <button
                        type="button"
                        onClick={() => setModal({kind: "compare"})}
                        className="cursor-pointer flex h-[35px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                    >
                        <Columns2 size={15} strokeWidth={2}/>
                        {t("openVndPage.coordinationTab.compareButton")}
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
                    redactions={redactions ?? []}
                    initialLeft={redaction}
                    initialRight={previousRedaction}
                    reviewedRedactionId={redaction.id}
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
                    initialSearchQuery={modal.initialSearchQuery}
                    initialRevisionIndex={modal.initialRevisionIndex}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setModal(null)}
                    approvalProcess={process}
                    quoteMarksClickable={isProcessActive}
                />
            )}

            {/* Установленный маршрут согласования — с цветной шапкой-статусом, если применимо */}
            <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.coordinationTab.establishedRouteLabel")}</div>
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
                <VndApprovalRouteView process={process} frameless={!!routeHeaderConfig}
                                      onShowQuoteInText={handleShowQuoteInText}
                                      canEditRoute={canEditApprovalRoute}
                                      onAddApprover={() => setAddApproverModalOpen(true)}
                                      onRemoveApprover={handleRequestRemoveApprover}/>
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
                    onResubmitted={handleResubmitted}
                    onShowQuoteInText={redaction ? handleShowQuoteInText : undefined}
                />
            )}

            {/* Отзыв редакции с согласования */}
            {(isInitiator || canCancelAnyApproval) && CANCELLABLE_PHASE.includes(process.status) && (
                <div className="mt-8 rounded-[14px] border border-[#f0dede] overflow-hidden">
                    <div className="bg-[#fdf6f5] px-4 py-2.5 border-b border-[#f0dede]">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#c0392b]">
                            {t("openVndPage.coordinationTab.dangerZoneLabel")}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white">
                        <div>
                            <div className="text-[13px] font-semibold text-[#1c2740]">
                                {t("openVndPage.coordinationTab.cancelApprovalTitle")}
                            </div>
                            <span className="text-[12.5px] text-[#8b97ab]">
                                {t("openVndPage.coordinationTab.cancelApprovalHint")}
                            </span>
                        </div>
                        <button
                            onClick={() => setCancelModalOpen(true)}
                            className="shrink-0 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] transition-colors"
                        >
                            {t("openVndPage.coordinationTab.cancelButton")}
                        </button>
                    </div>
                </div>
            )}
            <ConfirmActionModal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleCancel}
                title={t("openVndPage.coordinationTab.cancelConfirmTitle")}
                message={t("openVndPage.coordinationTab.cancelConfirmMessage")}
                confirmLabel={t("openVndPage.coordinationTab.cancelButton")}
                loadingLabel={t("openVndPage.coordinationTab.cancelLoadingLabel")}
                loading={cancelling}
                variant="danger"
                icon={AlertTriangle}
            />

            {addApproverModalOpen && (
                <VndSelectApproverModal
                    excludedUserIds={activeApproverUserIds}
                    onClose={() => setAddApproverModalOpen(false)}
                    onSelect={handleAddApprover}
                />
            )}
            <ConfirmActionModal
                open={!!removingStage}
                onClose={() => setRemovingStage(null)}
                onConfirm={handleConfirmRemoveApprover}
                title="Убрать согласующего?"
                message={removingStage ? `${removingStage.approverName} будет убран из маршрута согласования, его задача снимется. Действие необратимо.` : ""}
                confirmLabel="Убрать"
                loadingLabel="Убираем…"
                loading={removingApprover}
                variant="danger"
                icon={AlertTriangle}
            />
        </div>
    );
}