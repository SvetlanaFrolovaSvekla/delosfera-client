import {useTranslation} from "react-i18next";
import React, {useState} from "react";
import {
    DOC_ACCEPT
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/editLastRevisionModal/EditLastRevisionModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {CheckCircle2, Download, Eye, FileText, Paperclip, RefreshCcw, RotateCcw} from "lucide-react";

/** Строка одного специального вложения - тот же визуальный паттерн, что и DocReplaceSlot, но
 * проще: не обязательно, всегда можно и заменить, и убрать, и приложить с нуля. */
/** Определение одного специального вложения (ТИД/Лист согласования/Матрица разногласий) для
 * SpecialFileSlot ниже - тот же смысл, что и DocSlotDef, но без языка и без обязательности: любое
 * из трёх можно как заменить, так и приложить с нуля там, где его никогда не было (например, у
 * редакции, перенесённой из isrib) - см. EditLastRevisionDirectlyRequest на бэке. */
export interface SpecialSlotDef {
    key: "tid" | "approvalSheet" | "disagreementMatrix";
    label: string;
    exists: boolean;
    fileId: number | null;
    fileName: string;
}

export function SpecialFileSlot({def, file, removed, onFileSelected, onRevert, onDownload, onView, onToggleRemove}: {
    def: SpecialSlotDef;
    file: File | null;
    removed: boolean;
    onFileSelected: (file: File) => void;
    onRevert: () => void;
    onDownload: () => void;
    onView: () => void;
    onToggleRemove: () => void;
}) {
    const {t} = useTranslation();
    const isUpdated = file !== null;
    const [inputKey, setInputKey] = useState(0);

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0];
        if (picked) onFileSelected(picked);
        setInputKey((k) => k + 1);
    };

    return (
        <div
            className={`flex flex-wrap items-center gap-2.5 rounded-[9px] border px-3 py-[10px] ${
                removed
                    ? "border-[#f0c4c4] bg-[#fdf5f5]"
                    : isUpdated
                        ? "border-[#bfe3cc] bg-[#f4fbf6]"
                        : def.exists
                            ? "border-[#e5e9f0] bg-white"
                            : "border-dashed border-[#d5dae3] bg-[#fbfcfe]"
            }`}
        >
            <FileText
                size={16}
                className={`flex-none ${removed ? "text-[#c0392b]" : def.exists || isUpdated ? "text-[#4e57d6]" : "text-[#c3c9d4]"}`}
            />

            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                    {def.label} <span className="normal-case font-normal">
                        {/* (необязательно) */}
                    {t("vndEditLastRevisionModal.optionalSuffix")}
                    </span>
                </span>
                <Tooltip
                    // Файл не загружен
                    content={isUpdated ? file!.name : def.exists ? def.fileName : t("vndEditLastRevisionModal.fileNotLoaded")}
                    side="top"
                    className="w-full min-w-0"
                >
                    <span className={`block truncate text-[13px] ${removed ? "text-[#c0392b] line-through" : "text-[#26324a]"}`}>
                        {/* Файл не загружен */}
                        {isUpdated ? file!.name : def.exists ? def.fileName : t("vndEditLastRevisionModal.fileNotLoaded")}
                    </span>
                </Tooltip>
            </span>

            {removed ? (
                <span className="flex-none text-[11px] font-semibold text-[#c0392b]">
                    {/* Будет удалено */}
                    {t("vndEditLastRevisionModal.willBeRemoved")}
                </span>
            ) : isUpdated && (
                <span className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e8e3e]">
                    <CheckCircle2 size={12} className="flex-none"/>
                    {/* Обновлено / Добавлено */}
                    {def.exists ? t("vndEditLastRevisionModal.updated") : t("vndEditLastRevisionModal.added")}
                </span>
            )}

            {def.exists && !removed && (
                <>
                    {/* Просмотреть документ */}
                    <Tooltip content={t("vndEditLastRevisionModal.viewDocumentTooltip")} side="top">
                        <button
                            type="button"
                            onClick={onView}
                            className="cursor-pointer flex-none rounded-[7px] border border-[#e5e9f0] bg-white p-[6px] text-[#8b97ab] hover:border-[#4e57d6]/40 hover:text-[#4e57d6]"
                        >
                            <Eye size={14}/>
                        </button>
                    </Tooltip>
                    {/* Скачать текущий файл */}
                    <Tooltip content={t("vndEditLastRevisionModal.downloadCurrentFileTooltip")} side="top">
                        <button
                            type="button"
                            onClick={onDownload}
                            className="cursor-pointer flex-none rounded-[7px] border border-[#e5e9f0] bg-white p-[6px] text-[#8b97ab] hover:border-[#4e57d6]/40 hover:text-[#4e57d6]"
                        >
                            <Download size={14}/>
                        </button>
                    </Tooltip>
                </>
            )}

            {!removed && (
                isUpdated ? (
                    <button
                        type="button"
                        onClick={onRevert}
                        className="cursor-pointer flex-none inline-flex items-center gap-1.5 rounded-[7px] border border-[#e5e9f0] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#8b97ab] hover:border-[#c0392b]/40 hover:text-[#c0392b]"
                    >
                        <RotateCcw size={13}/>
                        {/* Вернуть */}
                        {t("vndEditLastRevisionModal.revert")}
                    </button>
                ) : (
                    <label
                        className="cursor-pointer flex-none inline-flex items-center gap-1.5 rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                    >
                        <input key={inputKey} type="file" accept={DOC_ACCEPT} className="hidden" onChange={handlePick}/>
                        {def.exists ? <RefreshCcw size={13}/> : <Paperclip size={13}/>}
                        {/* Заменить / Загрузить */}
                        {def.exists ? t("vndEditLastRevisionModal.replace") : t("vndEditLastRevisionModal.upload")}
                    </label>
                )
            )}

            {def.exists && !isUpdated && (
                <button
                    type="button"
                    onClick={onToggleRemove}
                    className={`cursor-pointer flex-none rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                        removed
                            ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                            : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                    }`}
                >
                    {/* Отменить удаление / Удалить */}
                    {removed ? t("vndEditLastRevisionModal.cancelDeletion") : t("vndEditLastRevisionModal.delete")}
                </button>
            )}
        </div>
    );
}