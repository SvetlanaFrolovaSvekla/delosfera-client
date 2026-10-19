// Таб "Редакции" открытой страницы ВНД
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";

import {isVndPendingEffective} from "@/constants/vndStatus.ts";

import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useAvailableHeight} from "@/hooks/vndHooks/useAvailableHeight.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";
import {useEditionsPermissions} from "@/hooks/vndHooks/useEditionsPermissions.ts";
import {useVndApprovalData} from "@/hooks/vndHooks/useVndApprovalData.ts";
import {useEditionsRedactions} from "@/hooks/vndHooks/useEditionsRedactions.ts";
import {useEditionsActualization} from "@/hooks/vndHooks/useEditionsActualization.ts";
import {usePublishWithoutApproval} from "@/hooks/vndHooks/usePublishWithoutApproval.ts";
import {useRedactionLinkFocus} from "@/hooks/vndHooks/useRedactionLinkFocus.ts";
import {useRedactionDocumentModals} from "@/hooks/vndHooks/useRedactionDocumentModals.ts";

import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {getRedactionDisplayStatus} from "@/utils/vndProcess/redactionStatus.ts";
import {buildRedactionFileName} from "@/utils/downloadFiles/fileNaming.ts";
import {
    getAvailableLanguages,
    getRedactionFileId,
    type RedactionLanguage
} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {resolveEditionsPrimaryAction} from "@/utils/vndProcess/editionsPrimaryAction.ts";
import type {VndLinkFocusRequest} from "@/utils/vndProcess/vndLinkNavigation.ts";

import {
    VndUploadRedactionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/uploadRedactionModal/VndUploadRedactionModal.tsx";
import {
    VndUploadTidModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/uploadTidModal/VndUploadTidModal.tsx";
import {
    RedactionsSidebar
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionsSidebar.tsx";
import {
    RedactionLanguageTabsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionLanguageTabsPanel.tsx";
import {
    RedactionStatusBanner
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionStatusBanner.tsx";
import {
    RedactionTextView, type RedactionTextViewHandle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {
    VndEditLastRevisionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/editLastRevisionModal/EditLastRevisionModal.tsx";
import {
    RedactionContentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionContentsPanel.tsx";
import {
    RejectedApprovalDetailsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/rejectedApprovalDetailsModal/RejectedApprovalDetailsModal.tsx";
import {
    EditionsActualizationModals
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/editionsActualizationModals/EditionsActualizationModals.tsx";
import {
    PublishWithoutApprovalModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/publishWithoutApprovalModal/PublishWithoutApprovalModal.tsx";
import {
    RedactionDocumentModals
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/redactionDocumentModals/RedactionDocumentModals.tsx";
import {ErrorStrip} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/ErrorStrip.tsx";

import {
    RedactionCompareModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionCompareModal.tsx";
import {
    VndStartApprovalModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndStartApprovalModal.tsx";

import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Upload} from "lucide-react";

interface VndEditionsTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void;
    /** Переключить страницу ВНД на таб «Ход согласования» — вызывается сразу после
     * успешного запуска согласования, чтобы пользователь увидел маршрут, а не
     * остался на «Редакциях», где дальше делать нечего. */
    onGoToApproval?: () => void;
    /** "Лупа" со вкладки "Связанные документы" (или переход по адресу ?link=...&side=...):
     * выбрать нужную редакцию/язык и прокрутить к месту ссылки в тексте. */
    linkFocus?: VndLinkFocusRequest | null;
}

export function VndEditionsTab({vnd, onVndChanged, onGoToApproval, linkFocus}: VndEditionsTabProps) {
    const {t} = useTranslation();
    const {data: redactions, loading, error, refetch} = useVndRedactions(vnd.id);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [contentsOpen, setContentsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeLanguage, setActiveLanguage] = useState<RedactionLanguage>("ru");
    const textViewRef = useRef<RedactionTextViewHandle>(null);

    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    // Модалка "Подробнее" по ссылке из подсказки об отклонённой редакции (см. RedactionsSidebar)
    const [rejectedDetailsOpen, setRejectedDetailsOpen] = useState(false);
    // "Сформировать или загрузить ТИД" - кнопка в RedactionStatusBanner, когда у
    // актуализационной редакции (Number > 1) ещё нет файла ТИД (см. selectedTidMissing ниже).
    const [uploadTidOpen, setUploadTidOpen] = useState(false);

    const isVndEditor = useIsVndEditor();
    const perms = useEditionsPermissions();
    const {user} = perms;
    const {approvalProcess, approvalHistory, canGoToApproval, rejectedRedactionId} =
        useVndApprovalData(vnd, user?.id, isVndEditor, redactions?.length ?? 0);
    const {
        lastByNumber, current, uploadBlocked, rawSelected, selected, visibleRedactions,
        compareRedactions, compareLeft, compareRight,
    } = useEditionsRedactions(vnd, redactions, selectedId, isVndEditor, approvalHistory);

    const actualization = useEditionsActualization(vnd, lastByNumber, refetch, onVndChanged);
    const publish = usePublishWithoutApproval(vnd.id, () => {
        refetch();
        onVndChanged?.();
    });
    const docs = useRedactionDocumentModals();
    const download = useAsyncAction<number>();
    const submit = useAsyncAction<number>();

    const hasStatusBannerAbove =
        vnd.status === "draft" || vnd.status === "consol" || isVndPendingEffective(vnd.status, vnd.effectiveDate);

    const {ref: containerRef, height: rawAvailableHeight} = useAvailableHeight();
    const availableHeight =
        rawAvailableHeight !== undefined && hasStatusBannerAbove
            ? rawAvailableHeight - 30
            : rawAvailableHeight;

    // При смене редакции: язык, которого у неё нет, меняем на первый доступный; поиск сбрасываем
    useEffect(() => {
        if (!selected) return;
        const available = getAvailableLanguages(selected);
        if (!available.includes(activeLanguage)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveLanguage(available[0] ?? "ru");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchQuery("");
    }, [selected?.id]);

    const {linkMarks, textLinkFocus, handleLinkFocusResult} = useRedactionLinkFocus({
        vndId: vnd.id, linkFocus, redactions, visibleRedactions, selected, activeLanguage,
        onShowRedaction: (redactionId, language) => {
            setSelectedId(redactionId);
            if (language) setActiveLanguage(language);
            setSearchQuery("");
        },
    });

    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), t("openVndPage.editionsTab.downloadError"));

    const selectedFileId = selected ? getRedactionFileId(selected, activeLanguage) : null;
    const handleDownloadSelected = () => {
        if (!selected || selectedFileId === null) return;
        void handleDownload(selectedFileId, buildRedactionFileName(selected.code, vnd.name, activeLanguage));
    };

    // После любого изменения редакций - перечитать список и саму ВНД
    const reloadAll = () => {
        refetch();
        onVndChanged?.();
    };

    const handleRedactionUploaded = (redaction: VndRedactionResponse) => {
        setUploadOpen(false);
        reloadAll();
        if (redaction.isCurrent) {
            toast.success(
                t("openVndPage.editionsTab.redactionBecameCurrentTitle"),
                t("openVndPage.editionsTab.redactionBecameCurrentDescription", {code: redaction.code})
            );
        } else {
            toast.info(
                t("openVndPage.editionsTab.redactionAddedToDraftTitle"),
                t("openVndPage.editionsTab.redactionAddedToDraftDescription", {
                    vndCode: vnd.code,
                    redactionCode: redaction.code
                })
            );
        }
    };

    const handleTidUploaded = (redaction: VndRedactionResponse) => {
        setUploadTidOpen(false);
        reloadAll();
        toast.success(
            t("openVndPage.editionsTab.tidUploadedTitle"),
            t("openVndPage.editionsTab.tidUploadedDescription", {code: redaction.code})
        );
    };

    const handleEditRedaction = (redactionId: number) => {
        setSelectedId(redactionId);
        setEditOpen(true);
    };

    if (loading) {
        return <Loader label={t("openVndPage.editionsTab.loadingRedactions")} fullHeight={false}/>
    }

    if (error) {
        return (
            <EmptyState
                variant="error"
                title={t("openVndPage.editionsTab.loadErrorTitle")}
                description={error}
                actionLabel={t("openVndPage.editionsTab.retry")}
                onAction={refetch}
            />
        );
    }

    /* Ни одной редакции у документа ещё нет вовсе */
    if (!rawSelected) {
        return (
            <div className="mx-auto mt-30 max-w-[420px]">
                <EmptyState
                    icon={Upload}
                    title={t("openVndPage.editionsTab.emptyTitle")}
                    description={t("openVndPage.editionsTab.emptyDescription")}
                    actionLabel={t("openVndPage.editionsTab.uploadFirstAction")}
                    actionIcon={Upload}
                    actionVariant="primary"
                    onAction={() => setUploadOpen(true)}
                />
                {uploadOpen && (
                    <VndUploadRedactionModal
                        vndId={vnd.id}
                        onClose={() => setUploadOpen(false)}
                        onUploaded={handleRedactionUploaded}
                    />
                )}
            </div>
        );
    }

    /* Редакции у документа есть, но все они пока черновик/на согласовании/на консолидации -
       рядовому пользователю (не редактору ВНД) их показывать нельзя, а действующей или ранее
       официально принятой редакции у документа ещё не было (см. isRedactionVisibleToRegularUser) */
    if (!selected) {
        return (
            <div className="mx-auto mt-30 max-w-[420px]">
                <EmptyState
                    title={t("openVndPage.editionsTab.redactionNotAvailableTitle")}
                    description={t("openVndPage.editionsTab.redactionNotAvailableDescription")}
                />
            </div>
        );
    }

    const selectedStatus = getRedactionDisplayStatus(
        selected, vnd.status, lastByNumber?.id === selected.id, vnd.effectiveDate
    );

    // Актуализационная редакция (Number > 1) без файла ТИД - нельзя отправить на согласование
    // или опубликовать без согласования (см. VndApprovalService.StartAsync и
    // VndService.PublishRedactionWithoutApprovalAsync на бэке), поэтому в статус-баннере вместо
    // этих кнопок показывается "Сформировать или загрузить ТИД".
    const selectedTidMissing = selected.number > 1 && selected.tidFileId === null;

    const {flow} = actualization;
    const primary = resolveEditionsPrimaryAction({
        vnd, t,
        hasCurrentRedaction: !!current,
        uploadBlocked,
        lastNumber: lastByNumber?.number,
        canEditActualizationSettings: vnd.actualizationResponsibleUserId === user?.id || perms.isChiefEditor,
        confirmingNoChanges: actualization.confirmingNoChanges,
        needsPerform: flow.needsPerform,
        needsConfirmStartAfterRequest: flow.needsConfirmStartAfterRequest,
        accessPending: flow.myAccessState.kind === "pending",
        canDirectly: flow.canDirectly,
        canByRequest: flow.canByRequest,
        openUpload: () => setUploadOpen(true),
        openStartApproval: () => setApprovalModalOpen(true),
        openActualizationSettings: () => actualization.setSettingsOpen(true),
        confirmNoChanges: () => void actualization.confirmNoChanges(),
        openPerform: () => flow.setPerformOpen(true),
        openStartActualization: () => flow.setStartOpen(true),
        openRequestActualization: () => flow.setRequestOpen(true),
    });

    // Редакция, к которой относится отклонённый процесс - её открывает "Показать в тексте"
    // внутри RejectedApprovalDetailsModal.
    const rejectedRedaction = approvalProcess
        ? redactions?.find((r) => r.id === approvalProcess.redactionId)
        : undefined;

    return (
        <div
            ref={containerRef}
            style={{height: availableHeight}}
            className={`px-2 grid items-start gap-[15px] overflow-hidden ${
                contentsOpen ? "grid-cols-[260px_1fr_260px]" : "grid-cols-[260px_1fr]"
            } ${hasStatusBannerAbove ? "mb-[20px]" : ""}`}
        >

            {/* Левая панель */}
            <div
                style={{height: availableHeight}}
                className="flex min-h-0 flex-col gap-[10px]"
            >
                <SearchBar
                    variant="white"
                    placeholder={t("openVndPage.editionsTab.searchPlaceholder")}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSubmit={() => textViewRef.current?.goNext()}
                />

                {/* Редакции документа */}
                <RedactionsSidebar
                    redactions={visibleRedactions}
                    lastRedactionId={lastByNumber?.id}
                    selectedId={selected.id}
                    vndStatus={vnd.status}
                    effectiveDate={vnd.effectiveDate}
                    rejectedRedactionId={rejectedRedactionId}
                    onShowRejectedDetails={
                        rejectedRedactionId !== undefined && approvalProcess
                            ? () => setRejectedDetailsOpen(true)
                            : undefined
                    }
                    onSelect={setSelectedId}
                    primaryActionHidden={primary.hidden}
                    primaryActionVariant={primary.variant}
                    primaryActionDisabled={primary.disabled}
                    primaryActionHint={primary.hint}
                    primaryActionHintTooltip={primary.hintTooltip}
                    onPrimaryAction={primary.action}
                    secondaryActionLabel={primary.secondaryLabel}
                    onSecondaryAction={primary.secondaryAction}
                    secondaryActionTooltip={primary.secondaryTooltip}
                    compareMode={compareMode}
                    compareAvailable={compareRedactions.length >= 2}
                    onToggleCompare={() => {
                        // Модалка сравнения требует обе стороны - если у выбранной редакции нет
                        // ни соседней редакции, ни промежуточных версий, сравнивать не с чем.
                        if (compareRight) setCompareMode(true);
                    }}
                    contentsOpen={contentsOpen}
                    onToggleContents={() => setContentsOpen((v) => !v)}
                    canEditLastRevision={perms.canEditLastRevision}
                    onEditRedaction={handleEditRedaction}
                    onOpenAttachments={docs.setAttachments}
                    onOpenTid={docs.setTid}
                    onDownloadSelected={handleDownloadSelected}
                    downloadDisabled={selectedFileId === null}
                    downloading={download.activeId === selectedFileId}
                />
                {/* Языки редакции */}
                <RedactionLanguageTabsPanel
                    selected={selected}
                    activeLanguage={activeLanguage}
                    onChange={setActiveLanguage}
                />
            </div>

            {/* Центральная панель: закреплённый статус-баннер сверху + прокручиваемое содержимое ниже */}
            <div
                style={{height: availableHeight}}
                className="flex min-h-0 max-h-[750px] flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            >
                <RedactionStatusBanner
                    status={selectedStatus}
                    currentNumber={current?.number}
                    effectiveDate={vnd.effectiveDate}
                    isSubmitting={false}
                    onSubmit={vnd.status === "arch" ? undefined : () => setApprovalModalOpen(true)}
                    onGoToApproval={canGoToApproval ? onGoToApproval : undefined}
                    onPublishWithoutApproval={
                        vnd.status !== "arch" && perms.canPublishWithoutApproval ? publish.openModal : undefined
                    }
                    isPublishingWithoutApproval={publish.busy}
                    tidMissing={selectedTidMissing}
                    onUploadTid={() => setUploadTidOpen(true)}
                />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <ErrorStrip message={submit.error}/>
                    <ErrorStrip message={download.error}/>

                    <RedactionTextView
                        ref={textViewRef}
                        vnd={vnd}
                        selected={selected}
                        activeLanguage={activeLanguage}
                        downloadingId={download.activeId}
                        onDownload={handleDownload}
                        searchQuery={searchQuery}
                        onClearSearch={() => setSearchQuery("")}
                        linkMarks={linkMarks}
                        linkFocus={textLinkFocus}
                        onLinkFocusResult={handleLinkFocusResult}
                    />
                </div>
            </div>

            {/* Правая панель - содержание */}
            {contentsOpen && (
                <div style={{height: availableHeight}} className="min-h-0">
                    <RedactionContentsPanel
                        fileId={selectedFileId}
                        getContainer={() => textViewRef.current?.getContainer() ?? null}
                        onClose={() => setContentsOpen(false)}
                    />
                </div>
            )}

            {/* --- Модальные окна --- */}
            {/* Загрузка новой редакции (или актуализированной версии во время актуализации) */}
            {uploadOpen && (
                <VndUploadRedactionModal
                    vndId={vnd.id}
                    mode={vnd.status === "onact" ? "actualization" : "default"}
                    lockedRequiresApproval={vnd.actualizationRequiresApproval}
                    previousAttachments={selected.attachments}
                    onClose={() => setUploadOpen(false)}
                    onUploaded={handleRedactionUploaded}
                />
            )}

            {/* Сформировать или загрузить ТИД - для актуализационной редакции без файла ТИД */}
            {uploadTidOpen && (
                <VndUploadTidModal
                    vndId={vnd.id}
                    redactionCode={selected.code}
                    vndTitle={vnd.titleRu}
                    previousFileId={current && current.id !== selected.id ? current.docFileRuId : null}
                    draftFileId={selected.docFileRuId}
                    // "Разработчик" по умолчанию - тот, кто сейчас формирует ТИД (будущий
                    // инициатор согласования), а не обязательно ответственный за актуализацию -
                    // он остаётся запасным вариантом, если текущий пользователь ещё не загрузился.
                    defaultResponsibleUserId={user?.id ?? vnd.actualizationResponsibleUserId}
                    defaultResponsibleUserName={user?.fullName ?? vnd.actualizationResponsibleUserName}
                    canSelectResponsible={perms.canChangeTidDeveloper}
                    canUploadWithoutApproval={flow.canWithoutApproval}
                    onClose={() => setUploadTidOpen(false)}
                    onUploaded={handleTidUploaded}
                />
            )}

            {/* Начать/запросить/выполнить актуализацию, её настройки и удаление черновика */}
            <EditionsActualizationModals vnd={vnd} actualization={actualization} currentUserId={user?.id}/>

            {/* Запуск согласования */}
            {approvalModalOpen && (
                <VndStartApprovalModal
                    vndId={vnd.id}
                    // Кто фактически подготовил редакцию/ТИД, отправляемые на согласование именно
                    // сейчас: во время актуализации - её ответственный, а не создатель документа.
                    // Зеркалит draftOwnerId в VndApprovalService.StartAsync на бэке.
                    draftOwnerUserId={vnd.actualizationResponsibleUserId ?? vnd.createdByUserId}
                    draftOwnerUserName={vnd.actualizationResponsibleUserName ?? vnd.createdByUserName}
                    currentUserId={user?.id}
                    canChooseInitiator={perms.canChooseInitiator}
                    onClose={() => setApprovalModalOpen(false)}
                    onStarted={() => {
                        setApprovalModalOpen(false);
                        onVndChanged?.();
                        onGoToApproval?.();
                    }}
                />
            )}

            {/* Сделать редакцию действующей без согласования */}
            <PublishWithoutApprovalModal
                flow={publish}
                redactionId={selected.id}
                roleNames={perms.publishWithoutApprovalRoleNames}
            />

            {/* Редактирование редакции */}
            {editOpen && (
                <VndEditLastRevisionModal
                    vndId={vnd.id}
                    vnd={vnd}
                    redaction={selected}
                    roleNames={perms.editLastRevisionRoleNames}
                    onClose={() => setEditOpen(false)}
                    onSaved={() => {
                        setEditOpen(false);
                        reloadAll();
                        toast.success(
                            t("openVndPage.editionsTab.redactionUpdatedTitle"),
                            t("openVndPage.editionsTab.redactionUpdatedDescription", {code: selected.code})
                        );
                    }}
                />
            )}

            {/* Вложения, ТИД, лист согласования, матрица разногласий */}
            <RedactionDocumentModals
                vnd={vnd}
                docs={docs}
                downloadingId={download.activeId}
                onDownload={handleDownload}
                onTitlePageChanged={() => refetch()}
            />

            {/* Просмотр и сравнение редакций - слева выбранная сейчас редакция, справа
                соседняя по номеру; обе стороны можно переключить прямо в модалке. */}
            {compareMode && compareLeft && compareRight && (
                <RedactionCompareModal
                    vnd={vnd}
                    redactions={compareRedactions}
                    initialLeft={compareLeft}
                    initialRight={compareRight}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setCompareMode(false)}
                />
            )}

            {rejectedDetailsOpen && approvalProcess && rejectedRedaction && (
                <RejectedApprovalDetailsModal
                    vnd={vnd}
                    redaction={rejectedRedaction}
                    process={approvalProcess}
                    onClose={() => setRejectedDetailsOpen(false)}
                />
            )}
        </div>
    );
}
