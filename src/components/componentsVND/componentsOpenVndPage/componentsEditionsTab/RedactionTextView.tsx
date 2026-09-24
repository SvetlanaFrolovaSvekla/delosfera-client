import {forwardRef, useImperativeHandle, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";
import {useDocxTextSearch} from "@/hooks/vndHooks/useDocxTextSearch.ts";
import {useDocxQuoteMarks, type QuoteMarkFocusRequest} from "@/hooks/vndHooks/useDocxQuoteMarks.ts";
import {
    useDocxLegacyLinks, type LegacyAttachmentInfo, type LegacyLinkHover,
} from "@/hooks/vndHooks/useDocxLegacyLinks.ts";
import {AttachmentDocxPreviewModal} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {isPreviewableFile} from "@/utils/downloadFiles/fileNaming.ts";
import {useDocxLinkMarks, type DocLinkFocusRequest, type DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import {
    LegacyLinkHoverCard, VndLinkHoverCard,
} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/VndLinkHoverCard.tsx";
import {buildLinkFocusUrl} from "@/utils/vndProcess/vndLinkNavigation.ts";
import type {VndLinkSide} from "@/utils/vndProcess/vndLinkNavigation.ts";
import type {QuoteMarkInfo} from "@/utils/vndProcess/redactionQuoteMarks.ts";
import {buildRedactionFileName} from "@/utils/downloadFiles/fileNaming.ts";
import type {RedactionLanguage, RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {FileText, Loader2, ChevronUp, ChevronDown, X} from "lucide-react";

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
    /** Маркеры цитат из резолюций согласующих (см. collectQuoteMarks) для подсветки поверх
     * текста - см. useDocxQuoteMarks. Без этого пропа подсветки маркеров нет. */
    quoteMarks?: QuoteMarkInfo[];
    /** Кликабельны ли маркеры (открывают резолюцию целиком) - только во время активного
     * согласования этой редакции. */
    quoteMarksClickable?: boolean;
    /** Список цитат, накрывающих отрезок под курсором - обычно один элемент, но может быть
     * несколько, если разные согласующие процитировали одно и то же место (см.
     * useDocxQuoteMarks) - пустой массив при уходе курсора. */
    onHoverQuoteMark?: (marks: QuoteMarkInfo[], rect: DOMRect | null) => void;
    onClickQuoteMark?: (marks: QuoteMarkInfo[]) => void;
    /** "Показать в тексте": прокрутить к цитате с этим id и выделить её (см. useDocxQuoteMarks).
     * Цитата должна быть среди quoteMarks. */
    quoteMarkFocus?: QuoteMarkFocusRequest | null;
    /** Итог quoteMarkFocus - нашлась ли цитата в тексте (и точно ли). */
    onQuoteMarkFocusResult?: (result: {id: number; found: boolean; approximate: boolean}) => void;
    /** Ссылки на другие ВНД, прикреплённые к фрагментам ЭТОГО текста (и ссылки других ВНД на
     * фрагменты этого текста) - подсвечиваются и кликаются (см. useDocxLinkMarks). */
    linkMarks?: DocLinkMark[];
    /** "Лупа": прокрутить к месту ссылки и мигнуть им. Ссылка должна быть среди linkMarks. */
    linkFocus?: DocLinkFocusRequest | null;
    onLinkFocusResult?: (result: {linkId: number; side: VndLinkSide; found: boolean; approximate: boolean}) => void;
    /** false - метки ссылок не кликаются (например, в окне выбора фрагмента при добавлении
     * ссылки, где клик нужен для выделения текста). По умолчанию true. */
    linkMarksClickable?: boolean;
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
    function RedactionTextView({
                                    vnd, selected, activeLanguage, downloadingId, onDownload,
                                    searchQuery = "", onClearSearch, scrollX = false,
                                    quoteMarks, quoteMarksClickable, onHoverQuoteMark, onClickQuoteMark,
                                    quoteMarkFocus, onQuoteMarkFocusResult,
                                    linkMarks, linkFocus, onLinkFocusResult, linkMarksClickable = true,
                                }, ref) {
        const {t} = useTranslation();
        const navigate = useNavigate();
        const [hoveredLinks, setHoveredLinks] = useState<{marks: DocLinkMark[]; rect: DOMRect} | null>(null);
        const [legacyHover, setLegacyHover] = useState<{hover: LegacyLinkHover; rect: DOMRect} | null>(null);
        // Вложение, открытое по легаси-ссылке db://attachments/{n} из текста.
        const [previewAttachment, setPreviewAttachment] = useState<LegacyAttachmentInfo | null>(null);
        const fileId = activeLanguage === "tid"
            ? selected.tidFileId
            : activeLanguage === "approvalSheet"
                ? selected.approvalSheetFileId
                : activeLanguage === "disagreementMatrix"
                    ? selected.disagreementMatrixFileId
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

        useDocxQuoteMarks(
            containerRef,
            quoteMarks ?? [],
            !loading && fileId !== null,
            `${fileId}-${activeLanguage}`,
            {
                clickable: !!quoteMarksClickable,
                onHoverMark: onHoverQuoteMark ?? (() => {}),
                onClickMark: onClickQuoteMark ?? (() => {}),
                focus: quoteMarkFocus,
                onFocusResult: onQuoteMarkFocusResult,
            },
        );

        // Легаси-ссылки db://documents/{code} и db://attachments/{n}, унаследованные из старой
        // системы (isrib) - см. useDocxLegacyLinks.
        useDocxLegacyLinks(
            containerRef,
            vnd.id,
            !loading && fileId !== null,
            `${fileId}-${activeLanguage}`,
            {
                // Номер вложения в db://attachments/{n} - среди вложений ИМЕННО этой редакции.
                redactionId: selected.id,
                clickable: linkMarksClickable,
                onHover: (hover, rect) => setLegacyHover(hover && rect ? {hover, rect} : null),
                onOpenAttachment: (attachment) => {
                    if (isPreviewableFile(attachment.fileName)) setPreviewAttachment(attachment);
                    else onDownload(attachment.fileId, attachment.fileName);
                },
            },
        );

        // Куда ведёт ссылка из текста: "отсюда" - на документ-цель (или конкретное место в нём),
        // "сюда" (другой ВНД ссылается на этот фрагмент) - на место в ссылающемся документе.
        const linkMarkHref = (mark: DocLinkMark): string => mark.side === "source"
            ? (mark.targetFragment ? buildLinkFocusUrl(mark.other.vndId, mark.linkId, "target") : `/base-vnd/${mark.other.vndId}`)
            : buildLinkFocusUrl(mark.other.vndId, mark.linkId, "source");

        // Ссылки на другие ВНД, прикреплённые к фрагментам текста (и ссылки других ВНД сюда).
        useDocxLinkMarks(
            containerRef,
            linkMarks ?? [],
            !loading && fileId !== null,
            `${fileId}-${activeLanguage}`,
            {
                focus: linkFocus,
                onFocusResult: onLinkFocusResult,
                onHover: (marks, rect) => setHoveredLinks(marks.length > 0 && rect ? {marks, rect} : null),
                hrefFor: linkMarkHref,
                onClick: (marks) => {
                    if (!linkMarksClickable) return;
                    // Если на одном месте несколько ссылок - открываем первую; остальные видны
                    // в карточке при наведении и на вкладке "Связанные документы".
                    setHoveredLinks(null);
                    navigate(linkMarkHref(marks[0]));
                },
            },
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
                    {/* Текст на этом языке отсутствует */}
                    {t("openVndPage.redactionTextView.noTextInLanguage")}
                </div>
            );
        }

        if (error) {
            const fileName = activeLanguage === "tid"
                ? `${selected.code}_ТИД.docx`
                : activeLanguage === "approvalSheet"
                    ? `${selected.code}_Лист_согласования.docx`
                    : activeLanguage === "disagreementMatrix"
                        ? `${selected.code}_Матрица_разногласий.docx`
                        : buildRedactionFileName(selected.code, vnd.name, activeLanguage);
            return (
                <div
                    className="flex h-full flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#c0392b]">
                    <FileText size={22} className="text-[#e3a5a5]"/>
                    <span>
                        {/* Не удалось загрузить предпросмотр документа */}
                        {t("openVndPage.redactionTextView.previewLoadFailed")}
                    </span>
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
                                        <span className="text-[#a3adbd]">
                                            {/* Совпадений нет */}
                                            {t("openVndPage.redactionTextView.noMatches")}
                                        </span>
                                    )}
                                </span>

                                <div className="h-[16px] w-px bg-[#e5e9f0]"/>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        disabled={matchCount === 0}
                                        className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[6px] text-[#5a6478] transition-colors hover:bg-[#f2f4f8] hover:text-[#4e57d6] disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronUp size={15}/>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        disabled={matchCount === 0}
                                        className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[6px] text-[#5a6478] transition-colors hover:bg-[#f2f4f8] hover:text-[#4e57d6] disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronDown size={15}/>
                                    </button>
                                </div>

                                <div className="h-[16px] w-px bg-[#e5e9f0]"/>

                                <button
                                    type="button"
                                    onClick={onClearSearch}
                                    className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[6px] text-[#a3adbd] transition-colors hover:bg-[#fdecec] hover:text-[#c0392b]"
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
                        // scrollX (ТИД) - реальная ширина страницы/таблиц (docx-preview-scroll,
                        // без mx-auto/max-width - иначе широкая таблица схлопывается вместо
                        // горизонтального скролла, см. .docx-preview-fit в index.css). Обычный
                        // просмотр - как раньше, подгонка под ширину контейнера.
                        className={`docx-preview-wrapper ${scrollX ? "docx-preview-scroll" : "docx-preview-fit mx-auto max-w-[1700px]"}`}
                        style={{display: loading ? "none" : "block"}}
                    />
                </div>
                {hoveredLinks && (
                    <VndLinkHoverCard marks={hoveredLinks.marks} rect={hoveredLinks.rect} clickable={linkMarksClickable}/>
                )}
                {legacyHover && <LegacyLinkHoverCard hover={legacyHover.hover} rect={legacyHover.rect}/>}
                {previewAttachment && (
                    <AttachmentDocxPreviewModal
                        fileId={previewAttachment.fileId}
                        fileName={previewAttachment.fileName}
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        onClose={() => setPreviewAttachment(null)}
                    />
                )}
            </div>
        );
    }
);