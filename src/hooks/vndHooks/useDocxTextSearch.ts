import React, {useCallback, useEffect, useRef, useState} from "react";

interface UseDocxTextSearchResult {
    matchCount: number;
    currentIndex: number; // -1, если совпадений нет
    goNext: () => void;
    goPrev: () => void;
}

const MATCH_ATTR = "data-search-hl";

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clearHighlights(root: HTMLElement) {
    root.querySelectorAll(`mark[${MATCH_ATTR}]`).forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
    });
}


function createMark(text: string): HTMLElement {
    const mark = document.createElement("mark");
    mark.setAttribute(MATCH_ATTR, "");
    mark.textContent = text;
    mark.style.cssText = `
        background: #fdeacb;
        color: #8a5a12;
        border-radius: 4px;
        padding: 0 1px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        transition: background 0.15s ease, box-shadow 0.15s ease;
    `;
    return mark;
}

function highlightAll(root: HTMLElement, query: string): HTMLElement[] {
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");

    // Сначала собираем текстовые узлы — DOM трогаем только после обхода
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            const tag = node.parentElement?.tagName;
            if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
            return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
    });

    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) textNodes.push(n as Text);

    const matches: HTMLElement[] = [];

    for (const node of textNodes) {
        const value = node.nodeValue ?? "";
        regex.lastIndex = 0;
        if (!regex.test(value)) continue;
        regex.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(value))) {
            if (m.index > lastIndex) {
                frag.appendChild(document.createTextNode(value.slice(lastIndex, m.index)));
            }
            const mark = createMark(m[0]);
            frag.appendChild(mark);
            matches.push(mark);
            mark.setAttribute(MATCH_ATTR, "");
            mark.style.background = "#fde3c4";
            mark.style.color = "#8a4b00";
            mark.style.borderRadius = "3px";
            mark.textContent = m[0];
            frag.appendChild(mark);
            matches.push(mark);
            lastIndex = m.index + m[0].length;
            if (m.index === regex.lastIndex) regex.lastIndex++; // защита от зацикливания
        }
        if (lastIndex < value.length) {
            frag.appendChild(document.createTextNode(value.slice(lastIndex)));
        }

        node.parentNode?.replaceChild(frag, node);
    }

    return matches;
}

export function useDocxTextSearch(
    containerRef: React.RefObject<HTMLElement | null>,
    query: string,
    ready: boolean,
    resetKey: string | number,
): UseDocxTextSearchResult {
    const matchesRef = useRef<HTMLElement[]>([]);
    const [matchCount, setMatchCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(-1);

    const applyCurrent = useCallback((index: number) => {
        matchesRef.current.forEach((m) => {
            m.style.background = "#fdeacb";
            m.style.boxShadow = "none";
            m.style.color = "#8a5a12";
        });
        const current = matchesRef.current[index];
        if (current) {
            current.style.background = "#4e57d6";
            current.style.color = "#ffffff";
            current.style.boxShadow = "0 0 0 3px #ececfc";
            current.scrollIntoView({block: "center", behavior: "smooth"});
        }
    }, []);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        // debounce, чтобы не перестраивать DOM на каждый символ
        const timeout = setTimeout(() => {
            clearHighlights(root);
            matchesRef.current = [];

            const trimmed = query.trim();
            if (!ready || !trimmed) {
                setMatchCount(0);
                setCurrentIndex(-1);
                return;
            }

            const matches = highlightAll(root, trimmed);
            matchesRef.current = matches;
            setMatchCount(matches.length);
            const next = matches.length > 0 ? 0 : -1;
            setCurrentIndex(next);
            applyCurrent(next);
        }, 200);

        return () => clearTimeout(timeout);
        // resetKey (fileId+язык) заставляет пересчитать подсветку после смены редакции/языка
    }, [query, ready, resetKey, containerRef, applyCurrent]);

    const goNext = useCallback(() => {
        if (matchesRef.current.length === 0) return;
        setCurrentIndex((prev) => {
            const next = (prev + 1) % matchesRef.current.length;
            applyCurrent(next);
            return next;
        });
    }, [applyCurrent]);

    const goPrev = useCallback(() => {
        if (matchesRef.current.length === 0) return;
        setCurrentIndex((prev) => {
            const next = (prev - 1 + matchesRef.current.length) % matchesRef.current.length;
            applyCurrent(next);
            return next;
        });
    }, [applyCurrent]);

    return {matchCount, currentIndex, goNext, goPrev};
}