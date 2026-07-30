import {useState} from "react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useRedactionSelection} from "@/hooks/vndHooks/useRedactionSelection.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {downloadWithToast} from "@/utils/downloadFile.ts";
import {VndUploadRedactionModal} from "@/components/componentsVND/VndUploadRedactionModal.tsx";
import {vndService} from "@/service/vndService/vndService.ts";
import {getRedactionDisplayStatus, REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {
    RedactionsSidebar
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionsSidebar.tsx";
import {
    RedactionStatusBanner
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionStatusBanner.tsx";
import {
    RedactionDocumentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionDocumentsPanel.tsx";
import {
    RedactionCompareView
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionCompareView.tsx";


interface VndEditionsTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void;
}

export function VndEditionsTab({vnd, onVndChanged}: VndEditionsTabProps) {
    const {data: redactions, loading, error, refetch} = useVndRedactions(vnd.id);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

    const {sortedDesc, lastByNumber, current, selected, compareTarget, uploadBlocked} =
        useRedactionSelection(redactions, selectedId);

    const download = useAsyncAction<number>();
    const submit = useAsyncAction<number>();

    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), "Не удалось скачать файл");

    const handleSubmitForApproval = (redactionId: number) =>
        submit.run(
            redactionId,
            async () => {
                await vndService.submitRedaction(vnd.id, redactionId);
                refetch();
                onVndChanged?.();
                toast.info("Отправлено на согласование", "ВНД отправлен на согласование, ожидайте решения.");
            },
            "Не удалось отправить на согласование"
        );

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

    if (!selected) {
        return (
            <div
                className="flex flex-col items-center gap-3 rounded-2xl border border-[#e9edf3] bg-white p-8 text-sm text-[#8b97ab]">
                <p>Редакции документа отсутствуют.</p>
                <button
                    onClick={() => setUploadOpen(true)}
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    Загрузить первую редакцию
                </button>
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

    const selectedStatus = getRedactionDisplayStatus(selected);
    const selectedMeta = REDACTION_STATUS_META[selectedStatus];

    return (
        <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
            <RedactionsSidebar
                redactions={sortedDesc}
                selectedId={selected.id}
                onSelect={setSelectedId}
                uploadBlocked={uploadBlocked}
                lastByNumber={lastByNumber}
                onUpload={() => setUploadOpen(true)}
                compareMode={compareMode}
                onToggleCompare={() => setCompareMode((v) => !v)}
            />

            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] px-5 py-[13px]">
                    <div className="text-[13.5px] font-semibold text-[#1c2740]">{selected.code}</div>
                    <span className="text-[12px] text-[#8b97ab]">{formatDate(selected.createdAt)}</span>
                    <span
                        className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold"
                        style={{color: selectedMeta.color, background: selectedMeta.bg}}
                    >
                        {selectedMeta.label}
                    </span>
                    <div className="flex-1"/>
                </div>

                <RedactionStatusBanner
                    status={selectedStatus}
                    currentNumber={current?.number}
                    onSubmit={() => handleSubmitForApproval(selected.id)}
                    isSubmitting={submit.isActive(selected.id)}
                />

                {submit.error && (
                    <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                        {submit.error}
                    </div>
                )}

                {selected.description && (
                    <div
                        className="border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3 text-[13px] leading-[1.6] text-[#3c424a]">
                        <span className="font-semibold">Описание редакции:</span> {selected.description}
                    </div>
                )}

                {download.error && (
                    <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                        {download.error}
                    </div>
                )}

                {!compareMode ? (
                    <RedactionDocumentsPanel
                        vnd={vnd}
                        selected={selected}
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