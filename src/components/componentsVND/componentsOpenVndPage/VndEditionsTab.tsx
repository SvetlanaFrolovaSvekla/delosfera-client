// Таб "Редакции" открытой страницы ВНД
import {useRef} from "react";
import {useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";

import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useRedactionSelection} from "@/hooks/vndHooks/useRedactionSelection.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useAvailableHeight} from "@/hooks/vndHooks/useAvailableHeight.ts";
import {useVndActualizationFlow} from "@/hooks/vndHooks/useVndActualizationFlow.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";

import {downloadWithToast} from "@/utils/downloadFile.ts";
import {getRedactionDisplayStatus} from "@/utils/redactionStatus.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import {
    getAvailableLanguages,
    getRedactionFileId,
    type RedactionLanguage
} from "@/utils/redactionLanguagePanelUtils.ts";

import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {
    VndUploadRedactionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/VndUploadRedactionModal.tsx";
import {
    RedactionsSidebar, type RedactionsPrimaryActionVariant
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionsSidebar.tsx";
import {
    StartActualizationModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/StartActualizationModal.tsx";
import {
    RequestActualizationAccessModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/RequestActualizationAccessModal.tsx";
import {
    PerformActualizationModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/PerformActualizationModal.tsx";
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
    RedactionAttachmentsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionAttachmentsModal.tsx";
import {
    RedactionTidModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTidModal.tsx";
import {
    RedactionCompareView
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionCompareView.tsx";
import {
    VndStartApprovalModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndStartApprovalModal.tsx";
import {
    VndEditLastRevisionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/VndEditLastRevisionModal.tsx";
import {
    RedactionContentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionContentsPanel.tsx";

import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {Upload} from "lucide-react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";


interface VndEditionsTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void;
    /** Переключить страницу ВНД на таб «Ход согласования» — вызывается сразу после
     * успешного запуска согласования, чтобы пользователь увидел маршрут, а не
     * остался на «Редакциях», где дальше делать нечего. */
    onGoToApproval?: () => void;
}

export function VndEditionsTab({vnd, onVndChanged, onGoToApproval}: VndEditionsTabProps) {
    const {t} = useTranslation();
    const {data: redactions, loading, error, refetch} = useVndRedactions(vnd.id);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [contentsOpen, setContentsOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const textViewRef = useRef<RedactionTextViewHandle>(null);

    const {sortedDesc, lastByNumber, current, selected, compareTarget, uploadBlocked} =
        useRedactionSelection(redactions, selectedId);

    const hasStatusBannerAbove = vnd.status === "draft" || vnd.status === "consol";

    const {ref: containerRef, height: rawAvailableHeight} = useAvailableHeight();
    const availableHeight =
        rawAvailableHeight !== undefined && hasStatusBannerAbove
            ? rawAvailableHeight - 30
            : rawAvailableHeight;

    const download = useAsyncAction<number>();
    const submit = useAsyncAction<number>();

    const [approvalModalOpen, setApprovalModalOpen] = useState(false);

    const {hasPermission, user} = useAuth();
    const [editOpen, setEditOpen] = useState(false);

    const {
        canDirectly, canByRequest,
        myAccessState, needsPerform, needsConfirmStartAfterRequest,
        startOpen: actualizeStartOpen, setStartOpen: setActualizeStartOpen,
        requestOpen: actualizeRequestOpen, setRequestOpen: setActualizeRequestOpen,
        performOpen: actualizePerformOpen, setPerformOpen: setActualizePerformOpen, performMode: actualizePerformMode,
        submitting: actualizeSubmitting, error: actualizeError, setError: setActualizeError,
        handleStart: handleActualizeStart, handleRequestAccess: handleActualizeRequestAccess,
        handlePerformConfirm: handleActualizePerformConfirm,
        canWithoutApproval, canWithApproval,
        canRequestWithoutApproval, canRequestWithApproval,
    } = useVndActualizationFlow(vnd, () => onVndChanged?.());

    // "Без изменений" без согласования — подтвердить прямо здесь (кнопка сайдбара
    // "confirmNoChanges"), без захода на вкладку «Актуализация» (см. handleConfirmNoChanges
    // в VndActualizationTab.tsx — та же логика, продублирована здесь по той же причине, по
    // которой сюда переехал шаг "Выполнить актуализацию").
    const [confirmingNoChanges, setConfirmingNoChanges] = useState(false);
    const handleConfirmNoChanges = async () => {
        setConfirmingNoChanges(true);
        try {
            await actualizationService.confirmNoChanges(vnd.id);
            toast.success("Отсутствие изменений подтверждено", "Документ переведён в консолидацию");
            onVndChanged?.();
        } catch (err) {
            toast.error("Не удалось подтвердить", err instanceof Error ? err.message : undefined);
        } finally {
            setConfirmingNoChanges(false);
        }
    };

    const [activeLanguage, setActiveLanguage] = useState<RedactionLanguage>("ru");

    const [attachmentsRedaction, setAttachmentsRedaction] = useState<VndRedactionResponse | null>(null);
    const [tidRedaction, setTidRedaction] = useState<VndRedactionResponse | null>(null);

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

    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), t("openVndPage.editionsTab.downloadError"));

    const selectedFileId = selected ? getRedactionFileId(selected, activeLanguage) : null;
    const handleDownloadSelected = () => {
        if (!selected || selectedFileId === null) return;
        void handleDownload(selectedFileId, buildRedactionFileName(selected.code, vnd.name, activeLanguage));
    };

    const handleRedactionUploaded = (redaction: VndRedactionResponse) => {
        setUploadOpen(false);
        refetch();
        onVndChanged?.();

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

    /* Если нет редакций */
    if (!selected) {
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
                        requiresTid={vnd.redactionIds.length > 0}
                        onClose={() => setUploadOpen(false)}
                        onUploaded={handleRedactionUploaded}
                    />
                )}
            </div>
        );
    }

    const selectedStatus = getRedactionDisplayStatus(selected, vnd.status, lastByNumber?.id === selected.id);

    // --- Главная кнопка сайдбара редакций: что она делает, зависит от того, есть ли у ВНД уже
    // действующая редакция, и, если да, от текущего статуса цикла актуализации.
    const hasCurrentRedaction = !!current;
    const uploadMode: "default" | "actualization" = vnd.status === "onact" ? "actualization" : "default";

    let primaryVariant: RedactionsPrimaryActionVariant;
    let primaryDisabled: boolean;
    let primaryHint: string | undefined;
    let primaryAction: () => void;

    if (!hasCurrentRedaction) {
        // Нет предыдущих актуальных редакций - добавление новой редакции напрямую, без актуализации
        primaryVariant = "new";
        primaryDisabled = uploadBlocked;
        primaryHint = uploadBlocked
            ? t("openVndPage.redactionsSidebar.uploadBlockedHint", {number: lastByNumber?.number})
            : undefined;
        primaryAction = () => setUploadOpen(true);
    } else if (vnd.status === "onact") {
        if (vnd.actualizationPerformed) {
            if (vnd.actualizationPlannedNoChanges) {
                // Заявлено "без изменений" на шаге "Выполнить актуализацию" - новая редакция не
                // нужна. Дальше два пути в зависимости от того, требует ли цикл согласования:
                if (vnd.actualizationRequiresApproval) {
                    // Отправляем действующую редакцию на согласование как есть (открывает тот
                    // же VndStartApprovalModal, что и обычная отправка черновика на
                    // согласование - бэк сам разрешает это для actualizationPlannedNoChanges,
                    // см. VndApprovalService.StartAsync/isNoChangesReviewRound)
                    primaryVariant = "startApprovalNoChanges";
                    primaryDisabled = false;
                    primaryHint = t("openVndPage.redactionsSidebar.noChangesApprovalHint");
                    primaryAction = () => setApprovalModalOpen(true);
                } else {
                    // Согласование не требуется - подтверждаем отсутствие изменений напрямую,
                    // документ сразу уходит в консолидацию
                    primaryVariant = "confirmNoChanges";
                    primaryDisabled = confirmingNoChanges;
                    primaryHint = t("openVndPage.redactionsSidebar.noChangesConfirmHint");
                    primaryAction = () => void handleConfirmNoChanges();
                }
            } else {
                // Цикл актуализации уже идёт, шаг "Выполнить актуализацию" пройден, заявлены
                // изменения - загружаем актуализированную версию
                primaryVariant = "uploadActualized";
                primaryDisabled = uploadBlocked;
                primaryHint = uploadBlocked
                    ? t("openVndPage.redactionsSidebar.uploadBlockedHint", {number: lastByNumber?.number})
                    : undefined;
                primaryAction = () => setUploadOpen(true);
            }
        } else if (needsPerform) {
            // Шаг "Выполнить актуализацию" ещё не пройден, но я могу его выполнить (ответственный
            // или главный редактор) — загрузка новой редакции заблокирована на бэке (см.
            // VndDocument.ActualizationPerformed). Кнопка сама открывает PerformActualizationModal
            // прямо здесь, без перехода на вкладку «Актуализация».
            primaryVariant = "performActualization";
            primaryDisabled = false;
            primaryHint = undefined;
            primaryAction = () => setActualizePerformOpen(true);
        } else {
            // Шаг ещё не пройден, но выполнить его должен кто-то другой (не я)
            primaryVariant = "performActualization";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.waitingPerformHint");
            primaryAction = () => {};
        }
    } else if (vnd.status === "active") {
        if (myAccessState.kind === "pending") {
            primaryVariant = "actualize";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.pendingRequestHint");
            primaryAction = () => {};
        } else if (needsConfirmStartAfterRequest) {
            // Заявка одобрена - остаётся выполнить актуализацию (совмещает старт цикла и сам
            // шаг для этого пути), тоже прямо здесь, без перехода на вкладку «Актуализация».
            primaryVariant = "performActualization";
            primaryDisabled = false;
            primaryHint = undefined;
            primaryAction = () => setActualizePerformOpen(true);
        } else if (!canDirectly && !canByRequest) {
            primaryVariant = "actualize";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.noPermissionHint");
            primaryAction = () => {};
        } else {
            primaryVariant = "actualize";
            primaryDisabled = false;
            primaryHint = undefined;
            primaryAction = () => {
                if (canDirectly) setActualizeStartOpen(true);
                else setActualizeRequestOpen(true);
            };
        }
    } else {
        // Согласование/консолидация/архив/черновик - актуализацию сейчас не начать
        primaryVariant = "actualize";
        primaryDisabled = true;
        primaryHint = undefined;
        primaryAction = () => {};
    }

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
                    placeholder="Поиск по тексту редакции…"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSubmit={() => textViewRef.current?.goNext()}
                />

                {/* Редакции документа */}
                <RedactionsSidebar
                    redactions={sortedDesc}
                    selectedId={selected.id}
                    vndStatus={vnd.status}
                    onSelect={setSelectedId}
                    primaryActionVariant={primaryVariant}
                    primaryActionDisabled={primaryDisabled}
                    primaryActionHint={primaryHint}
                    onPrimaryAction={primaryAction}
                    compareMode={compareMode}
                    onToggleCompare={() => setCompareMode((v) => !v)}
                    contentsOpen={contentsOpen}
                    onToggleContents={() => setContentsOpen((v) => !v)}
                    canEditLastRevision={hasPermission(PermissionCode.EditLastRevisionDirectly)}
                    onEditRedaction={handleEditRedaction}
                    onOpenAttachments={setAttachmentsRedaction}
                    onOpenTid={setTidRedaction}
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

            {/* Центральная панель */}
            {/* Закреплённый статус-баннер сверху + прокручиваемое содержимое ниже */}
            <div
                style={{height: availableHeight}}
                className="flex min-h-0 max-h-[750px] flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            >
                <RedactionStatusBanner
                    status={selectedStatus}
                    currentNumber={current?.number}
                    isSubmitting={false}
                    onSubmit={() => setApprovalModalOpen(true)}
                />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {submit.error && (
                        <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {submit.error}
                        </div>
                    )}

                    {download.error && (
                        <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {download.error}
                        </div>
                    )}

                    {!compareMode ? (
                        <RedactionTextView
                            ref={textViewRef}
                            vnd={vnd}
                            selected={selected}
                            activeLanguage={activeLanguage}
                            downloadingId={download.activeId}
                            onDownload={handleDownload}
                            searchQuery={searchQuery}
                            onClearSearch={() => setSearchQuery("")}
                        />
                    ) : (
                        <RedactionCompareView
                            vnd={vnd}
                            selected={selected}
                            compareTarget={compareTarget}
                            downloadingId={download.activeId}
                            onDownload={handleDownload}
                        />
                    )}
                </div>
            </div>

            {/* Правая панель - содержание */}
            {contentsOpen && selected && (
                <div style={{height: availableHeight}} className="min-h-0">
                    <RedactionContentsPanel
                        redactionCode={selected.code}
                        onClose={() => setContentsOpen(false)}
                    />
                </div>
            )}

            {/* --- Другие модальные окна --- */}
            {/* Загрузка новой редакции (или актуализированной версии - см. uploadMode) */}
            {uploadOpen && (
                <VndUploadRedactionModal
                    vndId={vnd.id}
                    requiresTid={vnd.redactionIds.length > 0}
                    mode={uploadMode}
                    lockedRequiresApproval={vnd.actualizationRequiresApproval}
                    onClose={() => setUploadOpen(false)}
                    onUploaded={handleRedactionUploaded}
                />
            )}

            {/* Начать актуализацию (для прав ActualizeAnyVnd...) */}
            {actualizeStartOpen && user && (
                <StartActualizationModal
                    canWithoutApproval={canWithoutApproval}
                    canWithApproval={canWithApproval}
                    submitting={actualizeSubmitting}
                    error={actualizeError}
                    currentUserId={user.id}
                    onClose={() => {
                        if (actualizeSubmitting) return;
                        setActualizeStartOpen(false);
                        setActualizeError(null);
                    }}
                    onConfirm={handleActualizeStart}
                />
            )}

            {/* Запросить доступ к актуализации (для прав ActualizeVnd...ByRequest) */}
            {actualizeRequestOpen && (
                <RequestActualizationAccessModal
                    canWithoutApproval={canRequestWithoutApproval}
                    canWithApproval={canRequestWithApproval}
                    submitting={actualizeSubmitting}
                    error={actualizeError}
                    onClose={() => {
                        if (actualizeSubmitting) return;
                        setActualizeRequestOpen(false);
                        setActualizeError(null);
                    }}
                    onConfirm={handleActualizeRequestAccess}
                />
            )}

            {/* Выполнить актуализацию (прямо во вкладке «Редакции», без перехода на «Актуализация») */}
            {actualizePerformOpen && (needsPerform || needsConfirmStartAfterRequest) && (
                <PerformActualizationModal
                    mode={actualizePerformMode}
                    decidedShiftNextPeriod={myAccessState.kind === "approved" ? myAccessState.shiftNextPeriod : undefined}
                    submitting={actualizeSubmitting}
                    error={actualizeError}
                    onClose={() => {
                        if (actualizeSubmitting) return;
                        setActualizePerformOpen(false);
                        setActualizeError(null);
                    }}
                    onConfirm={handleActualizePerformConfirm}
                />
            )}

            {/* Запуск согласования */}
            {approvalModalOpen && (
                <VndStartApprovalModal
                    vndId={vnd.id}
                    onClose={() => setApprovalModalOpen(false)}
                    onStarted={() => {
                        setApprovalModalOpen(false);
                        onVndChanged?.();
                        onGoToApproval?.();
                    }}
                />
            )}

            {/* Редактирование редакции */}
            {editOpen && selected && (
                <VndEditLastRevisionModal
                    vndId={vnd.id}
                    redaction={selected}
                    onClose={() => setEditOpen(false)}
                    onSaved={() => {
                        setEditOpen(false);
                        refetch();
                        onVndChanged?.();
                        toast.success(
                            t("openVndPage.editionsTab.redactionUpdatedTitle"),
                            t("openVndPage.editionsTab.redactionUpdatedDescription", {code: selected.code})
                        );
                    }}
                />
            )}

            {/* Вложения редакции */}
            {attachmentsRedaction && (
                <RedactionAttachmentsModal
                    redaction={attachmentsRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setAttachmentsRedaction(null)}
                />
            )}

            {/* Просмотр ТИД редакции */}
            {tidRedaction && (
                <RedactionTidModal
                    redaction={tidRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setTidRedaction(null)}
                />
            )}
        </div>
    );
}