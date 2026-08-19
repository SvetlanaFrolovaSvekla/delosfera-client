// Таб "Редакции" открытой страницы ВНД
import {useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";

import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useRedactionSelection} from "@/hooks/vndHooks/useRedactionSelection.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useAvailableHeight} from "@/hooks/vndHooks/useAvailableHeight.ts";

import {downloadWithToast} from "@/utils/downloadFile.ts";
import {getRedactionDisplayStatus} from "@/utils/redactionStatus.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";

import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {
VndUploadRedactionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/VndUploadRedactionModal.tsx";
import {
    RedactionsSidebar
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionsSidebar.tsx";
import {
    RedactionLanguageTabsPanel,
    getAvailableLanguages,
    type RedactionLanguage, getRedactionFileId,
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionLanguageTabsPanel.tsx";
import {
    RedactionStatusBanner
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionStatusBanner.tsx";
import {
    RedactionTextView
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

interface VndEditionsTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void;
}

export function VndEditionsTab({vnd, onVndChanged}: VndEditionsTabProps) {
    const {data: redactions, loading, error, refetch} = useVndRedactions(vnd.id);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [contentsOpen, setContentsOpen] = useState(false);

    const {sortedDesc, lastByNumber, current, selected, compareTarget, uploadBlocked} =
        useRedactionSelection(redactions, selectedId);

    const {ref: containerRef, height: availableHeight} = useAvailableHeight();

    const download = useAsyncAction<number>();
    const submit = useAsyncAction<number>();

    const [approvalModalOpen, setApprovalModalOpen] = useState(false);

    const {hasPermission} = useAuth();
    const [editOpen, setEditOpen] = useState(false);

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

    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), "Не удалось скачать файл");

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
            toast.success("ВНД теперь действует!", `Редакция ${redaction.code} стала действующей!`);
        } else {
            toast.info(
                "Редакция добавлена в черновик!",
                `Чтобы ${vnd.code} начал действовать, пожалуйста, отправьте редакцию ${redaction.code} на согласование.`
            );
        }
    };

    const handleEditRedaction = (redactionId: number) => {
        setSelectedId(redactionId);
        setEditOpen(true);
    };

    if (loading) {
        return <Loader label="Загрузка редакций…" fullHeight={false}/>;
    }

    if (error) {
        return (
            <EmptyState
                variant="error"
                title="Не удалось загрузить редакции"
                description={error}
                actionLabel="Повторить"
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
                    title="Редакции документа отсутствуют"
                    description="Загрузите первую редакцию, чтобы документ начал действовать"
                    actionLabel="Загрузить первую редакцию"
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

    const selectedStatus = getRedactionDisplayStatus(selected);

    return (
        <div
            ref={containerRef}
            style={{height: availableHeight}}
            className={`px-2 grid items-start gap-[15px] overflow-hidden ${
                contentsOpen ? "grid-cols-[260px_1fr_260px]" : "grid-cols-[260px_1fr]"
            }`}
        >

            {/* Левая панель */}
            <div
                style={{height: availableHeight}}
                className="flex min-h-0 flex-col gap-[10px]"
            >

                {/* Редакции документа */}
                <RedactionsSidebar
                    redactions={sortedDesc}
                    selectedId={selected.id}
                    onSelect={setSelectedId}
                    uploadBlocked={uploadBlocked}
                    lastByNumber={lastByNumber}
                    onUpload={() => setUploadOpen(true)}
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

                <div className="min-h-0 flex-1 overflow-y-auto">

                    {submit.error && (
                        <div
                            className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {submit.error}
                        </div>
                    )}

                    {download.error && (
                        <div
                            className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {download.error}
                        </div>
                    )}

                    {/* compareMode - режим сравнения редакций */}
                    {!compareMode ? (
                        <RedactionTextView
                            vnd={vnd}
                            selected={selected}
                            activeLanguage={activeLanguage}
                            downloadingId={download.activeId}
                            onDownload={handleDownload}
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
            {/* Загрузка новой редакции */}
            {uploadOpen && (
                <VndUploadRedactionModal
                    vndId={vnd.id}
                    requiresTid={vnd.redactionIds.length > 0}
                    onClose={() => setUploadOpen(false)}
                    onUploaded={handleRedactionUploaded}
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
                        toast.success("Редакция обновлена", `Изменения в редакции ${selected.code} сохранены.`);
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