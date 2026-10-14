/** Кнопка-чекбокс единого стиля с "Требуется согласование" (VndUploadRedactionModal) /
 * "Только связанные со мной" (VndFilters) - квадрат со скруглением и галочкой вместо
 * нативного input[type=checkbox]. */
import React, {useRef} from "react";
import {useTranslation} from "react-i18next";
import {type DocSlot, type DocSlotState, DOC_ACCEPT} from "./revisionDocs.ts";
import {Check, CheckCircle2, FileText, Paperclip, RefreshCcw, Trash2} from "lucide-react";

function CheckToggleButton({checked, onChange, label, disabled}: {
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onChange}
            className="inline-flex flex-none items-center gap-2 rounded-[9px] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50"
        >
            <span
                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                style={{
                    borderColor: checked ? "#4e57d6" : "#cbd3df",
                    background: checked ? "#4e57d6" : "white",
                }}
            >
                <Check
                    className="w-[13px] h-[13px] text-white"
                    strokeWidth={3}
                    style={{opacity: checked ? 1 : 0}}
                />
            </span>
            {label}
        </button>
    );
}

/** Строка одного документа редакции: для существующего - "требует замены" (открывает
 * "Заменить") либо удаление (для необязательных KG/EN); для отсутствующего языка -
 * простая загрузка "Добавить документ". */
export function DocReplaceRow({slot, state, onToggleReplace, onToggleRemove, onFileSelected, onClearFile}: {
    slot: DocSlot;
    state: DocSlotState;
    onToggleReplace: () => void;
    onToggleRemove?: () => void;
    onFileSelected: (file: File) => void;
    onClearFile: () => void;
}) {
    const {t} = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const isUpdated = state.file !== null;
    const willBeRemoved = state.remove;

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelected(file);
        e.target.value = "";
    };

    if (!slot.exists) {
        return (
            <div className="flex flex-wrap items-center gap-2.5 rounded-[9px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] px-3 py-[10px]">
                <FileText size={16} className="flex-none text-[#c3c9d4]"/>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                        {slot.label}
                    </span>
                    <span className="truncate text-[13px] text-[#8b97ab]">
                        {isUpdated ? state.file!.name : t("coordinationUi.revision.docNotLoaded")}
                    </span>
                </span>

                {isUpdated && (
                    <span className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e8e3e]">
                        <CheckCircle2 size={12} className="flex-none"/>
                        {t("coordinationUi.revision.added")}
                    </span>
                )}

                {isUpdated && (
                    <button
                        type="button"
                        onClick={onClearFile}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                        title={t("coordinationUi.revision.removeSelectedFile")}
                    >
                        <Trash2 size={14}/>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-none cursor-pointer inline-flex items-center gap-1.5 rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                >
                    <Paperclip size={13}/>
                    {isUpdated ? t("coordinationUi.revision.replace") : t("coordinationUi.revision.addDocument")}
                </button>
                <input ref={inputRef} type="file" accept={DOC_ACCEPT} className="hidden" onChange={handlePick}/>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-wrap items-center gap-2.5 rounded-[9px] border px-3 py-[10px] ${
                willBeRemoved ? "border-[#f0c4c4] bg-[#fdf5f5]" : "border-[#e5e9f0] bg-white"
            }`}
        >
            <FileText size={16} className="flex-none text-[#4e57d6]"/>

            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                    {slot.label}
                </span>
                <span
                    className={`truncate text-[13px] ${
                        willBeRemoved ? "text-[#c0392b] line-through" : "text-[#26324a]"
                    }`}
                >
                    {isUpdated ? state.file!.name : slot.title}
                </span>
            </span>

            <span
                className={`flex-none inline-flex items-center gap-1 text-[11px] font-semibold ${
                    willBeRemoved ? "text-[#c0392b]" : isUpdated ? "text-[#1e8e3e]" : "text-[#8b97ab]"
                }`}
            >
                {!willBeRemoved && isUpdated && <CheckCircle2 size={12} className="flex-none"/>}
                {willBeRemoved ? t("coordinationUi.revision.willBeRemoved") : isUpdated ? t("coordinationUi.revision.updated") : t("coordinationUi.revision.notUpdated")}
            </span>

            {isUpdated && !willBeRemoved && (
                <button
                    type="button"
                    onClick={onClearFile}
                    className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                    title={t("coordinationUi.revision.removeSelectedFile")}
                >
                    <Trash2 size={14}/>
                </button>
            )}

            <CheckToggleButton
                checked={state.requiresReplace}
                onChange={onToggleReplace}
                label={t("coordinationUi.revision.requiresReplace")}
                disabled={willBeRemoved}
            />

            <button
                type="button"
                disabled={!state.requiresReplace || willBeRemoved}
                onClick={() => inputRef.current?.click()}
                className={`flex-none inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                    state.requiresReplace && !willBeRemoved
                        ? "cursor-pointer border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc]"
                        : "cursor-not-allowed border-[#e5e9f0] bg-[#f3f4f7] text-[#b7bdc9]"
                }`}
            >
                <RefreshCcw size={13}/>
                {t("coordinationUi.revision.replace")}
            </button>
            <input ref={inputRef} type="file" accept={DOC_ACCEPT} className="hidden" onChange={handlePick}/>

            {slot.deletable && onToggleRemove && (
                <button
                    type="button"
                    onClick={onToggleRemove}
                    className={`flex-none cursor-pointer inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                        willBeRemoved
                            ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                            : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                    }`}
                >
                    <Trash2 size={13}/>
                    {willBeRemoved ? t("coordinationUi.revision.cancelRemoval") : t("coordinationUi.revision.delete")}
                </button>
            )}
        </div>
    );
}
