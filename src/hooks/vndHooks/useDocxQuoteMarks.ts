// Персистентная подсветка "маркером" цитат из резолюций согласующих внутри отрендеренного
// текста редакции (docx-preview) - см. QuoteMarkInfo/collectQuoteMarks. Устройство обхода DOM
// то же самое, что и в useDocxTextSearch (TreeWalker по текстовым узлам, обёртка совпадения в
// <mark>) - только здесь подсветка не временная (по запросу поиска), а построена сразу по
// списку цитат, с наведением (кто оставил комментарий) и кликом (открыть резолюцию целиком).
//
// Известное ограничение (as-is, как и у useDocxTextSearch) - совпадение ищется только внутри
// ОДНОГО текстового узла: цитата, "разорванная" на несколько узлов из-за форматирования
// внутри абзаца (напр. частично полужирный фрагмент), подсвечена не будет.
import React, {useEffect, useRef} from "react";
import type {QuoteMarkInfo} from "@/utils/redactionQuoteMarks.ts";

const MARK_ATTR = "data-quote-mark-id";

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clearMarks(root: HTMLElement) {
    root.querySelectorAll(`mark[${MARK_ATTR}]`).forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
    });
}

function createMarkEl(text: string, id: number): HTMLElement {
    const mark = document.createElement("mark");
    mark.setAttribute(MARK_ATTR, String(id));
    mark.textContent = text;
    mark.style.cssText = `
        background: #fff29b;
        color: inherit;
        border-radius: 3px;
        padding: 0 1px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        cursor: pointer;
        transition: background 0.15s ease;
    `;
    return mark;
}

interface UseDocxQuoteMarksOptions {
    /** Кликабельны ли маркеры (открывают резолюцию) - только во время активного согласования
     * этой редакции (см. requirement "в тексте можно было кликнуть только при согласовании"). */
    clickable: boolean;
    onHoverMark: (mark: QuoteMarkInfo | null, rect: DOMRect | null) => void;
    onClickMark: (mark: QuoteMarkInfo) => void;
}

export function useDocxQuoteMarks(
    containerRef: React.RefObject<HTMLElement | null>,
    marks: QuoteMarkInfo[],
    ready: boolean,
    resetKey: string | number,
    options: UseDocxQuoteMarksOptions,
) {
    const marksByIdRef = useRef<Map<number, QuoteMarkInfo>>(new Map());
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const timeout = setTimeout(() => {
            clearMarks(root);
            marksByIdRef.current = new Map();

            if (!ready || marks.length === 0) return;

            // Более длинные цитаты подсвечиваем первыми - иначе короткая цитата, являющаяся
            // подстрокой более длинной, "перехватит" совпадение раньше своей очереди.
            const sorted = [...marks].sort((a, b) => b.text.length - a.text.length);

            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    const tag = node.parentElement?.tagName;
                    if (tag === "SCRIPT" || tag === "STYLE" || tag === "MARK") return NodeFilter.FILTER_REJECT;
                    return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                },
            });

            for (const markInfo of sorted) {
                const trimmed = markInfo.text.trim();
                if (!trimmed) continue;

                const regex = new RegExp(escapeRegExp(trimmed), "i");

                // Дерево нужно обходить заново на каждую цитату - предыдущая подсветка меняет
                // структуру DOM (текстовый узел заменяется на <mark> + соседние текстовые узлы).
                walker.currentNode = root;
                let node: Node | null;
                let found = false;
                while (!found && (node = walker.nextNode())) {
                    const textNode = node as Text;
                    const value = textNode.nodeValue ?? "";
                    const m = regex.exec(value);
                    if (!m) continue;

                    const frag = document.createDocumentFragment();
                    if (m.index > 0) frag.appendChild(document.createTextNode(value.slice(0, m.index)));
                    const markEl = createMarkEl(m[0], markInfo.id);
                    frag.appendChild(markEl);
                    const rest = value.slice(m.index + m[0].length);
                    if (rest) frag.appendChild(document.createTextNode(rest));

                    textNode.parentNode?.replaceChild(frag, textNode);
                    marksByIdRef.current.set(markInfo.id, markInfo);
                    found = true;
                }
            }
        }, 150);

        return () => clearTimeout(timeout);
        // resetKey - как и в useDocxTextSearch, форсирует пересчёт при смене редакции/языка.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marks, ready, resetKey, containerRef]);

    // Наведение и клик - через делегирование на контейнере (а не по одному слушателю на каждый
    // <mark>), т.к. сами <mark>-элементы пересоздаются при каждом пересчёте подсветки выше.
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const findMark = (e: Event): {el: HTMLElement; info: QuoteMarkInfo} | null => {
            const target = e.target as HTMLElement | null;
            const markEl = target?.closest?.(`mark[${MARK_ATTR}]`) as HTMLElement | null;
            if (!markEl) return null;
            const id = Number(markEl.getAttribute(MARK_ATTR));
            const info = marksByIdRef.current.get(id);
            if (!info) return null;
            return {el: markEl, info};
        };

        const handleOver = (e: Event) => {
            const found = findMark(e);
            if (!found) return;
            optionsRef.current.onHoverMark(found.info, found.el.getBoundingClientRect());
        };
        const handleOut = (e: Event) => {
            const found = findMark(e);
            if (!found) return;
            optionsRef.current.onHoverMark(null, null);
        };
        const handleClick = (e: Event) => {
            const found = findMark(e);
            if (!found || !optionsRef.current.clickable) return;
            optionsRef.current.onClickMark(found.info);
        };

        root.addEventListener("mouseover", handleOver);
        root.addEventListener("mouseout", handleOut);
        root.addEventListener("click", handleClick);
        return () => {
            root.removeEventListener("mouseover", handleOver);
            root.removeEventListener("mouseout", handleOut);
            root.removeEventListener("click", handleClick);
        };
    }, [containerRef]);
}
