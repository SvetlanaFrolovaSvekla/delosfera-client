// Модалка "Просмотр и сравнение редакций" — параллельный просмотр
// текста новой и предыдущей редакции ВНД,
// с подсветкой пословных различий между документами.
// Слева и справа редакцию можно поменять на любую другую из списка (выпадающий список с
// кодом и описанием редакции) - подписи "Новая редакция"/"Предыдущая редакция" при этом
// пересчитываются по номеру выбранной редакции, а не фиксированы за стороной, так что можно
// сравнить и две более старые редакции между собой.
import React, {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {ChevronDown, Columns2, Download, ListTree, Loader2, Table2, X, ZoomIn, ZoomOut} from "lucide-react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {
    RedactionTextView, type RedactionTextViewHandle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {
    RedactionContentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionContentsPanel.tsx";
import {
    getAvailableLanguages, getRedactionFileId, type RedactionLanguage
} from "@/utils/redactionLanguagePanelUtils.ts";
import {useDocxDiffHighlight} from "@/hooks/vndHooks/useDocxDiffHighlight.ts";

interface RedactionCompareModalProps {
    vnd: VndResponse;
    /** Все редакции этого ВНД - для выбора в выпадающих списках слева/справа. */
    redactions: VndRedactionResponse[];
    /** Редакция, которая по умолчанию открывается слева. */
    initialLeft: VndRedactionResponse;
    /** Редакция, которая по умолчанию открывается справа (обычно предыдущая по номеру). */
    initialRight: VndRedactionResponse;
    /** Если задано - id редакции, которая сейчас на согласовании: у неё подпись получает
     * эмфасис " (необходимо согласовать)", если она выбрана хоть с одной стороны (например, из
     * вкладки "Согласование"). Не задавайте, если у сравнения нет контекста согласования
     * (например, при открытии из вкладки "Редакции") - тогда эмфасис нигде не показывается. */
    reviewedRedactionId?: number;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

const LANG_LABELS: Record<RedactionLanguage, string> = {ru: "RU", kg: "KG", en: "EN"};

interface TextViewReadyState {
    ready: boolean;
    container: HTMLDivElement | null;
}

const NOT_READY: TextViewReadyState = {ready: false, container: null};

/** Опрашивает handle RedactionTextView, пока документ не отрендерится (isReady не даёт события,
 * только императивный метод — поэтому дожидаемся его коротким поллингом), и вместе с готовностью
 * забирает DOM-контейнер. Ref читается только внутри эффекта — не во время рендера. */
function useTextViewReady(
    handleRef: React.RefObject<RedactionTextViewHandle | null>,
    resetKey: string,
): TextViewReadyState {
    const [state, setState] = useState<TextViewReadyState>(NOT_READY);

    useEffect(() => {
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout>;

        const check = () => {
            if (cancelled) return;
            const handle = handleRef.current;
            // @ts-ignore
            if (handle?.isReady()) {
                setState({ready: true, container: handle.getContainer()});
            } else {
                setState(NOT_READY);
                timeoutId = setTimeout(check, 120);
            }
        };
        // Первая проверка тоже асинхронная — не вызываем setState синхронно в теле эффекта
        timeoutId = setTimeout(check, 0);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    return state;
}

/** Подпись колонки по номеру выбранной там редакции относительно другой стороны - "новая" не
 * закреплена за левой/правой стороной, а определяется по факту: у кого номер больше. Эмфасис
 * "(необходимо согласовать)" показывается только у реально согласуемой редакции (reviewedId),
 * если она выбрана хоть с одной стороны, и только когда reviewedId вообще задан. */
function columnLabel(
    selected: VndRedactionResponse,
    other: VndRedactionResponse,
    reviewedId: number | undefined,
): { label: string; labelEmphasis?: string } {
    const label = selected.number > other.number ? "Новая редакция" : "Предыдущая редакция";
    return {
        label,
        labelEmphasis: reviewedId !== undefined && selected.id === reviewedId ? " (необходимо согласовать)" : undefined,
    };
}

export function RedactionCompareModal({
                                          vnd, redactions, initialLeft, initialRight, reviewedRedactionId,
                                          downloadingId, onDownload, onClose,
                                      }: RedactionCompareModalProps) {
    // Какая редакция сейчас выбрана слева/справа - по умолчанию initialLeft/initialRight, но
    // можно поменять на любую другую через выпадающий список.
    const [leftId, setLeftId] = useState(initialLeft.id);
    const [rightId, setRightId] = useState(initialRight.id);

    const left = redactions.find((r) => r.id === leftId) ?? initialLeft;
    const right = redactions.find((r) => r.id === rightId) ?? initialRight;

    const leftAvailableLanguages = getAvailableLanguages(left);
    const rightAvailableLanguages = getAvailableLanguages(right);

    const [leftLanguage, setLeftLanguage] = useState<RedactionLanguage>(leftAvailableLanguages[0] ?? "ru");
    const [rightLanguage, setRightLanguage] = useState<RedactionLanguage>(rightAvailableLanguages[0] ?? "ru");

    // При смене редакции с какой-либо стороны - сбрасываем язык на первый доступный у новой
    // редакции (старый выбранный язык может там отсутствовать).
    useEffect(() => {
        setLeftLanguage(getAvailableLanguages(left)[0] ?? "ru");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leftId]);
    useEffect(() => {
        setRightLanguage(getAvailableLanguages(right)[0] ?? "ru");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rightId]);

    const leftHandleRef = useRef<RedactionTextViewHandle>(null);
    const rightHandleRef = useRef<RedactionTextViewHandle>(null);

    const leftState = useTextViewReady(leftHandleRef, `${left.id}-${leftLanguage}`);
    const rightState = useTextViewReady(rightHandleRef, `${right.id}-${rightLanguage}`);

    const diffStatus = useDocxDiffHighlight(
        rightState.container,
        leftState.container,
        rightState.ready,
        leftState.ready,
        `${right.id}-${rightLanguage}::${left.id}-${leftLanguage}`,
    );

    const leftMeta = columnLabel(left, right, reviewedRedactionId);
    const rightMeta = columnLabel(right, left, reviewedRedactionId);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-full max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Columns2 size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Просмотр и сравнение редакций
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {diffStatus === "computing" && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                                <Loader2 size={14} className="animate-spin"/>
                                Ищем различия…
                            </div>
                        )}
                        {diffStatus === "unavailable" && (
                            <div className="text-[12px] text-[#a3adbd]">
                                Документы слишком велики или сильно различаются — подсветка различий недоступна!
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-[#eef2f7]">
                    <CompareColumn
                        vnd={vnd}
                        redaction={left}
                        label={leftMeta.label}
                        labelEmphasis={leftMeta.labelEmphasis}
                        availableLanguages={leftAvailableLanguages}
                        activeLanguage={leftLanguage}
                        onLanguageChange={setLeftLanguage}
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        textViewRef={leftHandleRef}
                        redactions={redactions}
                        excludeId={rightId}
                        onRedactionChange={setLeftId}
                    />
                    <CompareColumn
                        vnd={vnd}
                        redaction={right}
                        label={rightMeta.label}
                        labelEmphasis={rightMeta.labelEmphasis}
                        availableLanguages={rightAvailableLanguages}
                        activeLanguage={rightLanguage}
                        onLanguageChange={setRightLanguage}
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        textViewRef={rightHandleRef}
                        redactions={redactions}
                        excludeId={leftId}
                        onRedactionChange={setRightId}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}

const TID_ZOOM_MIN = 50;
const TID_ZOOM_MAX = 200;
const TID_ZOOM_STEP = 25;

function CompareColumn({
                           vnd, redaction, label, labelEmphasis, availableLanguages, activeLanguage,
                           onLanguageChange, downloadingId, onDownload, textViewRef,
                           redactions, excludeId, onRedactionChange,
                       }: {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    label: string;
    labelEmphasis?: string;
    availableLanguages: RedactionLanguage[];
    activeLanguage: RedactionLanguage;
    onLanguageChange: (lang: RedactionLanguage) => void;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    textViewRef: React.RefObject<RedactionTextViewHandle | null>;
    /** Список редакций для выпадающего списка выбора (см. RedactionPicker). */
    redactions: VndRedactionResponse[];
    /** id редакции, выбранной с другой стороны - недоступен для выбора здесь же (иначе можно
     * было бы сравнить редакцию саму с собой). */
    excludeId: number;
    onRedactionChange: (id: number) => void;
}) {
    // ТИД этой редакции - у каждой из двух колонок своя кнопка "ТИД" и своё состояние (можно
    // открыть с обеих сторон одновременно, независимо друг от друга). Не отдельное окно поверх
    // панели, а делит саму эту колонку на две части: сверху ТИД (1/3 высоты, со своим скроллом
    // и масштабом), снизу - текст редакции, как обычно.
    const [tidOpen, setTidOpen] = useState(false);
    const [tidZoom, setTidZoom] = useState(100);
    const hasTid = redaction.tidFileId !== null;
    const showTid = tidOpen && hasTid;

    // Содержание документа этой колонки - как и ТИД, своя кнопка и своё состояние с каждой
    // стороны сравнения. В отличие от ТИД (делит колонку по высоте) показывается всплывающей
    // панелью поверх текста - оглавление не нужно держать развёрнутым постоянно, только пока
    // ищешь нужный раздел.
    const [contentsOpen, setContentsOpen] = useState(false);
    const activeFileId = getRedactionFileId(redaction, activeLanguage);

    return (
        <div className="relative flex min-h-0 flex-col overflow-hidden">
            <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3">
                <div className="min-w-0">
                    <RedactionPicker
                        redactions={redactions}
                        valueId={redaction.id}
                        excludeId={excludeId}
                        onChange={onRedactionChange}
                    />
                    <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                        {label}
                        {labelEmphasis && (
                            <span className="font-bold text-[#1c2740]">{labelEmphasis}</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-none items-center gap-2">
                    {availableLanguages.length > 1 && (
                        <div className="flex flex-none gap-1 rounded-[8px] bg-[#f2f5f9] p-[3px]">
                            {availableLanguages.map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => onLanguageChange(lang)}
                                    className="h-7 cursor-pointer rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors"
                                    style={
                                        activeLanguage === lang
                                            ? {background: "#fff", color: "#4e57d6", boxShadow: "0 1px 2px rgba(15,27,45,.08)"}
                                            : {color: "#5d616c"}
                                    }
                                >
                                    {LANG_LABELS[lang]}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setContentsOpen((v) => !v)}
                        disabled={activeFileId === null}
                        className="cursor-pointer inline-flex h-7 flex-none items-center justify-center gap-[5px] rounded-[7px] border px-[10px] text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        style={
                            contentsOpen
                                ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                : {borderColor: "#e5e9f0", background: "#fff", color: "#3a4560"}
                        }
                    >
                        <ListTree size={12} strokeWidth={2} className="flex-none"/>
                        Содержание
                    </button>

                    <button
                        type="button"
                        onClick={() => setTidOpen((v) => !v)}
                        disabled={!hasTid}
                        className="cursor-pointer inline-flex h-7 flex-none items-center justify-center gap-[5px] rounded-[7px] border px-[10px] text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        style={
                            showTid
                                ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                : {borderColor: "#e5e9f0", background: "#fff", color: "#3a4560"}
                        }
                    >
                        <Table2 size={12} strokeWidth={2} className="flex-none"/>
                        ТИД
                    </button>
                </div>
            </div>

            {contentsOpen && (
                <div className="absolute right-3 top-[64px] z-30 max-h-[calc(100%-80px)] w-[280px] overflow-hidden rounded-[14px] shadow-[0_14px_38px_rgba(20,25,40,0.22)]">
                    <RedactionContentsPanel
                        fileId={activeFileId}
                        getContainer={() => textViewRef.current?.getContainer() ?? null}
                        onClose={() => setContentsOpen(false)}
                        maxHeightClass="max-h-full"
                    />
                </div>
            )}

            {showTid && (
                <div className="flex h-1/3 flex-none flex-col overflow-hidden border-b border-[#eef2f7]">
                    <div className="flex flex-none items-center justify-between gap-3 bg-[#fbfcfe] px-4 py-2">
                        <div className="flex min-w-0 items-center gap-2 text-[12px] font-bold text-[#1c2740]">
                            <Table2 size={14} className="flex-none text-[#4e57d6]"/>
                            <span className="truncate">ТИД — {redaction.code}</span>
                        </div>
                        <div className="flex flex-none items-center gap-2">
                            <div className="flex items-center gap-1 rounded-[7px] border border-[#e5e9f0] bg-white px-1 py-[3px]">
                                <button
                                    type="button"
                                    onClick={() => setTidZoom((z) => Math.max(TID_ZOOM_MIN, z - TID_ZOOM_STEP))}
                                    disabled={tidZoom <= TID_ZOOM_MIN}
                                    className="cursor-pointer grid h-6 w-6 place-items-center rounded-[5px] text-[#8b97ab] hover:bg-[#f2f5f9] hover:text-[#4e57d6] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ZoomOut size={13}/>
                                </button>
                                <span className="w-[34px] text-center text-[11px] font-semibold text-[#5a6478]">
                                    {tidZoom}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setTidZoom((z) => Math.min(TID_ZOOM_MAX, z + TID_ZOOM_STEP))}
                                    disabled={tidZoom >= TID_ZOOM_MAX}
                                    className="cursor-pointer grid h-6 w-6 place-items-center rounded-[5px] text-[#8b97ab] hover:bg-[#f2f5f9] hover:text-[#4e57d6] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ZoomIn size={13}/>
                                </button>
                            </div>
                            <button
                                type="button"
                                disabled={downloadingId === redaction.tidFileId}
                                onClick={() => onDownload(redaction.tidFileId as number, `${redaction.code}_ТИД.docx`)}
                                className="cursor-pointer grid h-7 w-7 place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#f2f5f9] hover:text-[#4e57d6] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === redaction.tidFileId ? (
                                    <Loader2 size={14} className="animate-spin"/>
                                ) : (
                                    <Download size={14}/>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTidOpen(false)}
                                className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2">
                        {/* zoom - не стандартный CSS-свойством в строгом смысле, но поддерживается
                            всеми основными браузерами и, в отличие от transform: scale(), сохраняет
                            реальные (промасштабированные) размеры контента для скролла контейнера. */}
                        <div
                            className="flex min-h-0 flex-1 flex-col overflow-hidden"
                            style={{zoom: tidZoom / 100} as React.CSSProperties}
                        >
                            <RedactionTextView
                                vnd={vnd}
                                selected={redaction}
                                activeLanguage="tid"
                                downloadingId={downloadingId}
                                onDownload={onDownload}
                                scrollX
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
                <RedactionTextView
                    ref={textViewRef}
                    vnd={vnd}
                    selected={redaction}
                    activeLanguage={activeLanguage}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                />
            </div>
        </div>
    );
}

/** Кнопка с кодом текущей редакции ("10252-Р4") - открывает выпадающий список всех редакций
 * этого ВНД (код + описание), позволяя переключить, какая редакция показана в этой колонке. */
function RedactionPicker({
                             redactions, valueId, excludeId, onChange,
                         }: {
    redactions: VndRedactionResponse[];
    valueId: number;
    excludeId: number;
    onChange: (id: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    const current = redactions.find((r) => r.id === valueId);
    const sorted = [...redactions].sort((a, b) => b.number - a.number);

    return (
        <div ref={rootRef} className="relative inline-block">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="cursor-pointer -ml-1 inline-flex items-center gap-1 rounded-[6px] px-1 text-[13.5px] font-bold text-[#1c2740] hover:bg-[#f2f5f9]"
            >
                <span className="truncate">{current?.code ?? "—"}</span>
                <ChevronDown size={14} className="flex-none text-[#a3adbd]"/>
            </button>

            {open && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-[320px] w-[300px] overflow-y-auto rounded-[10px] border border-[#e5e9f0] bg-white py-1 shadow-[0_10px_30px_rgba(20,25,40,0.15)]">
                    {sorted.map((r) => {
                        const disabled = r.id === excludeId;
                        return (
                            <button
                                key={r.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                    onChange(r.id);
                                    setOpen(false);
                                }}
                                className="flex w-full cursor-pointer flex-col items-start gap-[2px] px-3 py-[7px] text-left hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                                style={r.id === valueId ? {background: "#ececfc"} : undefined}
                            >
                                <span className="text-[12.5px] font-bold text-[#1c2740]">{r.code}</span>
                                <span className="line-clamp-1 text-[11px] text-[#8b97ab]">
                                    {r.description || "Без описания"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
