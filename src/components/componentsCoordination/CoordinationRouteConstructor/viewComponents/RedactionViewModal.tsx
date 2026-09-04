// Модалка "Просмотр редакции" (одиночно)
import {useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    RedactionTextView, type RedactionTextViewHandle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {
    RedactionContentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionContentsPanel.tsx";
import {
    getAvailableLanguages, type RedactionLanguage, type RedactionViewTarget
} from "@/utils/redactionLanguagePanelUtils.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Download, FileText, ListTree, Loader2, MessageSquareText, Quote, X} from "lucide-react";
import {collectQuoteMarks, quoteMarkModalProps, type QuoteMarkInfo} from "@/utils/redactionQuoteMarks.ts";
import {CommentViewModal} from "./CommentViewModal.tsx";
import {getInitials} from "@/utils/getInitials.ts";

interface RedactionViewModalProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    /* Вкладка, с которой модалка откроется - язык или ТИД. Если не передана, недоступна у этой
     редакции, или это "tid", а ТИД у редакции нет - используется первый доступный язык. */
    initialLanguage?: RedactionViewTarget;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
    /** Режим "сослаться на текст" (см. "+ Сослаться на текст редакции" в
     * VndApproverResolutionPanel): если передан - при выделении текста документа рядом
     * всплывает кнопка "Сослаться на выделенное", клик по которой вызывает этот колбэк с
     * выделенным текстом (и вкладкой, на которой было выделение) и сразу закрывает модалку.
     * Без этого пропа модалка ведёт себя как обычный просмотр. */
    onInsertQuote?: (selectedText: string, documentTarget: RedactionViewTarget) => void;
    /** Процесс согласования - если передан, поверх текста подсвечиваются маркерами цитаты,
     * на которые сослались согласующие в резолюциях (см. collectQuoteMarks), с кнопкой
     * "Комментарии" рядом с "Содержание"/"Скачать". Без этого пропа маркеров нет. */
    approvalProcess?: ApprovalProcessResponse;
    /** Кликабельны ли маркеры (открывают резолюцию целиком) - только во время активного
     * согласования этой редакции (после завершения согласования смотреть можно, кликать нет). */
    quoteMarksClickable?: boolean;
    /** Открыть модалку сразу с этой вкладкой документа и этим поисковым запросом - подсветит и
     * проскроллит к первому совпадению (см. useDocxTextSearch). Используется, чтобы "перейти к
     * месту в тексте" по цитате - как из ещё не отправленной резолюции (VndApproverResolutionPanel),
     * так и из списка маркеров панели "Комментарии" ниже. */
    initialSearchQuery?: string;
}

/** Позиция плавающей кнопки "Сослаться на выделенное" в координатах viewport - модалка сама
 * зафиксирована на весь экран, поэтому fixed-позиционирование по rect выделения работает как
 * есть, без пересчёта относительно какого-либо контейнера. */
interface QuoteHint {
    text: string;
    top: number;
    left: number;
}

const LANG_LABELS: Record<RedactionViewTarget, string> = {
    ru: "RU", kg: "KG", en: "EN", tid: "ТИД", approvalSheet: "Лист согласования",
    disagreementMatrix: "Матрица разногласий",
};

const LANG_FILE_KEYS: Record<RedactionLanguage, "docFileRuId" | "docFileKgId" | "docFileEnId"> = {
    ru: "docFileRuId",
    kg: "docFileKgId",
    en: "docFileEnId",
};

export function RedactionViewModal({
                                       vnd, redaction, initialLanguage, downloadingId, onDownload, onClose,
                                       onInsertQuote, approvalProcess, quoteMarksClickable, initialSearchQuery,
                                   }: RedactionViewModalProps) {
    const availableLanguages = getAvailableLanguages(redaction);
    // ТИД и Лист согласования доступны как отдельные "вкладки" просмотра наравне с языками,
    // только если у редакции вообще есть соответствующий файл.
    const availableViews: RedactionViewTarget[] = [
        ...availableLanguages,
        ...(redaction.tidFileId !== null ? (["tid"] as const) : []),
        ...(redaction.approvalSheetFileId !== null ? (["approvalSheet"] as const) : []),
        ...(redaction.disagreementMatrixFileId !== null ? (["disagreementMatrix"] as const) : []),
    ];
    const [activeLanguage, setActiveLanguage] = useState<RedactionViewTarget>(
        initialLanguage && availableViews.includes(initialLanguage)
            ? initialLanguage
            : availableLanguages[0] ?? "ru"
    );
    const textViewRef = useRef<RedactionTextViewHandle>(null);

    // Панель "Содержание" (заголовки документа, построенные из стилей Word) - как и в основной
    // вкладке "Редакции" (VndEditionsTab), открывается/закрывается кнопкой рядом со скачиванием.
    const [contentsOpen, setContentsOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? "");
    // Сброс поиска при смене вкладки/редакции — НЕ на самом первом рендере, иначе он сразу же
    // затирает initialSearchQuery (переход "к месту в тексте по цитате"), с которым модалка
    // могла быть открыта изначально на этой же вкладке.
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        setSearchQuery("");
    }, [activeLanguage, redaction.id]);

    // Плавающая кнопка "Сослаться на выделенное" - только в режиме цитирования (onInsertQuote
    // передан). Слушаем selectionchange на document (а не mouseup только на контейнере) - так
    // ловим и выделение с клавиатуры (Shift+стрелки), а не только мышью.
    const [quoteHint, setQuoteHint] = useState<QuoteHint | null>(null);

    useEffect(() => {
        setQuoteHint(null);
    }, [activeLanguage]);

    useEffect(() => {
        if (!onInsertQuote) return;

        const handleSelectionChange = () => {
            const container = textViewRef.current?.getContainer();
            const selection = window.getSelection();
            if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
                setQuoteHint(null);
                return;
            }
            // Игнорируем выделение вне текста документа (например, в поле поиска) - цитировать
            // имеет смысл только сам текст редакции.
            if (
                !selection.anchorNode || !selection.focusNode
                || !container.contains(selection.anchorNode) || !container.contains(selection.focusNode)
            ) {
                setQuoteHint(null);
                return;
            }
            const text = selection.toString().trim();
            if (!text) {
                setQuoteHint(null);
                return;
            }
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            // Последний прямоугольник - ближе к концу выделения (важно для многострочных
            // выделений, getBoundingClientRect дал бы верхний левый угол всего диапазона).
            const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();
            setQuoteHint({text, top: rect.bottom, left: rect.left});
        };

        document.addEventListener("selectionchange", handleSelectionChange);
        return () => document.removeEventListener("selectionchange", handleSelectionChange);
    }, [onInsertQuote]);

    const handleInsertQuote = () => {
        if (!quoteHint || !onInsertQuote) return;
        onInsertQuote(quoteHint.text, activeLanguage);
        onClose();
    };

    // Маркеры цитат из резолюций согласующих (см. VndApproverResolutionPanel) - подсвечиваются
    // поверх текста только на той вкладке, к которой относятся (см. QuoteMarkInfo.documentTarget).
    const quoteMarks = useMemo(
        () => (approvalProcess ? collectQuoteMarks(approvalProcess, activeLanguage) : []),
        [approvalProcess, activeLanguage],
    );

    const [hoverMark, setHoverMark] = useState<{mark: QuoteMarkInfo; rect: DOMRect} | null>(null);
    const [openMark, setOpenMark] = useState<QuoteMarkInfo | null>(null);
    const [marksPanelOpen, setMarksPanelOpen] = useState(false);

    useEffect(() => {
        setHoverMark(null);
        setOpenMark(null);
    }, [activeLanguage]);

    const handleJumpToMark = (mark: QuoteMarkInfo) => {
        setSearchQuery(mark.text);
        setMarksPanelOpen(false);
    };

    const activeFileId = activeLanguage === "tid"
        ? redaction.tidFileId
        : activeLanguage === "approvalSheet"
            ? redaction.approvalSheetFileId
            : activeLanguage === "disagreementMatrix"
                ? redaction.disagreementMatrixFileId
                : redaction[LANG_FILE_KEYS[activeLanguage]] as number | null;

    const handleDownloadActive = () => {
        if (activeFileId === null) return;
        const name = activeLanguage === "tid"
            ? `${redaction.code}_ТИД.docx`
            : activeLanguage === "approvalSheet"
                ? `${redaction.code}_Лист_согласования.docx`
                : activeLanguage === "disagreementMatrix"
                    ? `${redaction.code}_Матрица_разногласий.docx`
                    : buildRedactionFileName(redaction.code, vnd.name, activeLanguage);
        onDownload(activeFileId, name);
    };

    // @ts-ignore
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div
                className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center gap-4 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex flex-none items-center gap-3 min-w-0">
                        <span
                            className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <FileText size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {redaction.code}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                {onInsertQuote
                                    ? "Выделите текст — появится кнопка «Сослаться на выделенное»"
                                    : "Просмотр редакции"}
                            </div>
                        </div>
                    </div>

                    {/* растягивается и занимает всё свободное место между заголовком и кнопками */}
                    <div className="min-w-0 flex-1">
                        <SearchBar
                            variant="white"
                            placeholder="Поиск по тексту редакции…"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onSubmit={() => textViewRef.current?.goNext()}
                        />
                    </div>

                    <div className="flex flex-none items-center gap-4">
                        {availableViews.length > 1 && (
                            <div className="flex flex-none gap-1 rounded-[8px] bg-[#f2f5f9] p-[3px]">
                                {availableViews.map((lang) => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => setActiveLanguage(lang)}
                                        className="h-7 cursor-pointer rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors"
                                        style={
                                            activeLanguage === lang
                                                ? {
                                                    background: "#fff",
                                                    color: "#4e57d6",
                                                    boxShadow: "0 1px 2px rgba(15,27,45,.08)"
                                                }
                                                : {color: "#5d616c"}
                                        }
                                    >
                                        {LANG_LABELS[lang]}
                                    </button>
                                ))}
                            </div>
                        )}

                        <Tooltip content="Содержание документа" side="bottom">
                            <button
                                type="button"
                                onClick={() => {
                                    setContentsOpen((v) => !v);
                                    setMarksPanelOpen(false);
                                }}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border transition-colors"
                                style={
                                    contentsOpen
                                        ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                        : {borderColor: "#d7dee8", background: "#fff", color: "#3a4560"}
                                }
                            >
                                <ListTree size={16}/>
                            </button>
                        </Tooltip>

                        {approvalProcess && (
                            <Tooltip content="Комментарии — цитаты из резолюций согласующих" side="bottom">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMarksPanelOpen((v) => !v);
                                        setContentsOpen(false);
                                    }}
                                    disabled={quoteMarks.length === 0}
                                    className="relative cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    style={
                                        marksPanelOpen
                                            ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                            : {borderColor: "#d7dee8", background: "#fff", color: "#3a4560"}
                                    }
                                >
                                    <MessageSquareText size={16}/>
                                    {quoteMarks.length > 0 && (
                                        <span
                                            className="absolute -top-[5px] -right-[5px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#4e57d6] px-[3px] text-[9.5px] font-bold text-white"
                                        >
                                            {quoteMarks.length}
                                        </span>
                                    )}
                                </button>
                            </Tooltip>
                        )}

                        <Tooltip content="Скачать документ" side="bottom">
                            <button
                                type="button"
                                disabled={activeFileId === null || downloadingId === activeFileId}
                                onClick={handleDownloadActive}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === activeFileId ? (
                                    <Loader2 size={16} className="animate-spin"/>
                                ) : (
                                    <Download size={16}/>
                                )}
                            </button>
                        </Tooltip>

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-6 py-4">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <RedactionTextView
                            ref={textViewRef}
                            vnd={vnd}
                            selected={redaction}
                            activeLanguage={activeLanguage}
                            downloadingId={downloadingId}
                            onDownload={onDownload}
                            searchQuery={searchQuery}
                            onClearSearch={() => setSearchQuery("")}
                            quoteMarks={quoteMarks}
                            quoteMarksClickable={quoteMarksClickable}
                            onHoverQuoteMark={(mark, rect) => setHoverMark(mark && rect ? {mark, rect} : null)}
                            onClickQuoteMark={(mark) => setOpenMark(mark)}
                        />
                    </div>

                    {contentsOpen && (
                        <div className="w-[280px] flex-none">
                            <RedactionContentsPanel
                                fileId={activeFileId}
                                getContainer={() => textViewRef.current?.getContainer() ?? null}
                                onClose={() => setContentsOpen(false)}
                                maxHeightClass="h-full"
                            />
                        </div>
                    )}

                    {marksPanelOpen && (
                        <div className="flex h-full w-[300px] flex-none flex-col overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                            <div className="flex flex-none items-center justify-between border-b border-[#eef2f7] px-3.5 py-3">
                                <span className="text-[12.5px] font-bold text-[#1c2740]">
                                    Комментарии к тексту ({quoteMarks.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setMarksPanelOpen(false)}
                                    className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]"
                                >
                                    <X size={16}/>
                                </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
                                {quoteMarks.length === 0 ? (
                                    <div className="px-2 py-3 text-center text-[12px] text-[#a3adbd]">
                                        На этой вкладке пока нет цитат из резолюций
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        {quoteMarks.map((mark) => (
                                            <button
                                                key={mark.id}
                                                type="button"
                                                onClick={() => handleJumpToMark(mark)}
                                                className="cursor-pointer flex flex-col gap-1 rounded-[9px] border border-[#e9edf3] bg-[#fbfcfe] px-2.5 py-2 text-left hover:border-[#4e57d6]/40 hover:bg-white"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[8.5px] font-bold text-[#4e57d6]">
                                                        {getInitials(mark.approverName)}
                                                    </span>
                                                    <span className="truncate text-[11.5px] font-semibold text-[#26324a]">
                                                        {mark.approverName}
                                                    </span>
                                                </span>
                                                <span className="line-clamp-2 text-[11px] leading-snug text-[#6b7488]">
                                                    «{mark.text}»
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {hoverMark && (
                <div
                    style={{top: hoverMark.rect.bottom + 6, left: hoverMark.rect.left}}
                    className="pointer-events-none fixed z-[70] flex items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] bg-[#1c2740] px-2.5 py-[6px] text-[11.5px] font-medium text-white shadow-lg"
                >
                    <span className="font-semibold">{hoverMark.mark.approverName}</span>
                    <span className="text-[#a3adbd]">— {hoverMark.mark.phaseLabel.toLowerCase()}</span>
                    {quoteMarksClickable && <span className="text-[#a3adbd]">· клик — посмотреть</span>}
                </div>
            )}

            {openMark && (
                <CommentViewModal
                    {...quoteMarkModalProps(openMark)}
                    onClose={() => setOpenMark(null)}
                />
            )}

            {quoteHint && onInsertQuote && (
                <button
                    type="button"
                    // preventDefault на mousedown - иначе браузер снимает выделение текста
                    // раньше, чем успевает сработать onClick (selectionchange от клика по
                    // кнопке схлопывает selection и кнопка исчезает до самого клика).
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleInsertQuote}
                    style={{top: quoteHint.top + 8, left: quoteHint.left}}
                    className="fixed z-[60] flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#4e57d6] bg-[#4e57d6] px-3 py-[7px] text-[12px] font-semibold text-white shadow-lg hover:bg-[#3f47bd]"
                >
                    <Quote size={13}/>
                    Сослаться на выделенное
                </button>
            )}
        </div>,
        document.body
    );
}