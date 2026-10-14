// Модалка "Документ для печати" (кнопка с принтером в шапке ВНД рядом с глазиком и звёздочкой):
// пользователь отмечает тексты редакции, специальные вложения и вложения, смотрит любой файл
// глазиком, расставляет порядок (перетаскиванием или стрелками) - и сервер собирает из них ОДИН
// который удобно сразу отправить на печать.
import {useMemo, useState, type DragEvent, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";

import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {
    buildPrintBundleItems, PRINT_BUNDLE_GROUPS, type PrintBundleGroup, type PrintBundleItem,
} from "@/utils/vndProcess/printBundleItems.ts";
import {useCanExportVnd} from "@/hooks/vndHooks/useCanExportVnd.ts";

import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {AttachmentDocxPreviewModal} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {
    ChevronDown, ChevronUp, Download, Eye, FileText, GripVertical, ListOrdered, Loader2, Printer, X,
} from "lucide-react";

interface PrintVndBundleModalProps {
    vnd: VndResponse;
    redactions: VndRedactionResponse[];
    /** Редакция, открытая по умолчанию (обычно последняя). Если в redactions одна редакция -
     * переключателя редакций нет (так открывается с панелей на вкладке «Согласование»). */
    initialRedactionId: number;
    /** Откуда открыли и что это за редакция - плашка рядом с кодом редакции в шапке, например
     * "Новая редакция — на согласовании" / "Предыдущая редакция". */
    contextLabel?: string;
    /** Цвет плашки contextLabel: новая (на согласовании) - тёплая, предыдущая - нейтральная. */
    contextTone?: "new" | "previous";
    onClose: () => void;
}

const GROUP_TITLE_KEY: Record<PrintBundleGroup, string> = {
    redaction: "printBundle.groupRedaction",
    special: "printBundle.groupSpecial",
    attachments: "printBundle.groupAttachments",
};

/** По умолчанию отмечен русский текст редакции - самый частый сценарий печати. */
function defaultOrder(items: PrintBundleItem[]): string[] {
    const first = items.find((i) => i.group === "redaction" && i.mergeable);
    return first ? [first.key] : [];
}

export function PrintVndBundleModal({
    vnd, redactions, initialRedactionId, contextLabel, contextTone = "previous", onClose,
}: PrintVndBundleModalProps) {
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();

    const sortedRedactions = useMemo(
        () => [...redactions].sort((a, b) => b.number - a.number),
        [redactions],
    );
    const [redactionId, setRedactionId] = useState(initialRedactionId);
    const redaction = sortedRedactions.find((r) => r.id === redactionId) ?? sortedRedactions[0];

    const items = useMemo(() => buildPrintBundleItems(t, vnd, redaction), [t, vnd, redaction]);
    const itemsByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

    // Выбранные файлы В ПОРЯДКЕ следования в документе - отметка чекбокса добавляет в конец
    const [order, setOrder] = useState<string[]>(() => defaultOrder(items));
    const selected = useMemo(() => new Set(order), [order]);

    const [preview, setPreview] = useState<PrintBundleItem | null>(null);
    const [previewDownloadingId, setPreviewDownloadingId] = useState<number | null>(null);
    const [building, setBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragKey, setDragKey] = useState<string | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    const switchRedaction = (id: number) => {
        if (id === redactionId) return;
        const next = sortedRedactions.find((r) => r.id === id);
        if (!next) return;
        setRedactionId(id);
        setOrder(defaultOrder(buildPrintBundleItems(t, vnd, next)));
        setError(null);
    };

    const toggle = (item: PrintBundleItem, checked: boolean) => {
        setError(null);
        setOrder((prev) => checked
            ? (prev.includes(item.key) ? prev : [...prev, item.key])
            : prev.filter((k) => k !== item.key));
    };

    const toggleGroup = (group: PrintBundleGroup, checked: boolean) => {
        setError(null);
        const groupKeys = items.filter((i) => i.group === group && i.mergeable).map((i) => i.key);
        setOrder((prev) => checked
            ? [...prev, ...groupKeys.filter((k) => !prev.includes(k))]
            : prev.filter((k) => !groupKeys.includes(k)));
    };

    const move = (from: number, to: number) => {
        setOrder((prev) => {
            if (to < 0 || to >= prev.length || from === to) return prev;
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    // --- Перетаскивание в списке "Порядок в документе" (нативный HTML5 drag & drop)
    const onDragStart = (e: DragEvent, key: string) => {
        setDragKey(key);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
    };
    const onDragOver = (e: DragEvent, index: number) => {
        if (dragKey === null) return;
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        setDropIndex(after ? index + 1 : index);
    };
    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        if (dragKey !== null && dropIndex !== null) {
            const from = order.indexOf(dragKey);
            // Индекс вставки считается до удаления перетаскиваемого элемента
            const to = dropIndex > from ? dropIndex - 1 : dropIndex;
            move(from, to);
        }
        setDragKey(null);
        setDropIndex(null);
    };
    const onDragEnd = () => {
        setDragKey(null);
        setDropIndex(null);
    };

    const handlePreviewDownload = async (fileId: number, name: string) => {
        setPreviewDownloadingId(fileId);
        try {
            await downloadWithToast(fileId, name);
        } catch {
            // ошибку уже показал тост
        } finally {
            setPreviewDownloadingId(null);
        }
    };

    const handleBuild = async () => {
        if (order.length === 0 || building || !canExportVnd) return;
        setBuilding(true);
        setError(null);
        const toastId = toast.loading(t("printBundle.buildingToast"), vnd.code);
        try {
            await vndService.downloadPrintBundle(vnd.id, {
                fileIds: order.map((k) => itemsByKey.get(k)!.fileId),
                redactionId: redaction.id,
            }, `${redaction.code}_для_печати.docx`);
            toast.update(toastId, {
                variant: "success",
                title: t("printBundle.builtToast"),
                description: `${redaction.code}_для_печати.docx`,
                duration: 4500,
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : t("printBundle.buildError");
            setError(message);
            toast.update(toastId, {
                variant: "error",
                title: t("printBundle.buildError"),
                description: message,
                duration: 5500,
            });
        } finally {
            setBuilding(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/40 p-4 backdrop-blur-[2px]">
            <div className="flex h-[88vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)]">
                {/* Шапка */}
                <div className="flex items-start gap-3 border-b border-[#eef1f5] px-6 py-4">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                        <Printer size={18}/>
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[16px] font-bold text-[#1d2740]">{t("printBundle.title")}</div>
                        <div className="mt-0.5 text-[12.5px] text-[#6b7891]">{t("printBundle.subtitle")}</div>
                        {/* Какая редакция собирается - чтобы в модалках с разных панелей не перепутать */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#ececfc] px-2.5 py-[3px] text-[11.5px] font-bold text-[#4e57d6]">
                                {t("printBundle.redactionBadge", {code: redaction.code})}
                            </span>
                            {contextLabel && (
                                <span className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${
                                    contextTone === "new"
                                        ? "bg-[#fff3d6] text-[#9a6408]"
                                        : "bg-[#f2f4f8] text-[#55617a]"
                                }`}>
                                    {contextLabel}
                                </span>
                            )}
                            {!contextLabel && redaction.isCurrent && (
                                <span className="rounded-full bg-[#e7f6ec] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#1f9254]">
                                    {t("printBundle.current")}
                                </span>
                            )}
                        </div>
                    </div>
                    <Tooltip content={t("printBundle.close")} side="bottom">
                        <button type="button" onClick={onClose} aria-label={t("printBundle.close")}
                                className="cursor-pointer rounded-[9px] p-1.5 text-[#8b97ab] hover:bg-[#f2f4f8] hover:text-[#3a4560]">
                            <X size={18}/>
                        </button>
                    </Tooltip>
                </div>

                {/* Выбор редакции */}
                {sortedRedactions.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1f5] px-6 py-3">
                        <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            {t("printBundle.redaction")}
                        </span>
                        {sortedRedactions.map((r) => {
                            const active = r.id === redaction.id;
                            return (
                                <button key={r.id} type="button" onClick={() => switchRedaction(r.id)}
                                        className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
                                            active
                                                ? "border-[#4e57d6] bg-[#4e57d6] text-white"
                                                : "border-[#d7dee8] bg-white text-[#3a4560] hover:border-[#4e57d6]/40 hover:bg-[#ececfc]"
                                        }`}>
                                    {r.code}
                                    {r.isCurrent && (
                                        <span className={`ml-1.5 text-[10.5px] font-medium ${active ? "text-white/80" : "text-[#1f9254]"}`}>
                                            · {t("printBundle.current")}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                    {/* Слева: что включить */}
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        {PRINT_BUNDLE_GROUPS.map((group) => {
                            const groupItems = items.filter((i) => i.group === group);
                            if (groupItems.length === 0) return null;
                            const selectable = groupItems.filter((i) => i.mergeable);
                            const allChecked = selectable.length > 0 && selectable.every((i) => selected.has(i.key));
                            return (
                                <section key={group} className="mb-6 last:mb-0">
                                    <div className="mb-2.5 flex items-center justify-between gap-3">
                                        <PlainCheckbox checked={allChecked} disabled={selectable.length === 0}
                                                       onChange={(c) => toggleGroup(group, c)}>
                                            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#6b7891]">
                                                {t(GROUP_TITLE_KEY[group])}
                                            </span>
                                        </PlainCheckbox>
                                        <span className="text-[11.5px] text-[#a3adbd]">
                                            {t("printBundle.selectedOf", {
                                                selected: groupItems.filter((i) => selected.has(i.key)).length,
                                                total: groupItems.length,
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {groupItems.map((item) => (
                                            <ItemRow key={item.key} item={item}
                                                     checked={selected.has(item.key)}
                                                     position={selected.has(item.key) ? order.indexOf(item.key) + 1 : null}
                                                     onToggle={(c) => toggle(item, c)}
                                                     onPreview={() => setPreview(item)}/>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                        {items.length === 0 && (
                            <div className="rounded-[12px] border border-dashed border-[#d7dee8] px-4 py-8 text-center text-[13px] text-[#8b97ab]">
                                {t("printBundle.noFiles")}
                            </div>
                        )}
                    </div>

                    {/* Справа: порядок в документе */}
                    <div className="flex min-h-0 w-full flex-col border-t border-[#eef1f5] bg-[#f8fafc] md:w-[390px] md:border-l md:border-t-0">
                        <div className="flex items-center gap-2 px-5 pb-2 pt-5">
                            <ListOrdered size={15} className="text-[#4e57d6]"/>
                            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#6b7891]">
                                {t("printBundle.orderTitle")}
                            </span>
                        </div>
                        <div className="px-5 pb-3 text-[11.5px] leading-[1.45] text-[#8b97ab]">{t("printBundle.orderHint")}</div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5" onDragOver={(e) => dragKey !== null && e.preventDefault()}
                             onDrop={onDrop}>
                            {order.length === 0 ? (
                                <div className="rounded-[12px] border border-dashed border-[#d7dee8] bg-white px-4 py-8 text-center text-[12.5px] text-[#8b97ab]">
                                    {t("printBundle.orderEmpty")}
                                </div>
                            ) : (
                                <ol className="flex flex-col gap-2">
                                    {order.map((key, index) => {
                                        const item = itemsByKey.get(key);
                                        if (!item) return null;
                                        return (
                                            <li key={key}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, key)}
                                                onDragOver={(e) => onDragOver(e, index)}
                                                onDragEnd={onDragEnd}
                                                className={`relative flex items-center gap-2 rounded-[10px] border bg-white py-2 pl-1.5 pr-2 transition-shadow ${
                                                    dragKey === key ? "border-[#4e57d6]/50 opacity-50" : "border-[#e5e9f0] hover:shadow-[0_2px_8px_-4px_rgba(15,27,45,.25)]"
                                                }`}>
                                                {dropIndex === index && dragKey !== key && (
                                                    <span className="pointer-events-none absolute -top-[5px] left-2 right-2 h-[2px] rounded bg-[#4e57d6]"/>
                                                )}
                                                {dropIndex === index + 1 && index === order.length - 1 && dragKey !== key && (
                                                    <span className="pointer-events-none absolute -bottom-[5px] left-2 right-2 h-[2px] rounded bg-[#4e57d6]"/>
                                                )}
                                                <Tooltip content={t("printBundle.dragHint")} side="top">
                                                    <span className="cursor-grab text-[#b4bdcc] hover:text-[#4e57d6] active:cursor-grabbing" aria-hidden>
                                                        <GripVertical size={16}/>
                                                    </span>
                                                </Tooltip>
                                                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#ececfc] text-[11px] font-bold text-[#4e57d6]">
                                                    {index + 1}
                                                </span>
                                                <span className="flex min-w-0 flex-1 flex-col">
                                                    <span className="truncate text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                                        {item.caption}
                                                    </span>
                                                    <Tooltip content={item.title} side="top" className="min-w-0 max-w-full">
                                                        <span className="block min-w-0 truncate text-[12.5px] text-[#26324a]">{item.title}</span>
                                                    </Tooltip>
                                                </span>
                                                <span className="flex flex-none items-center">
                                                    <IconButton label={t("printBundle.moveUp")} disabled={index === 0}
                                                                onClick={() => move(index, index - 1)}>
                                                        <ChevronUp size={15}/>
                                                    </IconButton>
                                                    <IconButton label={t("printBundle.moveDown")} disabled={index === order.length - 1}
                                                                onClick={() => move(index, index + 1)}>
                                                        <ChevronDown size={15}/>
                                                    </IconButton>
                                                    <IconButton label={t("printBundle.remove")} onClick={() => toggle(item, false)}>
                                                        <X size={14}/>
                                                    </IconButton>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </div>
                    </div>
                </div>

                {/* Подвал */}
                <div className="flex flex-wrap items-center gap-3 border-t border-[#eef1f5] px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                        {error ? (
                            <div className="text-[12.5px] text-[#c0392b]">{error}</div>
                        ) : (
                            <div className="text-[12.5px] text-[#6b7891]">
                                {t("printBundle.footerCount", {count: order.length})}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={onClose}
                            className="cursor-pointer rounded-[10px] border border-[#d7dee8] bg-white px-4 py-2 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]">
                        {t("printBundle.cancel")}
                    </button>
                    <Tooltip content={canExportVnd ? t("printBundle.downloadTooltip") : t("redactionDocumentsPanel.noExportHint")} side="top">
                        <button type="button" onClick={handleBuild}
                                disabled={order.length === 0 || building || !canExportVnd}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#434bc4] disabled:cursor-not-allowed disabled:opacity-50">
                            {building ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
                            {t("printBundle.download")}
                        </button>
                    </Tooltip>
                </div>
            </div>

            {preview && (
                <AttachmentDocxPreviewModal
                    fileId={preview.fileId}
                    fileName={preview.fileName}
                    downloadingId={previewDownloadingId}
                    onDownload={handlePreviewDownload}
                    downloadDisabled={!canExportVnd}
                    downloadDisabledHint={t("redactionDocumentsPanel.noExportHint")}
                    onClose={() => setPreview(null)}
                />
            )}
        </div>,
        document.body,
    );
}

function ItemRow({item, checked, position, onToggle, onPreview}: {
    item: PrintBundleItem;
    checked: boolean;
    position: number | null;
    onToggle: (checked: boolean) => void;
    onPreview: () => void;
}) {
    const {t} = useTranslation();
    return (
        <div className={`flex items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors ${
            checked ? "border-[#4e57d6]/40 bg-[#f5f5fe]" : "border-[#e5e9f0] hover:border-[#4e57d6]/30 hover:bg-[#f6f8fb]"
        } ${item.mergeable ? "" : "opacity-70"}`}>
            <PlainCheckbox checked={checked} disabled={!item.mergeable} onChange={onToggle}
                           ariaLabel={item.title} className="min-w-0 flex-1">
                <FileText size={16} className={`flex-none ${item.group === "attachments" ? "text-[#8b97ab]" : "text-[#4e57d6]"}`}/>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">{item.caption}</span>
                    <Tooltip content={item.title} side="top" className="min-w-0 max-w-full">
                        <span className="block min-w-0 truncate text-[13px] text-[#26324a]">{item.title}</span>
                    </Tooltip>
                </span>
            </PlainCheckbox>

            {!item.mergeable && (
                <Tooltip content={t("printBundle.unsupportedHint")} side="top">
                    <span className="flex-none cursor-help rounded-full bg-[#f2f4f8] px-2 py-[3px] text-[10.5px] font-semibold text-[#8b97ab]">
                        {t("printBundle.unsupportedBadge")}
                    </span>
                </Tooltip>
            )}
            {position !== null && (
                <span className="grid h-6 min-w-6 flex-none place-items-center rounded-full bg-[#4e57d6] px-1.5 text-[11px] font-bold text-white">
                    {position}
                </span>
            )}
            {item.previewable && (
                <Tooltip content={t("printBundle.preview")} side="top">
                    <button type="button" onClick={onPreview}
                            className="cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white p-[6px] text-[#4e57d6] hover:bg-[#ececfc]">
                        <Eye size={14}/>
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

function IconButton({label, disabled, onClick, children}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <Tooltip content={label} side="top" disabled={disabled}>
            <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
                    className="cursor-pointer rounded-[7px] p-1 text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8b97ab]">
                {children}
            </button>
        </Tooltip>
    );
}
