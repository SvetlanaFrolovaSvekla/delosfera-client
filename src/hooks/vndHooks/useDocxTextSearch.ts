import React, {useCallback, useEffect, useRef, useState} from "react";
import {buildWhitespaceTolerantRegex, highlightCrossNodeMatches} from "@/utils/domCrossNodeSearch.ts";

interface UseDocxTextSearchResult {
    matchCount: number;
    currentIndex: number; // -1, если совпадений нет
    goNext: () => void;
    goPrev: () => void;
}

const MATCH_ATTR = "data-search-hl";

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

// Поиск идёт по СКЛЕЕННОМУ тексту всех текстовых узлов документа (см. highlightCrossNodeMatches) -
// раньше совпадение искалось отдельно в каждом текстовом узле, из-за чего запрос, "разорванный"
// на границе двух узлов форматированием (например, часть искомой фразы выделена полужирным),
// вообще не находился ни разу. Заодно регулярка сделана нечувствительной к пробелам/переносам
// строк внутри запроса (buildWhitespaceTolerantRegex) - то же самое расхождение возникает, когда
// цитата приходит из window.getSelection() (см. "+ Сослаться на текст редакции"), а не набрана
// пользователем вручную в строке поиска.
function highlightAll(root: HTMLElement, query: string): HTMLElement[] {
    const regex = buildWhitespaceTolerantRegex(query);
    if (!regex) return [];
    return highlightCrossNodeMatches(root, regex, createMark).map((m) => m.el);
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
