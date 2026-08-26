import {forwardRef, useImperativeHandle} from "react";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import type {RedactionLanguage, RedactionViewTarget} from "@/utils/redactionLanguagePanelUtils.ts";
import {FileText, Loader2, ChevronUp, ChevronDown, X} from "lucide-react";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";
import {useDocxTextSearch} from "@/hooks/vndHooks/useDocxTextSearch.ts";

interface RedactionTextViewProps {
    vnd: VndResponse;
    selected: VndRedactionResponse;
    /** Язык документа редакции, либо "tid" - показать вместо него Таблицу изменений и дополнений. */
    activeLanguage: RedactionViewTarget;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    searchQuery?: string;
    onClearSearch?: () => void;
    /** Разрешить горизонтальный скролл содержимого (на случай широких таблиц/страниц) — по
     * умолчанию выключен (документ вписывается по ширине). Используется, например, для мини-окна
     * просмотра ТИД в RedactionCompareModal. */
    scrollX?: boolean;
}

export interface RedactionTextViewHandle {
    goNext: () => void;
    goPrev: () => void;
    /** DOM-узел, в который отрендерен docx (для внешней подсветки, напр. сравнения редакций) */
    getContainer: () => HTMLDivElement | null;
    /** true, когда документ отрендерен, без ошибки и текст на выбранном языке существует */
    isReady: () => boolean;
}

const FILE_KEY_BY_LANG: Record<RedactionLanguage, "docFileRuId" | "docFileKgId" | "docFileEnId"> = {
    ru: "docFileRuId",
    kg: "docFileKgId",
    en: "docFileEnId",
};

export const RedactionTextView = forwardRef<RedactionTextViewHandle, RedactionTextViewProps>(
    function RedactionTextView({vnd, selected, activeLanguage, searchQuery = "", onClearSearch, scrollX = false}, ref) {
        const {t} = useTranslation();
        const fileId = activeLanguage === "tid"
            ? selected.tidFileId
            : selected[FILE_KEY_BY_LANG[activeLanguage]] as number | null;

        // scrollX=true (мини-окно ТИД) - сохраняем реальную ширину документа/таблиц, чтобы
        // широкие таблицы не сжимались, а скроллились по горизонтали (см. RedactionTextView
        // ниже - overflow-x-auto - и useDocxPreview - ignoreWidth).
        const {containerRef, loading, error} = useDocxPreview(fileId, {ignoreWidth: !scrollX});

        const {matchCount, currentIndex, goNext, goPrev} = useDocxTextSearch(
            containerRef,
            searchQuery,
            !loading && fileId !== null,
            `${fileId}-${activeLanguage}`, // сброс подсветки при смене редакции/языка
        );

        useImperativeHandle(ref, () => ({
            goNext,
            goPrev,
            getContainer: () => containerRef.current,
            isReady: () => !loading && error === null && fileId !== null,
        }), [goNext, goPrev, containerRef, loading, error, fileId]);

        if (fileId === null) {
            return (
                <div
                    className="flex flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                    <FileText size={22} className="text-[#c3ccd8]"/>
                    {t("openVndPage.redactionTextView.noTextInLanguage")}
                </div>
            );
        }

        if (error) {
            const fileName = activeLanguage === "tid"
                ? `${selected.code}_ТИД.docx`
                : buildRedactionFileName(selected.code, vnd.name, activeLanguage);
            return (
                <div
                    className="flex h-full flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#c0392b]">
                    <FileText size={22} className="text-[#e3a5a5]"/>
                    <span>Не удалось загрузить предпросмотр документа</span>
                    <span className="text-[#8b97ab]">{fileName}</span>
                </div>
            );
        }

        return (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className={`min-h-0 flex-1 overflow-y-auto rounded-[12px] bg-white ${scrollX ? "overflow-x-auto" : "overflow-x-hidden"}`}>

                    {/* Плавающая панель поиска — sticky внутри скролла, занимает место в потоке */}
                    {searchQuery.trim() && !loading && (
                        <div className="sticky top-0 z-10 flex justify-end px-3 pt-3">
                            <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white/95 px-3 py-[6px] shadow-[0_4px_16px_rgba(20,25,40,0.12)] backdrop-blur-sm">
                                <span className="text-[12px] font-medium">
                                    {matchCount > 0 ? (
                                        <>
                                            <span className="text-[#4e57d6]">{currentIndex + 1}</span>
                                            <span className="text-[#a3adbd]"> / {matchCount}</span>
                                        </>
                                    ) : (
                                        <span className="text-[#a3adbd]">Совпадений нет</span>
                                    )}
                                </span>

                                <div className="h-[16px] w-px bg-[#e5e9f0]"/>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        disabled={matchCount === 0}
                                        className="grid h-[24px] w-[24px] place-items-center rounded-[6px] text-[#5a6478] transition-colors hover:bg-[#f2f4f8] hover:text-[#4e57d6] disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronUp size={15}/>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        disabled={matchCount === 0}
                                        className="grid h-[24px] w-[24px] place-items-center rounded-[6px] text-[#5a6478] transition-colors hover:bg-[#f2f4f8] hover:text-[#4e57d6] disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronDown size={15}/>
                                    </button>
                                </div>

                                <div className="h-[16px] w-px bg-[#e5e9f0]"/>

                                <button
                                    type="button"
                                    onClick={onClearSearch}
                                    className="grid h-[24px] w-[24px] place-items-center rounded-[6px] text-[#a3adbd] transition-colors hover:bg-[#fdecec] hover:text-[#c0392b]"
                                >
                                    <X size={15}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                            <Loader2 size={22} className="animate-spin text-[#c3ccd8]"/>
                            <span>{t("openVndPage.redactionTextView.loadingPreview") ?? "Загрузка документа..."}</span>
                        </div>
                    )}
                    <div
                        ref={containerRef}
                        className="docx-preview-wrapper mx-auto max-w-[1700px]"
                        style={{display: loading ? "none" : "block"}}
                    />
                </div>
            </div>
        );
    }
);