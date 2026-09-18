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
} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {buildRedactionFileName} from "@/utils/downloadFiles/fileNaming.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Download, Eye, EyeOff, FileText, Highlighter, ListTree, Loader2, MessageSquareText, Quote, X} from "lucide-react";
import {
    collectAllStageCommentsForRevision, collectQuoteMarksForRevision, quoteMarkModalProps, type QuoteMarkInfo
} from "@/utils/vndProcess/redactionQuoteMarks.ts";
import {CommentViewModal} from "./CommentViewModal.tsx";
import {getInitials} from "@/utils/namingUsers/getInitials.ts";
import {getApproverColor} from "@/utils/docxWork/approverColors.ts";
import {buildRevisionRedaction, getLiveRevisionIndex, listRevisions} from "@/utils/vndProcess/redactionRevisions.ts";

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
    /** Открыть модалку сразу на этой версии документа редакции (0 - самая первая "Р1", 1 -
     * "Р1.1" и т.д. - см. utils/vndProcess/redactionRevisions.ts) - используется переходом
     * "Показать в тексте" по цитате из СТАРОЙ версии (см. VndCoordinationTab.handleShowQuoteInText),
     * чтобы открыть именно ту версию, к которой относится цитата, а не текущую живую. Без этого
     * пропа (или без approvalProcess) модалка всегда открывается на живой/текущей версии. */
    initialRevisionIndex?: number;
}

/** Позиция плавающей кнопки "Сослаться на выделенное" в координатах viewport - модалка сама
 * зафиксирована на весь экран, поэтому fixed-позиционирование по rect выделения работает как
 * есть, без пересчёта относительно какого-либо контейнера. */
interface QuoteHint {
    text: string;
    top: number;
    left: number;
}

// Порядок фаз согласования - для группировки панели "Комментарии" и подписи активной подсветки
// (см. commentsByPhase/highlightedPhase ниже). Значения совпадают со строками phaseLabel,
// которые проставляют collectQuoteMarks/collectAllStageComments в redactionQuoteMarks.ts.
const PHASE_ORDER = ["Первичное согласование", "Повторное согласование", "Финальная выдержка"] as const;

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
                                       initialRevisionIndex,
                                   }: RedactionViewModalProps) {
    // Версии документа этой редакции ("Р1", "Р1.1", "Р1.2"... - см. listRevisions) - доступны
    // только вместе с approvalProcess (сами данные о версиях приходят внутри него) и никогда в
    // режиме цитирования (onInsertQuote) - процитировать имеет смысл только живой/текущий
    // документ, на который согласующие ещё среагируют.
    const revisions = approvalProcess && !onInsertQuote ? listRevisions(approvalProcess, redaction) : [];
    const [revisionIndex, setRevisionIndex] = useState<number>(
        () => initialRevisionIndex ?? (approvalProcess ? getLiveRevisionIndex(approvalProcess) : 0)
    );
    // Подстраховка на случай переиспользования того же экземпляра модалки под новый вызов
    // "Показать в тексте" (тот же приём, что и для initialSearchQuery выше).
    const prevInitialRevisionIndexRef = useRef(initialRevisionIndex);
    useEffect(() => {
        if (initialRevisionIndex !== prevInitialRevisionIndexRef.current) {
            prevInitialRevisionIndexRef.current = initialRevisionIndex;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (initialRevisionIndex !== undefined) setRevisionIndex(initialRevisionIndex);
        }
    }, [initialRevisionIndex]);
    // "Эффективная" редакция для отображения - с файлами выбранной версии вместо живых (см.
    // buildRevisionRedaction) - используется везде ниже вместо redaction напрямую.
    const effectiveRedaction = approvalProcess
        ? buildRevisionRedaction(approvalProcess, redaction, revisionIndex)
        : redaction;
    const isPastRevision = revisions.length > 1 && revisionIndex < getLiveRevisionIndex(approvalProcess!);
    const availableLanguages = getAvailableLanguages(effectiveRedaction);
    // ТИД и Лист согласования доступны как отдельные "вкладки" просмотра наравне с языками,
    // только если у выбранной версии редакции вообще есть соответствующий файл.
    const availableViews: RedactionViewTarget[] = [
        ...availableLanguages,
        ...(effectiveRedaction.tidFileId !== null ? (["tid"] as const) : []),
        ...(effectiveRedaction.approvalSheetFileId !== null ? (["approvalSheet"] as const) : []),
        ...(effectiveRedaction.disagreementMatrixFileId !== null ? (["disagreementMatrix"] as const) : []),
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
    // Запрос, который нужно подставить в поиск СРАЗУ ПОСЛЕ программного переключения вкладки
    // (см. jumpToQuoteInText ниже) - без этого эффект ниже (реагирующий на смену activeLanguage)
    // затирал бы только что вставленный searchQuery пустой строкой в тот же момент, когда
    // переключалась вкладка: setActiveLanguage(...) и setSearchQuery(item.text) вызывались
    // синхронно одним обработчиком, React батчит оба обновления в один рендер, но эффект
    // "сбросить поиск при смене вкладки" всё равно срабатывает следом и обнулял бы только что
    // подставленную цитату - именно поэтому раньше "цитата вставляется в поисковую строку и
    // почему-то так не ищется" (баг проявлялся именно при переходе с одной вкладки на другую).
    const pendingJumpQueryRef = useRef<string | null>(null);
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        if (pendingJumpQueryRef.current !== null) {
            setSearchQuery(pendingJumpQueryRef.current);
            pendingJumpQueryRef.current = null;
            return;
        }
        setSearchQuery("");
    }, [activeLanguage, redaction.id, revisionIndex]);

    // Подстраховка: если проп initialSearchQuery изменился, а вкладка при этом НЕ переключилась
    // (тот случай выше это уже покрывает через pendingJumpQueryRef) - например, родитель когда-
    // нибудь переиспользует этот же экземпляр модалки под новый вызов "Показать в тексте" вместо
    // полного размонтирования - подхватываем новое значение явно, а не полагаемся только на
    // исходный useState(initialSearchQuery), который читается ОДИН РАЗ при монтировании и не
    // видит последующих изменений пропа. Сравниваем с предыдущим ЗНАЧЕНИЕМ пропа (не с текущим
    // searchQuery) - иначе ручной ввод в строке поиска после открытия каждый раз откатывался бы
    // назад к initialSearchQuery.
    const prevInitialSearchQueryRef = useRef(initialSearchQuery);
    useEffect(() => {
        if (initialSearchQuery !== prevInitialSearchQueryRef.current) {
            prevInitialSearchQueryRef.current = initialSearchQuery;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (initialSearchQuery) setSearchQuery(initialSearchQuery);
        }
    }, [initialSearchQuery]);

    // Плавающая кнопка "Сослаться на выделенное" - только в режиме цитирования (onInsertQuote
    // передан). Слушаем selectionchange на document (а не mouseup только на контейнере) - так
    // ловим и выделение с клавиатуры (Shift+стрелки), а не только мышью.
    const [quoteHint, setQuoteHint] = useState<QuoteHint | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // Цитаты/комментарии ТОЛЬКО выбранной версии документа (revisionIndex) - при просмотре
    // живой версии совпадает с тем, что раньше давали collectQuoteMarks/collectAllStageComments
    // (сервер уже фильтрует "живые" поля по текущей версии), а при просмотре прошлой версии
    // ("Р1.1" и т.п.) показывает именно её собственные замечания, не смешивая с более поздними -
    // см. utils/vndProcess/redactionQuoteMarks.ts.
    const quoteMarks = useMemo(
        () => (approvalProcess ? collectQuoteMarksForRevision(approvalProcess, activeLanguage, revisionIndex) : []),
        [approvalProcess, activeLanguage, revisionIndex],
    );

// Какого этапа комментарии сейчас подсвечиваются поверх текста документа - null означает
// "подсветка не ограничена одним этапом". По умолчанию - последний этап, у которого есть
// комментарии. Объявлено здесь (до displayedQuoteMarks), а не ниже рядом с commentsByPhase -
// иначе useMemo ниже обращался бы к highlightedPhase до её инициализации (TDZ).
    const [highlightedPhase, setHighlightedPhase] = useState<string | null>(() => {
        if (!approvalProcess) return null;
        const comments = collectAllStageCommentsForRevision(approvalProcess, revisionIndex);
        for (let i = PHASE_ORDER.length - 1; i >= 0; i--) {
            if (comments.some((c) => c.phaseLabel === PHASE_ORDER[i])) return PHASE_ORDER[i];
        }
        return null;
    });
    // Сброс ограничения подсветки при смене версии - "этап" прошлой версии не обязательно
    // существует у новой выбранной.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHighlightedPhase(null);
    }, [revisionIndex]);

    const displayedQuoteMarks = useMemo(
        () => (highlightedPhase ? quoteMarks.filter((m) => m.phaseLabel === highlightedPhase) : quoteMarks),
        [quoteMarks, highlightedPhase], // добавлен highlightedPhase
    );

    const allComments = useMemo(
        () => (approvalProcess ? collectAllStageCommentsForRevision(approvalProcess, revisionIndex) : []),
        [approvalProcess, revisionIndex],
    );

    const commentsByPhase = useMemo(() => {
        const map = new Map<string, QuoteMarkInfo[]>();
        for (const item of allComments) {
            const list = map.get(item.phaseLabel);
            if (list) list.push(item);
            else map.set(item.phaseLabel, [item]);
        }
        return map;
    }, [allComments]);
    const phasesWithComments = PHASE_ORDER.filter((label) => (commentsByPhase.get(label)?.length ?? 0) > 0);

    // Комментарий инициатора о внесённых исправлениях (см. ResubmitAfterRevisionAsync на бэке) -
    // раньше был виден только на вкладке "Маршрут согласования" (VndApprovalSummary), а при
    // просмотре самой редакции (эта модалка) в панели "Комментарии" не показывался вовсе, хотя
    // логически он такой же комментарий к этой редакции, как и резолюции согласующих.
    const hasInitiatorComment = !!approvalProcess?.repeatInitiatorComment;
    const commentsCount = allComments.length + (hasInitiatorComment ? 1 : 0);
    const [initiatorCommentOpen, setInitiatorCommentOpen] = useState(false);

    // marks - ВСЕ цитаты, которые накрывают отрезок под курсором/по клику (обычно одна, но
    // может быть несколько, если разные согласующие процитировали одно и то же место - см.
    // useDocxQuoteMarks). Если их несколько - подряд идущие клики по этому же месту открывают
    // их ПО ОЧЕРЕДИ (см. handleClickMark ниже), а не только самого первого автора.
    const [hoverMark, setHoverMark] = useState<{marks: QuoteMarkInfo[]; rect: DOMRect} | null>(null);
    const [openMark, setOpenMark] = useState<QuoteMarkInfo | null>(null);
    const [marksPanelOpen, setMarksPanelOpen] = useState(false);
    // Кнопка "глаз" рядом с "Содержание"/"Комментарии"/"Скачать" - временно выключает подсветку
    // цитат согласующих в тексте (и, соответственно, подсказки при наведении на неё) - на случай,
    // когда цветные маркеры и всплывающие тултипы мешают спокойно читать сам текст редакции.
    // Ничего не удаляет - просто не рисует (см. quoteMarks ниже - при выключении в
    // RedactionTextView уходит пустой массив, и useDocxQuoteMarks сам снимает уже нарисованные
    // маркеры). Показываем кнопку только когда маркерам вообще есть из чего берись - т.е. вместе
    // с approvalProcess, как и кнопку "Комментарии" рядом.
    const [quoteMarksVisible, setQuoteMarksVisible] = useState(true);
    // На выключении подсветки маркеры убираются программно (не настоящим уходом курсора мышью),
    // поэтому mouseout может не сработать - без этого подсказка при наведении могла бы "зависнуть"
    // на экране поверх уже погашенной подсветки.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!quoteMarksVisible) setHoverMark(null);
    }, [quoteMarksVisible]);
    // Для места с несколькими пересекшимися цитатами - какую по счёту показали в прошлый раз
    // (ключ - отсортированные id всех цитат этого места), чтобы следующий клик по тому же месту
    // открыл СЛЕДУЮЩЕГО автора, а не всегда одного и того же.
    const overlapCycleRef = useRef<Map<string, number>>(new Map());

    const handleClickMark = (marks: QuoteMarkInfo[]) => {
        if (marks.length === 0) return;
        if (marks.length === 1) {
            setOpenMark(marks[0]);
            return;
        }
        const key = marks.map((m) => m.id).sort((a, b) => a - b).join(",");
        const prevIdx = overlapCycleRef.current.get(key) ?? -1;
        const nextIdx = (prevIdx + 1) % marks.length;
        overlapCycleRef.current.set(key, nextIdx);
        setOpenMark(marks[nextIdx]);
    };

    useEffect(() => {
        setHoverMark(null);
        setOpenMark(null);
    }, [activeLanguage]);

    // Клик по элементу панели "Комментарии" ВСЕГДА открывает резолюцию целиком в CommentViewModal
    // (как и обычный комментарий без цитаты) - раньше комментарий С цитатой вместо этого сразу
    // подставлял её в поиск и закрывал панель, из-за чего нельзя было посмотреть полный текст
    // резолюции, а сам поиск к тому же не срабатывал (см. pendingJumpQueryRef выше). Переход "к
    // месту в тексте" теперь отдельное действие - кнопка "Показать в тексте" внутри модалки
    // (см. jumpToQuoteInText и рендер CommentViewModal ниже).
    const handleCommentClick = (item: QuoteMarkInfo) => {
        setOpenMark(item);
        setMarksPanelOpen(false);
    };

    // Переключает вкладку документа (если нужно) и подставляет текст цитаты в поиск - вызывается
    // кнопкой-лупой "Показать в тексте" рядом с КАЖДОЙ цитатой внутри CommentViewModal (см.
    // FormattedResolutionComment.onShowInText) - резолюция может ссылаться на несколько мест в
    // тексте, поэтому принимает конкретную цитату, а не резолюцию целиком. Закрывает саму
    // модалку резолюции - иначе она перекрывает подсвеченный в документе текст.
    const jumpToQuoteInText = (quote: {documentTarget: string; text: string}) => {
        if (!quote.text) return;
        setOpenMark(null);
        const target = quote.documentTarget as RedactionViewTarget;
        if (target !== activeLanguage) {
            pendingJumpQueryRef.current = quote.text;
            setActiveLanguage(target);
        } else {
            setSearchQuery(quote.text);
        }
    };

    const activeFileId = activeLanguage === "tid"
        ? effectiveRedaction.tidFileId
        : activeLanguage === "approvalSheet"
            ? effectiveRedaction.approvalSheetFileId
            : activeLanguage === "disagreementMatrix"
                ? effectiveRedaction.disagreementMatrixFileId
                : effectiveRedaction[LANG_FILE_KEYS[activeLanguage]] as number | null;

    const handleDownloadActive = () => {
        if (activeFileId === null) return;
        const name = activeLanguage === "tid"
            ? `${effectiveRedaction.code}_ТИД.docx`
            : activeLanguage === "approvalSheet"
                ? `${effectiveRedaction.code}_Лист_согласования.docx`
                : activeLanguage === "disagreementMatrix"
                    ? `${effectiveRedaction.code}_Матрица_разногласий.docx`
                    : buildRedactionFileName(effectiveRedaction.code, vnd.name, activeLanguage);
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
                                {effectiveRedaction.code}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                {onInsertQuote
                                    ? "Выделите текст — появится кнопка «Сослаться на выделенное»"
                                    : isPastRevision
                                        ? "Прошлая версия документа"
                                        : "Просмотр редакции"}
                            </div>
                        </div>
                    </div>

                    {/* Переключатель версий документа этой редакции ("Р1"/"Р1.1"/"Р1.2"...) -
                        только если версий больше одной (были повторные отправки после замечаний)
                        и это не режим цитирования (см. revisions выше). Позволяет просматривать
                        и версии, уже вытесненные исправлениями, во время активного согласования -
                        каждая со своими собственными замечаниями (см. quoteMarks/allComments
                        выше). */}
                    {revisions.length > 1 && (
                        <div className="flex flex-none flex-wrap items-center gap-1 rounded-[8px] bg-[#f2f5f9] p-[3px]">
                            {revisions.map((r) => (
                                <Tooltip key={r.revisionIndex} content={r.isLive ? "Текущая версия" : "Прошлая версия"} side="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setRevisionIndex(r.revisionIndex)}
                                        className="h-7 cursor-pointer whitespace-nowrap rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors"
                                        style={
                                            revisionIndex === r.revisionIndex
                                                ? {background: "#fff", color: "#4e57d6", boxShadow: "0 1px 2px rgba(15,27,45,.08)"}
                                                : {color: "#5d616c"}
                                        }
                                    >
                                        {r.label}
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    )}

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
                            <Tooltip content="Комментарии — все резолюции согласующих" side="bottom">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMarksPanelOpen((v) => !v);
                                        setContentsOpen(false);
                                    }}
                                    disabled={commentsCount === 0}
                                    className="relative cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    style={
                                        marksPanelOpen
                                            ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                            : {borderColor: "#d7dee8", background: "#fff", color: "#3a4560"}
                                    }
                                >
                                    <MessageSquareText size={16}/>
                                    {commentsCount > 0 && (
                                        <span
                                            className="absolute -top-[5px] -right-[5px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#4e57d6] px-[3px] text-[9.5px] font-bold text-white"
                                        >
                                            {commentsCount}
                                        </span>
                                    )}
                                </button>
                            </Tooltip>
                        )}

                        {approvalProcess && (
                            <Tooltip
                                content={quoteMarksVisible
                                    ? "Скрыть подсветку цитат согласующих"
                                    : "Показать подсветку цитат согласующих"}
                                side="bottom"
                            >
                                <button
                                    type="button"
                                    onClick={() => setQuoteMarksVisible((v) => !v)}
                                    className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border transition-colors"
                                    style={
                                        quoteMarksVisible
                                            ? {borderColor: "#d7dee8", background: "#fff", color: "#3a4560"}
                                            : {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                    }
                                >
                                    {quoteMarksVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
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
                        {/* Подпись, какого этапа комментарии сейчас подсвечены в тексте (см.
                            highlightedPhase выше и переключатели-"маркеры" в панели
                            "Комментарии" ниже) - видна независимо от того, открыта ли сама
                            панель, чтобы не забывалось, что подсветка сейчас ограничена одним
                            этапом. */}
                        {quoteMarksVisible && highlightedPhase && (
                            <div className="mb-2 flex flex-none items-center gap-1.5 self-start rounded-full border border-[#d7dee8] bg-[#f5f6fd] px-3 py-1 text-[11px] font-semibold text-[#4e57d6]">
                                <Highlighter size={12} className="flex-none"/>
                                Подсвечены комментарии этапа: {highlightedPhase}
                            </div>
                        )}
                        <RedactionTextView
                            ref={textViewRef}
                            vnd={vnd}
                            selected={effectiveRedaction}
                            activeLanguage={activeLanguage}
                            downloadingId={downloadingId}
                            onDownload={onDownload}
                            searchQuery={searchQuery}
                            onClearSearch={() => setSearchQuery("")}
                            quoteMarks={quoteMarksVisible ? displayedQuoteMarks : []}
                            quoteMarksClickable={quoteMarksClickable}
                            onHoverQuoteMark={(marks, rect) => setHoverMark(marks.length > 0 && rect ? {marks, rect} : null)}
                            onClickQuoteMark={handleClickMark}
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
                                    Комментарии ({commentsCount})
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
                                {commentsCount === 0 ? (
                                    <div className="px-2 py-3 text-center text-[12px] text-[#a3adbd]">
                                        По этому согласованию пока нет комментариев
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        {/* Комментарий инициатора о внесённых исправлениях - см. hasInitiatorComment
                                            выше. Показываем первым (это всегда самое свежее событие - комментарий
                                            появляется только при повторной отправке на согласование, т.е. позже
                                            любой резолюции текущего круга). */}
                                        {hasInitiatorComment && approvalProcess && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setInitiatorCommentOpen(true);
                                                    setMarksPanelOpen(false);
                                                }}
                                                className="cursor-pointer flex flex-col gap-1 rounded-[9px] border border-[#e9edf3] bg-[#fbfcfe] px-2.5 py-2 text-left hover:border-[#4e57d6]/40 hover:bg-white"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[8.5px] font-bold text-[#4e57d6]">
                                                        {getInitials(approvalProcess.initiatorName)}
                                                    </span>
                                                    <span className="truncate text-[11.5px] font-semibold text-[#26324a]">
                                                        {approvalProcess.initiatorName}
                                                    </span>
                                                    <span className="flex-none text-[9.5px] text-[#a3adbd]">
                                                        · инициатор
                                                    </span>
                                                </span>
                                                <span className="line-clamp-2 break-words text-[11px] leading-snug text-[#6b7488]">
                                                    {approvalProcess.repeatInitiatorComment}
                                                </span>
                                            </button>
                                        )}
                                        {/* Комментарии сгруппированы по этапам (Первичное/
                                            Повторное/Финальная выдержка) - у каждого этапа своя
                                            кнопка-"маркер", включающая подсветку в тексте только
                                            цитат ЭТОГО этапа (highlightedPhase выше). Повторный
                                            клик по уже активному этапу снимает ограничение -
                                            подсвечиваются цитаты всех этапов разом. */}
                                        {phasesWithComments.map((label) => {
                                            const isActive = highlightedPhase === label;
                                            return (
                                                <div key={label} className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between gap-2 px-0.5 pt-1 first:pt-0">
                                                        <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#a3adbd]">
                                                            {label}
                                                        </span>
                                                        <Tooltip
                                                            content={isActive
                                                                ? "Показывать цитаты всех этапов"
                                                                : "Подсветить в тексте только цитаты этого этапа"}
                                                            side="top"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => setHighlightedPhase((prev) => (prev === label ? null : label))}
                                                                className="cursor-pointer flex-none grid h-6 w-6 place-items-center rounded-[7px] border transition-colors"
                                                                style={
                                                                    isActive
                                                                        ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                                                        : {borderColor: "#e5e9f0", background: "#fff", color: "#a3adbd"}
                                                                }
                                                            >
                                                                <Highlighter size={12}/>
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                    {commentsByPhase.get(label)!.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => handleCommentClick(item)}
                                                            className="cursor-pointer flex flex-col gap-1 rounded-[9px] border border-[#e9edf3] bg-[#fbfcfe] px-2.5 py-2 text-left hover:border-[#4e57d6]/40 hover:bg-white"
                                                        >
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[8.5px] font-bold text-[#4e57d6]">
                                                                    {getInitials(item.approverName)}
                                                                </span>
                                                                <span className="truncate text-[11.5px] font-semibold text-[#26324a]">
                                                                    {item.approverName}
                                                                </span>
                                                            </span>
                                                            <span className="line-clamp-2 break-words text-[11px] leading-snug text-[#6b7488]">
                                                                {item.text ? `«${item.text}»` : item.comment}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Подсказка при наведении на подсветку цитаты - если это место процитировали
                НЕСКОЛЬКО согласующих (полосатая подсветка, см. useDocxQuoteMarks), перечисляем
                их ВСЕХ, каждого своей точкой цвета, а не только первого - иначе было бы не
                понять, кто именно ещё сослался на этот же фрагмент. */}
            {hoverMark && (
                <div
                    style={{top: hoverMark.rect.bottom + 6, left: hoverMark.rect.left}}
                    className="pointer-events-none fixed z-[70] flex flex-col gap-1 rounded-[8px] border border-[#e5e9f0] bg-[#1c2740] px-2.5 py-[6px] text-[11.5px] font-medium text-white shadow-lg"
                >
                    {hoverMark.marks.map((m) => (
                        <div key={m.id} className="flex items-center gap-1.5 whitespace-nowrap">
                            <span
                                className="h-[7px] w-[7px] flex-none rounded-full"
                                style={{background: getApproverColor(m.approverUserId).accent}}
                            />
                            <span className="font-semibold">{m.approverName}</span>
                            <span className="text-[#a3adbd]">— {m.phaseLabel.toLowerCase()}</span>
                        </div>
                    ))}
                    {quoteMarksClickable && (
                        <span className="text-[#a3adbd]">
                            {hoverMark.marks.length > 1 ? "Клик по очереди — посмотреть каждого  " : "Клик — посмотреть"}
                        </span>
                    )}
                </div>
            )}

            {openMark && (
                <CommentViewModal
                    {...quoteMarkModalProps(openMark)}
                    onClose={() => setOpenMark(null)}
                    // Кнопка-лупа "Показать в тексте" рисуется в CommentViewModal рядом с КАЖДОЙ
                    // цитатой резолюции (см. quotes из quoteMarkModalProps выше) - только если у
                    // этой резолюции вообще есть хоть одна цитата, иначе показывать в тексте нечего.
                    onShowInText={openMark.allQuotes.length > 0 ? jumpToQuoteInText : undefined}
                />
            )}

            {initiatorCommentOpen && approvalProcess && (
                <CommentViewModal
                    title="См. комментарий полностью"
                    approverName={approvalProcess.initiatorName}
                    approverUserId={approvalProcess.initiatorUserId}
                    comment={approvalProcess.repeatInitiatorComment ?? ""}
                    attachments={approvalProcess.repeatInitiatorCommentAttachments}
                    onClose={() => setInitiatorCommentOpen(false)}
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