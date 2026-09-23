// Таб "Ход согласования"
import {useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import type {ApprovalQuoteItem} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useApprovalProcess} from "@/hooks/coordinationHooks/useApprovalProcess.ts";
import {useCancelApproval} from "@/hooks/coordinationHooks/useCancelApproval.ts";
import {useApprovalRouteEditing} from "@/hooks/coordinationHooks/useApprovalRouteEditing.ts";
import {useResolutionDecision} from "@/hooks/coordinationHooks/useResolutionDecision.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import type {
    FormattedCommentQuoteRef
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";

///
import {
    VndApprovalSummary
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalSummary.tsx";
import {
    VndStartApprovalModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndStartApprovalModal.tsx";
import {
    VndApproverResolutionPanel,
    type DraftTextRemark,
    type ResolutionChoice,
    type VndApproverResolutionPanelHandle,
} from "./componentsCoordinationTab/VndApproverResolutionPanel.tsx";
import type {QuoteMarkInfo} from "@/utils/vndProcess/redactionQuoteMarks.ts";
import {getLiveRevisionIndex} from "@/utils/vndProcess/redactionRevisions.ts";
import {VndRevisionNeededPanel} from "./componentsCoordinationTab/VndRevisionNeededPanel.tsx";
import {VndNoChangesHintBanner} from "./componentsCoordinationTab/VndNoChangesHintBanner.tsx";
import {getRedactionApprovalSheets} from "@/utils/vndProcess/approvalSheets.ts";
import {VndCurrentRedactionSection} from "./componentsCoordinationTab/VndCurrentRedactionSection.tsx";
import {VndRedactionModals} from "./componentsCoordinationTab/VndRedactionModals.tsx";
import {VndCoordinationRouteSection} from "./componentsCoordinationTab/VndCoordinationRouteSection.tsx";
import {VndCoordinationDangerZone} from "./componentsCoordinationTab/VndCoordinationDangerZone.tsx";
import {VndCoordinationSharedModals} from "./componentsCoordinationTab/VndCoordinationSharedModals.tsx";
import {getCoordinationRoleState, getRouteHeaderConfig} from "./componentsCoordinationTab/coordinationRoleState.ts";
import type {CoordinationModal} from "./componentsCoordinationTab/coordinationModalTypes.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {AlertTriangle, Clock3, Info} from "lucide-react";
///

interface VndCoordinationTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void; // Для перезагрузки
}

// Этапы, из которых инициатор ещё может отозвать согласование
// Первичное согласование, Согласование после внесённых изменений, Согласование после внесённых изменений, Доработка документа после правок
// * approved - согласовано, rejected - отклонено;
const CANCELLABLE_PHASE = ["primary", "repeated", "final_hold", "revision_needed"];

export function VndCoordinationTab({vnd, onVndChanged}: VndCoordinationTabProps) {
    const {t} = useTranslation();
    const {user, hasPermission} = useAuth();
    const currentUserId = user?.id;

    const {process, loading, error, reload} = useApprovalProcess(vnd.id); // Сами данные о согласовании

    const [modal, setModal] = useState<CoordinationModal | null>(null);
    const openView = (redaction: VndRedactionResponse, language: RedactionViewTarget) =>
        setModal({kind: "view", redaction, language});

    // Набор прав на создание/актуализацию ВНД без запроса права.
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);
    // Системная роль "Администратор" (id === 1) - вместе с главным редактором может менять поле
    // "Разработчик" сформированного ТИД (см. VndEditionsTab.canChangeTidDeveloper).
    const isAdmin = user?.roles.some((role) => role.id === 1) ?? false;
    // Право на отзыв чужого согласования (роль главного редактора).
    const canCancelAnyApproval = hasPermission(PermissionCode.CancelAnyVndApproval);
    // Право редактировать маршрут уже запущенного согласования - добавлять/убирать
    // согласующих (роль главного редактора)
    const canEditApprovalRoute = hasPermission(PermissionCode.EditAnyVndApprovalRoute);

    // "+ Сослаться на текст редакции" в "Ваша резолюция"
    const resolutionPanelRef = useRef<VndApproverResolutionPanelHandle>(null);
    // Черновые (ещё не отправленные) замечания к тексту из "Ваша резолюция" - см.
    // VndApproverResolutionPanel.onDraftRemarksChange; подсвечиваются в окне просмотра редакции.
    const [draftRemarks, setDraftRemarks] = useState<DraftTextRemark[]>([]);

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

    // Отзыв согласования, добавление/убор согласующего и отправка резолюции - вынесены в
    // отдельные хуки (см. hooks/coordinationHooks), но вызываются здесь безусловно, ДО ранних
    // return'ов ниже (loading/error/!process) - иначе нарушили бы Rules of Hooks условным
    // вызовом хука. То, что этим хукам нужно от process (myStage/stages), они принимают уже
    // готовым аргументом прямо в момент вызова конкретного обработчика - см. комментарии внутри
    // самих хуков.
    const cancelApproval = useCancelApproval(vnd.id, onVndChanged);
    const routeEditing = useApprovalRouteEditing(vnd.id, reload);
    const resolutionDecision = useResolutionDecision(vnd.id, reload);

    // Черновые замечания в виде маркеров для окна просмотра редакции (RedactionViewModal.draftQuotes).
    // Хук - до ранних return'ов ниже (Rules of Hooks), поэтому данные о "моём" этапе берём
    // напрямую из process, а не из getCoordinationRoleState.
    const draftQuoteMarks = useMemo<QuoteMarkInfo[]>(() => {
        if (!process || draftRemarks.length === 0) return [];
        const stage = process.stages.find((s) => s.approverUserId === currentUserId && !s.isRemovedByEditor);
        return draftRemarks.map((r) => ({
            id: r.id,
            documentTarget: r.documentTarget,
            text: r.text,
            prefix: r.prefix,
            suffix: r.suffix,
            occurrence: r.occurrence,
            note: r.note.trim() || null,
            isDraft: true,
            stageId: stage?.id ?? 0,
            approverName: stage?.approverName ?? "",
            approverUserId: currentUserId ?? 0,
            phaseLabel: "Ваше замечание",
            decision: "pending",
            decidedAt: null,
            comment: "",
            attachments: [],
            allQuotes: [],
            revisionIndex: getLiveRevisionIndex(process),
        }));
    }, [process, draftRemarks, currentUserId]);

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
                        title={t("openVndPage.coordinationTab.notStartedTitle")} /* Согласование ещё не запущено! */
                        description={t("openVndPage.coordinationTab.notStartedDescription")}
                    />
                </div>
                {canStartNoChangesReview && (
                    <div className="mt-4 flex flex-col items-start gap-2">
                        <p className="text-[12.5px] leading-[1.6] text-[#55617a]">
                            {t("openVndPage.coordinationTab.noChangesReviewHint")} {/* Заявлена актуализация без изменений — можно отправить существующую действующую редакцию на согласование как есть, без загрузки нового файла. */}
                        </p>
                        <button
                            type="button"
                            onClick={() => setModal({kind: "startApproval"})}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                        >
                            {t("openVndPage.coordinationTab.startNoChangesButton")} {/* Начать согласование (без изменений) */}
                        </button>
                    </div>
                )}

                {/* Модалка запуска согласования */}
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

    // С этой строки process точно не null - можно безопасно доставать из него производные
    // роль/фазу (см. getCoordinationRoleState) и текущую редакцию.
    const {
        isFinalHoldPhase, isRepeatedPhase, isRevisionNeeded, isProcessActive,
        myStage, isInitiator, isApprover, isPendingForMe,
    } = getCoordinationRoleState(process, currentUserId);

    const redaction = redactions?.find((r) => r.id === process.redactionId);

    // Актуализация без изменений: флаг на ВНД (actualizationPlannedNoChanges) сбрасывается после
    // публикации, а признак самого процесса (isNoChangesActualization) остаётся навсегда - по
    // нему плашка видна и после того, как согласование завершилось. Прежние листы согласования
    // этой редакции (кроме листа текущего процесса) показываем там же - видно, когда редакция
    // уже согласовывалась раньше.
    const isNoChangesRound = vnd.actualizationPlannedNoChanges || !!process.isNoChangesActualization;
    const previousApprovalSheets = redaction
        ? getRedactionApprovalSheets(redaction).filter((s) => s.approvalProcessId !== process.id).reverse()
        : [];

    // Если у редакции, вынесенной на согласование, номер 1 — это первая редакция ВНД,
    // предыдущей ещё не существует. Иначе ВНД актуализируется, и есть предыдущая
    // (действовавшая до старта этой актуализации) редакция — её тоже показываем рядом.
    const isFirstRedaction = redaction?.number === 1;
    const previousRedaction = redaction
        ? redactions?.find((r) => r.number === redaction.number - 1)
        : undefined;
    // База для автосравнения в окне формирования ТИД на доработке - действующая (актуальная)
    // редакция ВНД; если её почему-то нет в списке - предыдущая по номеру.
    // Были ли у согласуемой редакции промежуточные версии ("Р2.1"...) - тогда их можно сравнить.
    const hasRevisions = !!redaction && process.redactionSnapshots.length > 0;
    const tidBaseRedaction =
        redactions?.find((r) => r.isCurrent && r.id !== redaction?.id) ?? previousRedaction;

    // "+ Сослаться на текст редакции" в "Ваша резолюция" - открывает просмотр проверяемой
    // редакции в режиме цитирования, а вставка выделенного текста в комментарий делегируется
    // самой панели резолюции через imperative handle (resolutionPanelRef объявлен выше, до
    // условных return - см. комментарий там).
    const handleCiteRequest = () => {
        if (!redaction) return;
        setModal({
            kind: "view",
            redaction,
            onInsertQuote: (selectedText, documentTarget, anchor) =>
                resolutionPanelRef.current?.insertQuote(selectedText, documentTarget, anchor),
        });
    };

    // "Показать в тексте" у уже вставленной (но ещё не отправленной) цитаты в "Ваша резолюция" -
    // открывает просмотр редакции сразу на нужной вкладке, с прокруткой к месту цитаты (через
    // обычный поиск по тексту - см. RedactionViewModal.initialSearchQuery).
    //
    // Переход - по id черновика (фокус на его маркере, который стоит ровно на выделенном месте -
    // см. quoteAnchor.ts), а не поиском текста: поиск всегда находил ПЕРВОЕ вхождение фразы.
    const handleJumpToQuote = (remark: DraftTextRemark) => {
        if (!redaction) return;
        setModal({
            kind: "view",
            redaction,
            language: remark.documentTarget,
            initialFocusQuoteId: remark.id,
        });
    };

    // Кнопка-лупа "Показать в тексте" рядом с цитатой в уже ОТПРАВЛЕННОЙ резолюции любого
    // согласующего на маршруте (см. StageCardView/VndApprovalRouteView.onShowQuoteInText) - тот
    // же приём, что и handleJumpToQuote выше (там - для ещё не отправленной резолюции текущего
    // пользователя), просто с другим источником цитаты (тот же по форме FormattedCommentQuoteRef).
    const handleShowQuoteInText = (quote: FormattedCommentQuoteRef) => {
        if (!redaction) return;
        setModal({
            kind: "view",
            redaction,
            language: quote.documentTarget as RedactionViewTarget,
            // С id - точный переход к маркеру цитаты; без id (не должно случаться, но на всякий
            // случай) - как раньше, поиском по тексту.
            ...(quote.id !== undefined
                ? {initialFocusQuoteId: quote.id}
                : {initialSearchQuery: quote.text}),
            initialRevisionIndex: quote.revisionIndex,
        });
    };

    // Действующие (не убранные) согласующие уже на маршруте - показываем недоступными в модалке
    // выбора нового согласующего
    const activeApproverUserIds = new Set(
        process.stages.filter((s) => !s.isRemovedByEditor).map((s) => s.approverUserId),
    );

    const handleRequestRemoveApprover = (stageId: number) =>
        routeEditing.handleRequestRemoveApprover(stageId, process.stages);
    const handleRequestReplaceApprover = (stageId: number) =>
        routeEditing.handleRequestReplaceApprover(stageId, process.stages);

    const handleResolutionSubmit = (
        choice: ResolutionChoice, comment: string, files: File[], quotes: ApprovalQuoteItem[],
    ) => resolutionDecision.submit(myStage, choice, comment, files, quotes);

    // Конфиг шапки над установленным маршрутом
    const routeHeaderConfig = getRouteHeaderConfig(process.status, isInitiator, t);

    // Три модалки, общие для обоих видов ниже (см. комментарий в самом компоненте).
    const sharedModals = (
        <VndCoordinationSharedModals
            cancelModalOpen={cancelApproval.cancelModalOpen}
            onCancelModalClose={cancelApproval.closeCancelModal}
            onConfirmCancel={cancelApproval.handleCancel}
            cancelling={cancelApproval.cancelling}
            addApproverModalOpen={routeEditing.addApproverModalOpen}
            activeApproverUserIds={activeApproverUserIds}
            onAddApproverModalClose={routeEditing.closeAddApproverModal}
            onSelectApprover={routeEditing.handleAddApprover}
            removingStage={routeEditing.removingStage}
            onRemovingStageClose={routeEditing.closeRemoveApproverModal}
            onConfirmRemoveApprover={routeEditing.handleConfirmRemoveApprover}
            removingApprover={routeEditing.removingApprover}
            replacingStage={routeEditing.replacingStage}
            onReplacingStageClose={routeEditing.closeReplaceApproverModal}
            onSelectReplaceApprover={routeEditing.handleReplaceApprover}
        />
    );

    // --- Вид для согласующего ---
    if (isApprover) {
        return (
            <div className="py-4 px-4 sm:px-6">
                {isNoChangesRound && (
                    <VndNoChangesHintBanner
                        message={t("openVndPage.coordinationTab.noChangesApproverHint")}
                        previousSheets={previousApprovalSheets}
                        redactionCode={redaction?.code}
                        onDownloadSheet={handleDownload}
                    />
                )}

                {/* Плашка для согласующего на этапе "Согласование после внесённых изменений" —
                    только для тех, чей этап участвует в повторном круге (participatesInRepeat,
                    т.е. кто оставлял замечания/не согласовал чисто на первичном этапе - см.
                    myStage в getCoordinationRoleState), именно им нужно перепроверить обновлённые файлы. */}
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
                    <EmptyState
                        variant="error"
                        title={t("openVndPage.coordinationTab.redactionsLoadErrorTitle")}
                        description={redactionsError}
                    />
                )}

                <VndCurrentRedactionSection
                    vnd={vnd}
                    isFirstRedaction={!!isFirstRedaction}
                    redaction={redaction}
                    previousRedaction={previousRedaction}
                    downloadingId={download.activeId}
                    downloadError={download.error}
                    onDownload={handleDownload}
                    onView={openView}
                    onCompareClick={() => setModal({kind: "compare"})}
                    hasRevisions={hasRevisions}
                    headerClassName="mb-2"
                />

                <VndRedactionModals
                    vnd={vnd}
                    redactions={redactions}
                    redaction={redaction}
                    previousRedaction={previousRedaction}
                    modal={modal}
                    onClose={() => setModal(null)}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    process={process}
                    isProcessActive={isProcessActive}
                    draftQuotes={draftQuoteMarks}
                />

                <VndCoordinationRouteSection
                    process={process}
                    routeHeaderConfig={routeHeaderConfig}
                    highlightStageId={myStage?.id}
                    onShowQuoteInText={handleShowQuoteInText}
                    canEditRoute={canEditApprovalRoute}
                    onAddApprover={routeEditing.openAddApproverModal}
                    onRemoveApprover={handleRequestRemoveApprover}
                    onReplaceApprover={handleRequestReplaceApprover}
                />

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
                            submitting={resolutionDecision.submitting}
                            error={resolutionDecision.decisionError}
                            phase={isFinalHoldPhase ? "finalHold" : isRepeatedPhase ? "repeated" : "primary"}
                            onCiteRequest={redaction ? handleCiteRequest : undefined}
                            onJumpToQuote={redaction ? handleJumpToQuote : undefined}
                            onDraftRemarksChange={setDraftRemarks}
                            // Черновик резолюции в браузере - свой для процесса, этапа, фазы и версии
                            // документа: после повторной отправки (новая версия) старый черновик
                            // к новой версии не "приклеится".
                            draftStorageKey={myStage
                                ? `vnd-resolution-draft:v1:${process.id}:${myStage.id}:${process.status}:${getLiveRevisionIndex(process)}`
                                : undefined}
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
                    <VndCoordinationDangerZone onCancelClick={cancelApproval.openCancelModal}/>
                )}

                {sharedModals}
            </div>
        );
    }

    // --- Вид для инициатора согласования ---
    return (
        <div className="py-4 px-6">
            {/* Если актуализация без изменений */}
            {isNoChangesRound && (
                <VndNoChangesHintBanner
                    message={isInitiator
                        ? t("openVndPage.coordinationTab.noChangesInitiatorHint")
                        : t("openVndPage.coordinationTab.noChangesApproverHint")}
                    previousSheets={previousApprovalSheets}
                    redactionCode={redaction?.code}
                    onDownloadSheet={handleDownload}
                />
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
                <EmptyState
                    variant="error"
                    title={t("openVndPage.coordinationTab.redactionsLoadErrorTitle")}
                    description={redactionsError}
                />
            )}

            {/* Блок ознакомления с редакцией ("Данная редакция:") (+ кнопка сравнения) */}
            <VndCurrentRedactionSection
                vnd={vnd}
                isFirstRedaction={!!isFirstRedaction}
                redaction={redaction}
                previousRedaction={previousRedaction}
                downloadingId={download.activeId}
                downloadError={download.error}
                onDownload={handleDownload}
                onView={openView}
                onCompareClick={() => setModal({kind: "compare"})}
                hasRevisions={hasRevisions}
                headerClassName="mb-4"
            />

            <VndRedactionModals
                vnd={vnd}
                redactions={redactions}
                redaction={redaction}
                previousRedaction={previousRedaction}
                modal={modal}
                onClose={() => setModal(null)}
                downloadingId={download.activeId}
                onDownload={handleDownload}
                process={process}
                isProcessActive={isProcessActive}
            />

            {/* Установленный маршрут согласования — с цветной шапкой-статусом, если применимо */}
            <VndCoordinationRouteSection
                process={process}
                routeHeaderConfig={routeHeaderConfig}
                onShowQuoteInText={handleShowQuoteInText}
                canEditRoute={canEditApprovalRoute}
                onAddApprover={routeEditing.openAddApproverModal}
                onRemoveApprover={handleRequestRemoveApprover}
                onReplaceApprover={handleRequestReplaceApprover}
            />

            {/* Панель с замечаниями (если они есть) на этапе исправления замечаний для инициатора */}
            {isRevisionNeeded && isInitiator && (
                <VndRevisionNeededPanel
                    vndId={vnd.id}
                    vnd={vnd}
                    process={process}
                    redaction={redaction}
                    requiresTid={!!redaction && redaction.number > 1}
                    tidPreviousFileId={tidBaseRedaction?.docFileRuId ?? null}
                    tidDefaultResponsibleUserId={user?.id ?? vnd.actualizationResponsibleUserId}
                    tidDefaultResponsibleUserName={user?.fullName ?? vnd.actualizationResponsibleUserName}
                    tidCanSelectResponsible={isChiefEditor || isAdmin}
                    onChanged={reload}
                    onResubmitted={handleResubmitted}
                    onShowQuoteInText={redaction ? handleShowQuoteInText : undefined}
                />
            )}

            {/* Отзыв редакции с согласования */}
            {(isInitiator || canCancelAnyApproval) && CANCELLABLE_PHASE.includes(process.status) && (
                <VndCoordinationDangerZone onCancelClick={cancelApproval.openCancelModal}/>
            )}

            {sharedModals}
        </div>
    );
}
