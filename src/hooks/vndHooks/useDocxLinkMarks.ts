// Подсветка ссылок на другие ВНД, прикреплённых к фрагментам текста редакции ("Добавить
// ссылку" → "С упоминанием в тексте"), и "лупа" - прокрутка к месту ссылки с короткой
// пульсацией. Устройство то же, что и у маркеров цитат согласующих (useDocxQuoteMarks): место
// ищется по "якорю" (текст + контекст + номер вхождения, см. quoteAnchor.ts), пересекающиеся
// ссылки режутся на непересекающиеся отрезки, наведение/клик - делегированием на контейнере.
//
// Два вида меток:
// - side = "source" - ЭТОТ документ в этом месте ссылается на другой ВНД (индиго, сплошное
//   подчёркивание и значок ссылки в конце фрагмента);
// - side = "target" - другой ВНД ссылается ИМЕННО на этот фрагмент этого документа (зелёная
//   пунктирная подсветка).
// Легаси-ссылки db://documents/{код} (isrib) подсвечивать не нужно - это и так гиперссылки в
// тексте (см. useDocxLegacyLinks); для них хук умеет только "лупу" - найти саму гиперссылку.
import React, {useEffect, useRef, useState} from "react";
import {buildTextMap, unwrapHighlights, wrapSpan} from "@/utils/docxWork/domCrossNodeSearch.ts";
import {resolveQuoteAnchor} from "@/utils/docxWork/quoteAnchor.ts";
import {scrollElementIntoCenter} from "@/utils/docxWork/scrollElementIntoCenter.ts";
import {parseLegacyHref, normalizeLegacyCode, type VndLinkSide} from "@/utils/vndProcess/vndLinkNavigation.ts";
import {LEGACY_LINK_CODE_ATTR, LEGACY_LINK_TYPE_ATTR} from "@/hooks/vndHooks/useDocxLegacyLinks.ts";

const MARK_ATTR = "data-vnd-link-keys";
const FOCUS_CLASS = "vnd-link-focused";
const FOCUS_DURATION_MS = 3600;

export interface DocLinkMark {
    /** id связи (VndLinkItem.id) */
    linkId: number;
    side: VndLinkSide;
    kind: "manual" | "legacy";
    /** Якорь фрагмента (для kind = "manual") */
    text?: string | null;
    prefix?: string | null;
    suffix?: string | null;
    occurrence?: number | null;
    /** Для kind = "legacy" - код документа из гиперссылки db://documents/{код}. */
    legacyCode?: string | null;
    /** Документ на другом конце связи. */
    other: { vndId: number; code: string; title: string; status: string };
    /** Только для side = "source": ссылка ведёт на конкретное место целевого документа. */
    targetFragment?: string | null;
}

export interface DocLinkFocusRequest {
    linkId: number;
    side: VndLinkSide;
    nonce: number;
    /** Вместо связи - показать легаси-ссылку на вложение db://attachments/{n} (номер n). */
    legacyAttachmentIndex?: number;
}

export function docLinkMarkKey(m: Pick<DocLinkMark, "linkId" | "side">): string {
    return `${m.side}:${m.linkId}`;
}

interface Options {
    focus?: DocLinkFocusRequest | null;
    onFocusResult?: (result: { linkId: number; side: VndLinkSide; found: boolean; approximate: boolean }) => void;
    onHover?: (marks: DocLinkMark[], rect: DOMRect | null) => void;
    onClick?: (marks: DocLinkMark[]) => void;
    /** Адрес, куда ведёт ссылка "отсюда" (side = "source"): такой фрагмент оборачивается
     * настоящим <a href> - выглядит и ведёт себя как обычная ссылка (адрес в строке состояния
     * браузера, Ctrl/⌘+клик и средняя кнопка - в новой вкладке, "Открыть в новой вкладке" в
     * контекстном меню). null/не задан - обычная подсветка <mark>. */
    hrefFor?: (mark: DocLinkMark) => string | null;
}

interface Segment {
    start: number;
    end: number;
    marks: DocLinkMark[];
}

function marksKey(marks: DocLinkMark[]): string {
    return marks
        .map((m) => [docLinkMarkKey(m), m.kind, m.text ?? "", m.prefix ?? "", m.suffix ?? "", m.occurrence ?? "", m.legacyCode ?? ""].join("\u0001"))
        .join("\u0002");
}

function createMarkEl(text: string, marks: DocLinkMark[], hrefFor?: (mark: DocLinkMark) => string | null): HTMLElement {
    const source = marks.find((m) => m.side === "source");
    const href = source && hrefFor ? hrefFor(source) : null;
    let el: HTMLElement;
    if (href) {
        // Ссылка "отсюда" на другой ВНД - настоящий <a>, как любая ссылка в тексте.
        const a = document.createElement("a");
        a.href = href;
        // Иначе выделить мышью часть текста внутри ссылки нельзя - браузер начинает тащить ссылку.
        a.draggable = false;
        el = a;
    } else {
        el = document.createElement("mark");
    }
    el.setAttribute(MARK_ATTR, marks.map(docLinkMarkKey).join(","));
    el.textContent = text;
    el.className = source ? "vnd-link-mark vnd-link-mark-source" : "vnd-link-mark vnd-link-mark-target";
    return el;
}

function buildSegments(map: ReturnType<typeof buildTextMap>, marks: DocLinkMark[]) {
    const found: { start: number; end: number; mark: DocLinkMark }[] = [];
    const approximate = new Set<string>();
    for (const m of marks) {
        if (m.kind !== "manual" || !m.text) continue;
        const resolved = resolveQuoteAnchor(map, {text: m.text, prefix: m.prefix, suffix: m.suffix, occurrence: m.occurrence});
        if (!resolved) continue;
        found.push({start: resolved.start, end: resolved.end, mark: m});
        if (!resolved.exact) approximate.add(docLinkMarkKey(m));
    }
    const bounds = Array.from(new Set(found.flatMap((f) => [f.start, f.end]))).sort((a, b) => a - b);
    const segments: Segment[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
        const start = bounds[i];
        const end = bounds[i + 1];
        const covering = found.filter((f) => f.start <= start && f.end >= end).map((f) => f.mark);
        if (covering.length === 0) continue;
        const last = segments[segments.length - 1];
        const sameSet = last && last.end === start && last.marks.length === covering.length
            && covering.every((c) => last.marks.includes(c));
        if (sameSet) last.end = end;
        else segments.push({start, end, marks: covering});
    }
    // Где заканчивается каждая ссылка - последний отрезок помечается классом vnd-link-mark-end
    // (зацепка для стилей, если понадобится отметить конец ссылки).
    const ends = new Set(found.map((f) => f.end));
    return {segments, approximate, ends};
}

function markKeysOf(el: Element): string[] {
    return (el.getAttribute(MARK_ATTR) ?? "").split(",").filter(Boolean);
}

/** Находит в тексте легаси-гиперссылку db://documents/{code} или db://attachments/{n} - по
 * data-атрибутам, которые проставляет useDocxLegacyLinks (он же подменяет сам href), либо, если
 * ссылка ещё не оформлена, по исходному href. */
function findLegacyAnchor(root: HTMLElement, type: "documents" | "attachments", code: string): HTMLElement | null {
    const normalized = normalizeLegacyCode(code);
    const anchors = Array.from(root.querySelectorAll<HTMLElement>("a"));
    return anchors.find((a) => {
        const markedType = a.getAttribute(LEGACY_LINK_TYPE_ATTR);
        if (markedType) return markedType === type && a.getAttribute(LEGACY_LINK_CODE_ATTR) === normalized;
        const parsed = parseLegacyHref(a.getAttribute("href"));
        return parsed?.type === type && parsed.id === normalized;
    }) ?? null;
}

export function useDocxLinkMarks(
    containerRef: React.RefObject<HTMLElement | null>,
    marks: DocLinkMark[],
    ready: boolean,
    resetKey: string | number,
    options: Options = {},
) {
    const byKeyRef = useRef<Map<string, DocLinkMark>>(new Map());
    const approximateRef = useRef<Set<string>>(new Set());
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const [renderedKey, setRenderedKey] = useState<string | null>(null);

    const key = marksKey(marks);
    const fullKey = `${resetKey}::${key}`;

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const timeout = setTimeout(() => {
            unwrapHighlights(root, `[${MARK_ATTR}]`);
            byKeyRef.current = new Map(marks.map((m) => [docLinkMarkKey(m), m]));
            approximateRef.current = new Set();
            if (!ready) {
                setRenderedKey(null);
                return;
            }
            const anchored = marks.filter((m) => m.kind === "manual" && m.text);
            if (anchored.length > 0) {
                const map = buildTextMap(root);
                const {segments, approximate, ends} = buildSegments(map, anchored);
                approximateRef.current = approximate;
                // С конца документа к началу - см. wrapSpan в domCrossNodeSearch.
                for (let i = segments.length - 1; i >= 0; i--) {
                    const seg = segments[i];
                    const els = wrapSpan(map, seg.start, seg.end, (text) => createMarkEl(text, seg.marks, optionsRef.current.hrefFor));
                    if (els.length > 0 && ends.has(seg.end)) els[els.length - 1].classList.add("vnd-link-mark-end");
                }
            }
            setRenderedKey(fullKey);
        }, 200);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, ready, resetKey, containerRef]);

    // "Лупа": прокрутить к ссылке и мигнуть ею. Ждём, пока подсветка для текущего документа
    // нарисована (renderedKey === fullKey); один и тот же запрос (nonce) - один раз.
    const handledNonceRef = useRef<number | null>(null);
    const focus = options.focus ?? null;
    useEffect(() => {
        const root = containerRef.current;
        if (!root || !focus || !ready || renderedKey !== fullKey) return;
        if (handledNonceRef.current === focus.nonce) return;

        // Ссылка на вложение - это не связь, в marks её нет: ищем саму гиперссылку в тексте.
        if (focus.legacyAttachmentIndex !== undefined) {
            handledNonceRef.current = focus.nonce;
            const anchor = findLegacyAnchor(root, "attachments", String(focus.legacyAttachmentIndex));
            if (!anchor) {
                optionsRef.current.onFocusResult?.({linkId: focus.linkId, side: focus.side, found: false, approximate: false});
                return;
            }
            root.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => el.classList.remove(FOCUS_CLASS));
            anchor.classList.add(FOCUS_CLASS);
            scrollElementIntoCenter(anchor);
            optionsRef.current.onFocusResult?.({linkId: focus.linkId, side: focus.side, found: true, approximate: false});
            const attachmentTimer = setTimeout(() => anchor.classList.remove(FOCUS_CLASS), FOCUS_DURATION_MS);
            return () => clearTimeout(attachmentTimer);
        }

        const focusKey = docLinkMarkKey(focus);
        const info = byKeyRef.current.get(focusKey);
        // Нужная ссылка ещё не пришла в marks (например, связи ещё грузятся) - подождём.
        if (!info) return;
        handledNonceRef.current = focus.nonce;

        let els: HTMLElement[] = Array.from(root.querySelectorAll<HTMLElement>(`[${MARK_ATTR}]`))
            .filter((el) => markKeysOf(el).includes(focusKey));
        if (els.length === 0 && info.kind === "legacy" && info.legacyCode) {
            const anchor = findLegacyAnchor(root, "documents", info.legacyCode);
            if (anchor) els = [anchor];
        }

        if (els.length === 0) {
            optionsRef.current.onFocusResult?.({linkId: focus.linkId, side: focus.side, found: false, approximate: false});
            return;
        }

        root.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => el.classList.remove(FOCUS_CLASS));
        els.forEach((el) => el.classList.add(FOCUS_CLASS));
        scrollElementIntoCenter(els[0]);
        optionsRef.current.onFocusResult?.({
            linkId: focus.linkId, side: focus.side, found: true, approximate: approximateRef.current.has(focusKey),
        });

        const timer = setTimeout(() => els.forEach((el) => el.classList.remove(FOCUS_CLASS)), FOCUS_DURATION_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focus?.linkId, focus?.side, focus?.nonce, focus?.legacyAttachmentIndex, ready, renderedKey, fullKey, containerRef]);

    // Наведение/клик - делегированием (сами <a>/<mark> пересоздаются при каждом пересчёте).
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const find = (e: Event): { el: HTMLElement; marks: DocLinkMark[] } | null => {
            const target = e.target as HTMLElement | null;
            const el = target?.closest?.(`[${MARK_ATTR}]`) as HTMLElement | null;
            if (!el) return null;
            const found = markKeysOf(el)
                .map((k) => byKeyRef.current.get(k))
                .filter((m): m is DocLinkMark => !!m);
            return found.length > 0 ? {el, marks: found} : null;
        };

        const onOver = (e: Event) => {
            const f = find(e);
            if (f) optionsRef.current.onHover?.(f.marks, f.el.getBoundingClientRect());
        };
        const onOut = (e: Event) => {
            if (find(e)) optionsRef.current.onHover?.([], null);
        };
        const onClick = (e: Event) => {
            const f = find(e);
            if (!f) return;
            const me = e as MouseEvent;
            // Ctrl/⌘/Shift+клик по настоящей ссылке - новая вкладка/окно, это браузер делает сам.
            if (f.el.tagName === "A" && (me.ctrlKey || me.metaKey || me.shiftKey)) return;
            // Обычный клик - переход внутри приложения (без перезагрузки) решает onClick.
            e.preventDefault();
            // Если пользователь выделяет текст (протащил мышь), клик не считается переходом.
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim()) return;
            optionsRef.current.onClick?.(f.marks);
        };

        root.addEventListener("mouseover", onOver);
        root.addEventListener("mouseout", onOut);
        root.addEventListener("click", onClick);
        return () => {
            root.removeEventListener("mouseover", onOver);
            root.removeEventListener("mouseout", onOut);
            root.removeEventListener("click", onClick);
        };
    }, [containerRef, ready, resetKey]);
}
