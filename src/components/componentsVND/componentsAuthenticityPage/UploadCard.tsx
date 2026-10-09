import {useRef, useState, type DragEvent} from "react";
import {useTranslation} from "react-i18next";
import {formatSize} from "@/utils/vndProcess/authenticityUtils.ts";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {AlertTriangle, FileSearch, FileText, RefreshCw, Search, Upload} from "lucide-react";
import {BTN_PRIMARY, CARD, CARD_TITLE} from "./styles/authenticityStyles.ts";

interface Props {
    file: File | null;
    checking: boolean;
    error: string | null;
    /** Файл уже проверен (есть результат) - иначе подсказка "нажмите Проверить". */
    checked?: boolean;
    onPick: (file: File | null | undefined) => void;
    onCheck: () => void;
}

/** Карточка загрузки файла: дропзона, подсказка, кнопка «Проверить», ошибка. */
export function UploadCard({file, checking, error, checked = false, onPick, onCheck}: Props) {
    const {t} = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        onPick(e.dataTransfer.files?.[0]);
    };

    return (
        <section className={`${CARD} p-5`}>
            <div className="mb-3.5 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-[#2d354a]" strokeWidth={2}/>
                <span className={CARD_TITLE}>{t("vndAuthenticity.uploadTitle")}</span>
            </div>

            <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-4 py-12 text-center transition-colors ${
                    dragOver ? "border-[#4e57d6] bg-[#f4f5ff]" : "border-[#dfe4ec] bg-[#fafbfd] hover:border-[#c5cbe0] hover:bg-[#f6f8fb]"
                }`}
            >
                {file ? (
                    <>
                        <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#ececfc] text-[#4e57d6]">
                            <FileText className="h-6 w-6" strokeWidth={1.8}/>
                        </span>
                        <div className="mt-3 max-w-full truncate text-[14px] font-semibold text-[#1c2740]">{file.name}</div>
                        <div className="mt-0.5 text-[12px] text-[#8b97ab]">{formatSize(file.size)}</div>
                        {checked ? (
                            // Проверка уже выполнена - можно выбрать другой файл.
                            <span
                                className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-[#d9dcf6] bg-white px-3 py-[5px] text-[12px] font-semibold text-[#4e57d6] shadow-[0_1px_2px_rgba(78,87,214,.08)] transition-colors hover:bg-[#f4f5ff]">
                                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2}/>
                                {t("vndAuthenticity.pickAnotherFile", {defaultValue: "Нажмите, чтобы выбрать другой файл"})}
                            </span>
                        ) : (
                            // Файл загружен, но ещё не проверен.
                            <span className="mt-3.5 text-[12.5px] font-medium text-[#4e57d6]">
                                {t("vndAuthenticity.pressCheckHint", {defaultValue: "Нажмите «Проверить», чтобы начать проверку"})}
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#f2f5f9] text-[#a3adbd]">
                            <Upload className="h-6 w-6" strokeWidth={1.8}/>
                        </span>
                        <div className="mt-3 text-[14px] font-semibold text-[#1c2740]">{t("vndAuthenticity.dropTitle")}</div>
                        <div className="mt-0.5 text-[12px] text-[#8b97ab]">{t("vndAuthenticity.dropSubtitle")}</div>
                    </>
                )}
                <input ref={inputRef} type="file" className="hidden"
                       onChange={(e) => {
                           onPick(e.target.files?.[0]);
                           e.target.value = "";
                       }}/>
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <Clue icon={AlertTriangle} className="max-w-[760px] flex-1">
                    {t("vndAuthenticity.byteExactHint")}
                </Clue>
                <button type="button" disabled={!file || checking} onClick={onCheck} className={BTN_PRIMARY}>
                    <Search className="h-4 w-4" strokeWidth={2}/>
                    {checking ? t("vndAuthenticity.checking") : t("vndAuthenticity.check")}
                </button>
            </div>

            {error && (
                <div className="mt-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}
        </section>
    );
}
