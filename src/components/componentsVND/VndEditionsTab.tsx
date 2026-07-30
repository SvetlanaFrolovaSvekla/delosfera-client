import { useMemo, useState } from "react";
import { Columns2, Download, FileText, Loader2, Plus } from "lucide-react";
import type { VndResponse } from "@/service/vndService/vndServiceType.ts";
import { useVndRedactions } from "@/hooks/vndHooks/useVndRedactions.ts";
import { formatDate } from "@/utils/dateUtils.ts";
import { downloadFile } from "@/utils/downloadFile.ts";
import { VndUploadRedactionModal } from "@/components/componentsVND/VndUploadRedactionModal.tsx";
import { vndService } from "@/service/vndService/vndService.ts";
import { getRedactionDisplayStatus, REDACTION_STATUS_META } from "@/utils/redactionStatus.ts";

interface VndEditionsTabProps {
    vnd: VndResponse;
}

export function VndEditionsTab({ vnd }: VndEditionsTabProps) {
    // ── Все хуки — здесь, наверху, без исключений ──
    const { data: redactions, loading, error, refetch } = useVndRedactions(vnd.id);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [submittingId, setSubmittingId] = useState<number | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

    const sortedDesc = useMemo(() => [...redactions].sort((a, b) => b.number - a.number), [redactions]);
    const lastByNumber = sortedDesc[0];
    const currentId = redactions.find((r) => r.isCurrent)?.id;
    const selected = redactions.find((r) => r.id === selectedId) ?? sortedDesc[0];

    const compareTarget = useMemo(() => {
        const idx = sortedDesc.findIndex((r) => r.id === selected?.id);
        if (idx === -1) return undefined;
        return sortedDesc[idx + 1] ?? sortedDesc[idx - 1];
    }, [sortedDesc, selected]);

    // Правило 5: пока последняя редакция черновик или на согласовании — новую грузить нельзя
    const uploadBlocked =
        lastByNumber?.approvalStatus === "Draft" || lastByNumber?.approvalStatus === "Pending";

    const handleDownload = async (fileId: number, name: string) => {
        setDownloadError(null);
        setDownloadingId(fileId);
        try {
            await downloadFile(fileId, name);
        } catch (e) {
            setDownloadError(e instanceof Error ? e.message : "Не удалось скачать файл");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleSubmitForApproval = async (redactionId: number) => {
        setSubmitError(null);
        setSubmittingId(redactionId);
        try {
            await vndService.submitRedaction(vnd.id, redactionId);
            refetch();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : "Не удалось отправить на согласование");
        } finally {
            setSubmittingId(null);
        }
    };

    // ── Только теперь можно делать условные return ──
    if (loading) {
        return <div className="py-8 text-center text-[13px] text-[#8b97ab]">Загрузка редакций…</div>;
    }

    if (error) {
        return (
            <div className="rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[13px] text-[#c0392b]">
                Не удалось загрузить редакции: {error}
            </div>
        );
    }

    if (!selected) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#e9edf3] bg-white p-8 text-sm text-[#8b97ab]">
                <p>Редакции документа отсутствуют.</p>
                <button
                    onClick={() => setUploadOpen(true)}
                    className="flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                >
                    <Plus size={16} /> Загрузить первую редакцию
                </button>
                {uploadOpen && (
                    <VndUploadRedactionModal
                        vndId={vnd.id}
                        onClose={() => setUploadOpen(false)}
                        onUploaded={() => {
                            setUploadOpen(false);
                            refetch();
                        }}
                    />
                )}
            </div>
        );
    }

    const selectedStatus = getRedactionDisplayStatus(selected);
    const selectedMeta = REDACTION_STATUS_META[selectedStatus];

    return (
        <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
            {/* Левая колонка: список редакций */}
            <div className="rounded-[14px] border border-[#e9edf3] bg-white p-[14px]">
                <div className="px-1 pb-[10px] pt-[2px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                    Редакции документа
                </div>

                <div className="flex flex-col gap-2">
                    {sortedDesc.map((e) => {
                        const active = e.id === selected.id;
                        const status = getRedactionDisplayStatus(e);
                        const meta = REDACTION_STATUS_META[status];
                        return (
                            <button
                                key={e.id}
                                onClick={() => setSelectedId(e.id)}
                                className={`flex items-start gap-2 rounded-[10px] border p-2 text-left transition-colors ${
                                    active
                                        ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06]"
                                        : "border-transparent hover:bg-[#f6f8fb]"
                                }`}
                            >
                                <span className="w-[38px] flex-none font-mono text-[13px] font-bold text-[#1c2740]">
                                    Р{e.number}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-[7px]">
                                        <span className="text-[12.5px] font-semibold text-[#26324a]">{e.code}</span>
                                        <span
                                            className="rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold"
                                            style={{ color: meta.color, background: meta.bg }}
                                        >
                                            {meta.label}
                                        </span>
                                    </span>
                                    <span className="mt-[2px] block text-[11px] text-[#8b97ab]">
                                        {formatDate(e.createdAt)} · вложений: {e.attachmentFileIds.length}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-[11px] flex flex-col gap-1">
                    <button
                        onClick={() => setUploadOpen(true)}
                        disabled={uploadBlocked}
                        className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                    >
                        <Plus size={16} strokeWidth={2} />
                        Новая редакция
                    </button>
                    {uploadBlocked && (
                        <p className="px-1 text-[11px] leading-[1.4] text-[#9a6408]">
                            Р{lastByNumber?.number} ещё не завершена — сначала отправьте и дождитесь решения.
                        </p>
                    )}
                </div>

                <button
                    onClick={() => setCompareMode((v) => !v)}
                    className={`mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors ${
                        compareMode
                            ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                            : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                    }`}
                >
                    <Columns2 size={16} strokeWidth={1.8} />
                    Сравнение редакций
                </button>
            </div>

            {/* Правая колонка */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] px-5 py-[13px]">
                    <div className="text-[13.5px] font-semibold text-[#1c2740]">{selected.code}</div>
                    <span className="text-[12px] text-[#8b97ab]">{formatDate(selected.createdAt)}</span>
                    <span
                        className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold"
                        style={{ color: selectedMeta.color, background: selectedMeta.bg }}
                    >
                        {selectedMeta.label}
                    </span>
                    <div className="flex-1" />
                </div>

                {selectedStatus === "draft" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e2f7] bg-[#f5f6fd] px-5 py-[11px]">
                        <span className="text-[12px] text-[#3a4560]">
                            Черновик редакции. Пока не отправлена — доступна для правок.
                        </span>
                        <button
                            type="button"
                            disabled={submittingId === selected.id}
                            onClick={() => handleSubmitForApproval(selected.id)}
                            className="flex h-[30px] items-center gap-2 rounded-[8px] bg-[#4e57d6] px-3 text-[12px] font-semibold text-white hover:bg-[#3f47bd] disabled:opacity-60"
                        >
                            {submittingId === selected.id && <Loader2 size={13} className="animate-spin" />}
                            Отправить на согласование
                        </button>
                    </div>
                )}

                {selectedStatus === "pending" && (
                    <div className="flex items-center gap-[10px] border-b border-[#f0dcae] bg-[#fdf6e8] px-5 py-[11px]">
                        <span className="text-[12px] text-[#9a6408]">
                            Редакция ожидает решения по согласованию.
                        </span>
                    </div>
                )}

                {selectedStatus === "rejected" && (
                    <div className="flex items-center gap-[10px] border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[11px]">
                        <span className="text-[12px] text-[#c0392b]">
                            Эта редакция была отклонена при согласовании и не стала действующей.
                        </span>
                    </div>
                )}

                {selectedStatus === "outdated" && (
                    <div className="flex items-center gap-[10px] border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-[11px]">
                        <span className="text-[12px] text-[#8b97ab]">
                            Эта редакция вытеснена более новой. Действующая — Р
                            {redactions.find((r) => r.id === currentId)?.number ?? "—"}.
                        </span>
                    </div>
                )}

                {submitError && (
                    <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                        {submitError}
                    </div>
                )}

                {selected.description && (
                    <div className="border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3 text-[13px] leading-[1.6] text-[#55617a]">
                        {selected.description}
                    </div>
                )}

                {downloadError && (
                    <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                        {downloadError}
                    </div>
                )}

                {!compareMode ? (
                    <div className="p-[20px]">
                        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            Документы редакции
                        </div>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: "Русский", fileId: selected.docFileRuId },
                                { label: "Кыргызча", fileId: selected.docFileKgId },
                                { label: "English", fileId: selected.docFileEnId },
                            ]
                                .filter((d) => d.fileId !== null)
                                .map((d) => {
                                    const fid = d.fileId as number;
                                    const isDownloading = downloadingId === fid;
                                    return (
                                        <button
                                            key={d.label}
                                            type="button"
                                            disabled={isDownloading}
                                            onClick={() => handleDownload(fid, `${selected.code}_${d.label}`)}
                                            className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] px-3 py-[10px] text-left text-[13px] text-[#26324a] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb] disabled:opacity-60"
                                        >
                                            <FileText size={16} className="text-[#4e57d6]" />
                                            <span className="flex-1">{d.label}</span>
                                            {isDownloading ? (
                                                <Loader2 size={14} className="animate-spin text-[#8b97ab]" />
                                            ) : (
                                                <Download size={14} className="text-[#8b97ab]" />
                                            )}
                                        </button>
                                    );
                                })}
                        </div>

                        {selected.attachmentFileIds.length > 0 && (
                            <>
                                <div className="mb-3 mt-5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                    Вложения ({selected.attachmentFileIds.length})
                                </div>
                                <div className="flex flex-col gap-2">
                                    {selected.attachmentFileIds.map((fid) => {
                                        const isDownloading = downloadingId === fid;
                                        return (
                                            <button
                                                key={fid}
                                                type="button"
                                                disabled={isDownloading}
                                                onClick={() => handleDownload(fid, `Вложение_${fid}`)}
                                                className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] px-3 py-[10px] text-left text-[13px] text-[#26324a] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb] disabled:opacity-60"
                                            >
                                                <FileText size={16} className="text-[#8b97ab]" />
                                                <span className="flex-1">Вложение #{fid}</span>
                                                {isDownloading ? (
                                                    <Loader2 size={14} className="animate-spin text-[#8b97ab]" />
                                                ) : (
                                                    <Download size={14} className="text-[#8b97ab]" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid min-h-[200px] grid-cols-2">
                        <div className="border-r border-[#eef2f7] p-[16px_20px]">
                            <div className="mb-[10px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {compareTarget ? compareTarget.code : "—"}
                            </div>
                            {compareTarget ? (
                                <button
                                    type="button"
                                    disabled={downloadingId === compareTarget.docFileRuId}
                                    onClick={() => handleDownload(compareTarget.docFileRuId, `${compareTarget.code}_RU`)}
                                    className="inline-flex items-center gap-2 text-[13px] text-[#4e57d6] hover:underline disabled:opacity-60"
                                >
                                    <FileText size={15} /> Открыть документ (RU)
                                </button>
                            ) : (
                                <p className="text-[13px] text-[#8b97ab]">Нет данных для сравнения</p>
                            )}
                        </div>
                        <div className="bg-[#f6faf7] p-[16px_20px]">
                            <div className="mb-[10px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#1c7a4d]">
                                {selected.code}
                            </div>
                            <button
                                type="button"
                                disabled={downloadingId === selected.docFileRuId}
                                onClick={() => handleDownload(selected.docFileRuId, `${selected.code}_RU`)}
                                className="inline-flex items-center gap-2 text-[13px] text-[#1c7a4d] hover:underline disabled:opacity-60"
                            >
                                <FileText size={15} /> Открыть документ (RU)
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {uploadOpen && (
                <VndUploadRedactionModal
                    vndId={vnd.id}
                    onClose={() => setUploadOpen(false)}
                    onUploaded={() => {
                        setUploadOpen(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}