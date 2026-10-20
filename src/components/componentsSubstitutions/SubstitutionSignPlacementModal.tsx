// Выбор места подписи ЭЦП под приказом / договором МО заявки на замещение. Открывается перед подписанием:
// документ показывается так, как он будет выглядеть в версии «С подписями ЭЦП» (уже поставленные подписи —
// на своих местах), а блок подписи текущего подписанта едет за курсором и раздвигает текст, как вставка
// в Word. Ниже него — серые места следующих подписантов. Клик фиксирует место; «Подписать» — дальше
// обычное подписание ЭЦП (или тестовая имитация).
//
// Место = после какого абзаца текста (закладки dsa_N в макете с сервера) + отступ от левого поля в мм.
// В подписываемый хэш оно не входит: подписывается зафиксированный файл, место — только оформление.
import {useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {renderAsync} from "docx-preview";
import {FileSignature, FlaskConical, Loader2, MousePointerClick, X} from "lucide-react";
import {
    substitutionService,
    type SubstitutionSignerRole,
    type SubstitutionSignerSlot,
    type SubstitutionSigningDocument,
    type SubstitutionSignPlacement,
} from "@/service/substitutionService/substitutionService.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {SUB_DOCX_CLASS, SUB_DOCX_STYLES} from "./SubstitutionDocumentsViewer.tsx";

/** Как на сервере (SubstitutionDocuments): префикс закладок-якорей, ширина штампа, наибольший отступ. */
const ANCHOR_PREFIX = "dsa_";
const STAMP_WIDTH_MM = 75;
const MAX_INDENT_MM = 85;
/** Колонки строки подписи, мм — как SubstitutionDocuments.BlockWidthMm: подпись, штамп, дата. */
const LABEL_MM = {orderDirector: 30, ack: 35, liability: 28} as const;
const DATE_MM = 50;

function blockWidthMm(kind: SubstitutionSigningDocument["kind"], role: SubstitutionSignerRole): number {
    if (kind === "Order") return role === "Director" ? LABEL_MM.orderDirector + STAMP_WIDTH_MM : LABEL_MM.ack + STAMP_WIDTH_MM + DATE_MM;
    return LABEL_MM.liability + STAMP_WIDTH_MM + DATE_MM;
}
/** Курсор держит блок примерно за левую часть штампа, а не за самый край. */
const GRAB_MM = 12;

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «Фамилия И.О.» — как в строках подписей бланка (SubstitutionPrintService.Short). */
function shortFio(full: string | null | undefined): string {
    const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 3) return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
    if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
    return parts[0] ?? "—";
}

/** «20» октября 2026 г. */
function prettyDate(d: Date): string {
    return `«${String(d.getDate()).padStart(2, "0")}» ${MONTHS[d.getMonth()]} ${d.getFullYear()} г.`;
}

interface InsertPoint {
    anchor: number;
    /** Последний элемент группы абзаца (сам абзац и уже вставленные после него подписи). */
    el: HTMLElement;
}

interface Props {
    requestId: number;
    doc: SubstitutionSigningDocument;
    role: SubstitutionSignerRole;
    /** Тестовая имитация ЭЦП вместо подписи. */
    test?: boolean;
    onCancel: () => void;
    onConfirm: (placement: SubstitutionSignPlacement) => void;
}

export function SubstitutionSignPlacementModal({requestId, doc, role, test = false, onCancel, onConfirm}: Props) {
    const {t} = useTranslation();
    const areaRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Выбранное место — вставка в поток документа: блок раздвигает текст, как будет в готовом документе.
    const host = useMemo(() => {
        const el = document.createElement("div");
        el.className = "sub-sign-ghost";
        return el;
    }, []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [points, setPoints] = useState<InsertPoint[]>([]);
    const [pxPerMm, setPxPerMm] = useState(96 / 25.4);
    const [placement, setPlacement] = useState<SubstitutionSignPlacement | null>(null);
    // Под курсором — плавающий блок над линией вставки (текст не сдвигается, чтобы не прыгал под рукой).
    const [hover, setHover] = useState<(SubstitutionSignPlacement & { top: number; left: number; width: number }) | null>(null);
    const hoverDiffers = !!hover && (hover.anchor !== placement?.anchor || hover.indentMm !== placement?.indentMm);

    // Макет ЭЦП-версии с якорями: отрисовать и собрать места вставки.
    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);
        substitutionService.signingLayoutBlob(requestId, doc.id)
            .then(async (blob) => {
                const root = containerRef.current;
                if (cancelled || !root) return;
                root.innerHTML = "";
                await renderAsync(blob, root, undefined, {
                    className: SUB_DOCX_CLASS,
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    renderHeaders: true,
                    renderFooters: true,
                    experimental: true,
                });
                if (cancelled) return;
                const found = collectInsertPoints(root);
                const page = root.querySelector<HTMLElement>(`section.${SUB_DOCX_CLASS}`);
                if (page) setPxPerMm(page.getBoundingClientRect().width / 210);
                setPoints(found);
                // По умолчанию — в конце текста, как было бы без выбора.
                const last = found[found.length - 1];
                if (last) setPlacement({anchor: last.anchor, indentMm: 0});
            })
            .catch(() => {
                if (!cancelled) setError(t("substitutionSigning.placement.loadError"));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
            host.remove();
        };
    }, [requestId, doc.id, host, t]);

    // Поставить вставку в поток после группы выбранного абзаца.
    useLayoutEffect(() => {
        if (!placement) return;
        const point = points.find((p) => p.anchor === placement.anchor);
        if (!point) return;
        if (point.el.nextSibling !== host) point.el.after(host);
        host.style.marginLeft = `${placement.indentMm * pxPerMm}px`;
    }, [placement, points, host, pxPerMm]);

    // Пока курсор ищет другое место — выбранное приглушено.
    useLayoutEffect(() => {
        host.classList.toggle("dim", hoverDiffers);
    }, [host, hoverDiffers]);

    // Показать выбранное по умолчанию место (конец текста), когда документ отрисован.
    const scrolledRef = useRef(false);
    useEffect(() => {
        if (loading || !placement || scrolledRef.current) return;
        scrolledRef.current = true;
        requestAnimationFrame(() => host.scrollIntoView({block: "center"}));
    }, [loading, placement, host]);

    /**
     * Место под курсором: ближайшая линия вставки (низ группы абзаца) и отступ по горизонтали; плюс
     * координаты плавающего блока внутри области просмотра (она прокручивается вместе с ним).
     */
    function pick(clientX: number, clientY: number) {
        const area = areaRef.current;
        if (points.length === 0 || !area) return null;
        let best: InsertPoint | null = null;
        let bestY = 0;
        let bestDist = Infinity;
        for (const p of points) {
            const y = p.el.getBoundingClientRect().bottom;
            // У выбранного места линия вставки «растянута» на весь уже вставленный блок: курсор над
            // ним — это то же место, а не соседний абзац.
            const bottom = p.el.nextSibling === host ? host.getBoundingClientRect().bottom : y;
            const d = clientY < y ? y - clientY : clientY > bottom ? clientY - bottom : 0;
            if (d < bestDist) {
                bestDist = d;
                best = p;
                bestY = y;
            }
        }
        if (!best) return null;

        const articleRect = (best.el.parentElement ?? best.el).getBoundingClientRect();
        const mm = Math.round((clientX - articleRect.left) / pxPerMm - GRAB_MM);
        // Строка подписи не выходит за правое поле (то же ограничение на сервере).
        const maxIndent = Math.max(0, Math.min(MAX_INDENT_MM, Math.floor(articleRect.width / pxPerMm - blockWidthMm(doc.kind, role))));
        const indentMm = Math.max(0, Math.min(maxIndent, mm));
        const areaRect = area.getBoundingClientRect();
        return {
            anchor: best.anchor,
            indentMm,
            top: bestY - areaRect.top + area.scrollTop,
            left: articleRect.left - areaRect.left + area.scrollLeft,
            width: articleRect.width,
        };
    }

    const onMove = (e: MouseEvent) => {
        if (loading || error) return;
        const next = pick(e.clientX, e.clientY);
        if (next && (next.anchor !== hover?.anchor || next.indentMm !== hover?.indentMm || next.top !== hover?.top)) setHover(next);
    };
    const onClick = (e: MouseEvent) => {
        if (loading || error) return;
        const next = pick(e.clientX, e.clientY);
        if (next) {
            setPlacement({anchor: next.anchor, indentMm: next.indentMm});
            setHover(null);
        }
    };

    const isOrder = doc.kind === "Order";
    // Серые строки следующих подписантов шире — сдвигаем их влево, чтобы не уходили за поле.
    const contentMm = 165;
    const shownIndent = (hover && hoverDiffers ? hover.indentMm : placement?.indentMm) ?? 0;
    const roleSlot = doc.slots.find((s) => s.role === role);
    const ackSigned = doc.slots.some((s) => (s.role === "Absent" || s.role === "Substitute") && s.signature);
    // Следующие подписанты — серые места под блоком (как они встанут, если подпишут там же).
    const after = doc.slots.slice(doc.slots.findIndex((s) => s.role === role) + 1).filter((s) => !s.signature);
    let headerShown = ackSigned;
    const ghostBlocks: ReactNode[] = [roleSlot, ...after].filter(Boolean).map((slot, i) => {
        const s = slot as SubstitutionSignerSlot;
        const ack = isOrder && (s.role === "Absent" || s.role === "Substitute");
        const header = ack && !headerShown;
        if (ack) headerShown = true;
        return <GhostBlock key={s.role} kind={doc.kind} slot={s} active={i === 0} test={test} header={header}
                           shiftMm={Math.min(0, contentMm - shownIndent - blockWidthMm(doc.kind, s.role))}/>;
    });

    const hint = placement && !hover
        ? t("substitutionSigning.placement.hintChosen")
        : t("substitutionSigning.placement.hint");

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onCancel}>
            <style>{SUB_DOCX_STYLES + GHOST_STYLES}</style>
            <div onClick={(e) => e.stopPropagation()}
                 className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1100px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none items-center justify-between gap-3 px-6 pb-2 pt-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#e9f0ff] text-[#2f68f5]">
                            <FileSignature size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {t("substitutionSigning.placement.title")} · {doc.title}
                            </h2>
                            <div className="mt-[2px] text-[11.5px] font-medium text-[#8b97ab]">
                                {roleSlot?.roleTitle}{roleSlot?.userName ? ` — ${roleSlot.userName}` : ""}
                            </div>
                        </div>
                    </div>
                    <button onClick={onCancel} aria-label={t("substitutionCard.printPage.close")}
                            className="flex-none cursor-pointer border-none bg-transparent text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                {/* Высота подсказки постоянная: иначе смена текста сдвигала бы документ под курсором. */}
                <div className="mx-6 mb-2 flex min-h-[54px] flex-none items-center gap-2 rounded-[10px] border border-[#cbddff] bg-[#f5f8ff] px-3 py-2 text-[12.5px] leading-[1.45] text-[#2f4a8a]">
                    <MousePointerClick size={15} className="flex-none text-[#2f68f5]"/>
                    <span>{hint}</span>
                </div>

                <div ref={areaRef}
                     className="sub-docx-flat sub-sign-area relative mx-6 min-h-0 flex-1 overflow-auto rounded-[12px] bg-[#f1f3f7] p-4"
                     onMouseMove={onMove}
                     onMouseLeave={() => setHover(null)}
                     onClick={onClick}>
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#8b97ab]">
                            <Loader2 size={16} className="animate-spin"/> {t("substitutionCard.printPage.loading")}
                        </div>
                    )}
                    {error && <div className="p-8 text-center text-[13px] text-[#c0392b]">{error}</div>}
                    <div ref={containerRef} className={error ? "hidden" : ""}/>
                    {hover && hoverDiffers && (
                        <>
                            <div className="sub-sign-line" style={{top: hover.top, left: hover.left, width: hover.width}}/>
                            <div className="sub-sign-ghost floating"
                                 style={{top: hover.top, left: hover.left + hover.indentMm * pxPerMm}}>
                                {ghostBlocks}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-none flex-wrap items-center justify-end gap-2 px-6 pb-5 pt-3">
                    <SzButton size="sm" variant="muted" onClick={onCancel}>
                        {t("substitutionSigning.placement.cancel")}
                    </SzButton>
                    <SzButton size="sm" variant={test ? "warning" : "primary"}
                              icon={test ? <FlaskConical size={15}/> : <FileSignature size={15}/>}
                              disabled={loading || !!error || !placement}
                              onClick={() => placement && onConfirm(placement)}>
                        {test ? t("substitutionSigning.placement.confirmTest") : t("substitutionSigning.placement.confirm")}
                    </SzButton>
                </div>
            </div>
            {createPortal(<>{ghostBlocks}</>, host)}
        </div>,
        document.body,
    );
}

/**
 * Места вставки: для каждого абзаца текста (закладка dsa_N) — последний элемент его группы на листе
 * (сам абзац и подписи, уже поставленные после него), после него и встаёт новый блок.
 */
function collectInsertPoints(root: HTMLElement): InsertPoint[] {
    const last = new Map<number, HTMLElement>();
    root.querySelectorAll<HTMLElement>(`section.${SUB_DOCX_CLASS} > article`).forEach((article) => {
        let current: number | null = null;
        for (const child of Array.from(article.children) as HTMLElement[]) {
            const marker = child.id?.startsWith(ANCHOR_PREFIX) ? child
                : child.querySelector<HTMLElement>(`[id^="${ANCHOR_PREFIX}"]`);
            if (marker) {
                const n = Number(marker.id.slice(ANCHOR_PREFIX.length));
                if (Number.isFinite(n)) current = n;
            }
            if (current !== null) last.set(current, child);
        }
    });
    return [...last.entries()].sort((a, b) => a[0] - b[0]).map(([anchor, el]) => ({anchor, el}));
}

/** Блоки рисуются в единицах листа (мм, пт) — в масштабе документа, как их соберёт сервер. */
const GHOST_STYLES = `
.sub-sign-area { cursor: crosshair; }
.sub-sign-ghost { pointer-events: none; padding: 1px 0; transition: opacity .12s; }
.sub-sign-ghost.dim { opacity: .35; }
.sub-sign-ghost.floating { position: absolute; z-index: 2; padding: 0 2mm 1.5mm; margin-left: -2mm; background: rgba(255,255,255,.94);
  border-radius: 2mm; box-shadow: 0 6px 22px -10px rgba(15,27,45,.45); }
.sub-sign-line { position: absolute; z-index: 1; height: 0; border-top: 2px dashed #2f68f5; pointer-events: none; }
.sub-sign-ghost .g-line { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.25; margin: 0 0 1mm; white-space: pre; color: #000; }
.sub-sign-ghost .g-row { display: flex; align-items: center; margin: 0 0 1mm; }
.sub-sign-ghost .g-row > .g-line { margin: 0; flex: none; overflow: hidden; }
.sub-sign-ghost .g-row > .g-stamp { flex: none; margin: 0; }
.sub-sign-ghost .g-row > .g-date { padding-left: 2mm; }
.sub-sign-ghost .g-line.b { font-weight: 700; }
.sub-sign-ghost .g-first { margin-top: 3.5mm; }
.sub-sign-ghost .g-stamp { width: ${STAMP_WIDTH_MM}mm; box-sizing: border-box; margin: 1mm 0 0.7mm; padding: 1mm 1.5mm;
  border: 3px double #1F3A93; background: #F2F5FD; color: #1F3A93; text-align: center;
  font-family: Arial, sans-serif; font-size: 7pt; line-height: 1.3; }
.sub-sign-ghost .g-stamp .t { font-weight: 700; font-size: 7.5pt; }
.sub-sign-ghost .g-stamp .m { color: #7A869A; font-size: 6pt; }
.sub-sign-ghost .g-stamp.test { border-color: #B45309; color: #B45309; background: #FFF7ED; }
.sub-sign-ghost .g-block.active { animation: sub-sign-pulse 1.6s ease-in-out infinite; border-radius: 2mm; }
.sub-sign-ghost .g-block.pending .g-line { color: #A3ACBC; }
.sub-sign-ghost .g-block.pending .g-stamp { border: 1px dashed #A3ACBC; background: transparent; color: #A3ACBC; }
@keyframes sub-sign-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(47,104,245,0); } 50% { box-shadow: 0 0 0 2mm rgba(47,104,245,.10); } }
`;

function GhostBlock({kind, slot, active, test, header, shiftMm}: {
    kind: SubstitutionSigningDocument["kind"];
    slot: SubstitutionSignerSlot;
    active: boolean;
    test: boolean;
    header: boolean;
    /** Сдвиг влево (мм, ≤ 0), чтобы строка не уходила за правое поле. */
    shiftMm: number;
}) {
    const now = new Date();
    const date = active ? prettyDate(now) : "«____»__________ ____ г.";
    const stamp = active ? (
        <div className={`g-stamp ${test ? "test" : ""}`}>
            <div className="t">{test ? "ТЕСТОВАЯ ИМИТАЦИЯ ЭЦП" : "ПОДПИСАНО С ПОМОЩЬЮ ЭЦП"}</div>
            <div className="m">{test ? "не является подписью" : "облачная ЭЦП ГП «Инфоком» · подпись проверена"}</div>
            {slot.userName && <div className="t">Владелец: {slot.userName}</div>}
            <div>Подписано: {now.toLocaleString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"})}</div>
        </div>
    ) : (
        <div className="g-stamp">
            <div className="t">МЕСТО ДЛЯ ПОДПИСИ ЭЦП</div>
            <div>ожидает подписи</div>
        </div>
    );

    // Как на листе: заголовок (или отбивка), затем строка «подпись — штамп ЭЦП (— дата)» без черты.
    const label = kind === "Order"
        ? (slot.role === "Director" ? "Директор" : shortFio(slot.userName))
        : (slot.role === "Director" ? "Директор" : "Подпись");
    const labelMm = kind === "Order"
        ? (slot.role === "Director" ? LABEL_MM.orderDirector : LABEL_MM.ack)
        : LABEL_MM.liability;
    const withDate = !(kind === "Order" && slot.role === "Director");
    const title = kind === "Order"
        ? (header ? "Ознакомлены и согласны:" : null)
        : (slot.role === "Director" ? "Банк: ОАО «Керемет Банк»" : `Работник: ${slot.userName ?? "—"}`);
    const lines: ReactNode = (
        <>
            {title
                ? <div className={`g-line g-first ${kind === "Order" ? "" : "b"}`}>{title}</div>
                : <div className="g-first"/>}
            <div className="g-row">
                <div className={`g-line ${kind === "Order" && slot.role === "Director" ? "b" : ""}`} style={{width: `${labelMm}mm`}}>{label}</div>
                {stamp}
                {withDate && <div className="g-line g-date" style={{width: `${DATE_MM}mm`}}>{date}</div>}
            </div>
        </>
    );
    return <div className={`g-block ${active ? "active" : "pending"}`} style={shiftMm ? {marginLeft: `${shiftMm}mm`} : undefined}>{lines}</div>;
}
