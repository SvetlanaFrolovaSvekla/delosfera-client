import React, {useCallback, useEffect, useRef, useState} from "react";
import {buildWhitespaceTolerantRegex, debugNoMatch, highlightCrossNodeMatches} from "@/utils/docxWork/domCrossNodeSearch.ts";
import {scrollElementIntoCenter} from "@/utils/docxWork/scrollElementIntoCenter.ts";

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
//
// Каждое совпадение возвращается как ГРУППА из одного или НЕСКОЛЬКИХ <mark> (см.
// CrossNodeMatch.els в highlightCrossNodeMatches) - несколько, когда совпадение пересекает
// границу абзаца/ячейки таблицы. matchCount/currentIndex ниже считают ГРУППЫ (логические
// совпадения), а не отдельные <mark> - иначе, например, "1 / 2" превращалось бы в "1 / 5", если
// одна длинная цитата задела 4 соседних абзаца.
function highlightAll(root: HTMLElement, query: string): HTMLElement[][] {
    const regex = buildWhitespaceTolerantRegex(query);
    if (!regex) return [];
    return highlightCrossNodeMatches(root, regex, createMark).map((m) => m.els);
}

export function useDocxTextSearch(
    containerRef: React.RefObject<HTMLElement | null>,
    query: string,
    ready: boolean,
    resetKey: string | number,
): UseDocxTextSearchResult {
    // Один элемент массива - одно ЛОГИЧЕСКОЕ совпадение, которое может состоять из нескольких
    // соседних <mark> (см. highlightAll/CrossNodeMatch.els) - когда цитата пересекает границу
    // абзаца/ячейки таблицы. Стилизуем/сбрасываем ВСЕ <mark> группы разом, чтобы такое
    // совпадение подсвечивалось целиком, а не только своим первым фрагментом.
    const matchesRef = useRef<HTMLElement[][]>([]);
    const [matchCount, setMatchCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(-1);

    const applyCurrent = useCallback((index: number) => {
        matchesRef.current.forEach((group) => {
            group.forEach((m) => {
                m.style.background = "#fdeacb";
                m.style.boxShadow = "none";
                m.style.color = "#8a5a12";
            });
        });
        const current = matchesRef.current[index];
        if (current) {
            current.forEach((m) => {
                m.style.background = "#4e57d6";
                m.style.color = "#ffffff";
                m.style.boxShadow = "0 0 0 3px #ececfc";
            });
            // Скроллим к первому фрагменту группы - для совпадения внутри одного абзаца это и
            // есть единственный фрагмент, для протяжённой цитаты - её начало.
            //
            // ⚠ 14.09.2026: раньше здесь был двойной requestAnimationFrame перед голым
            // target.scrollIntoView(...) - пользователь подтвердил, что этого недостаточно (см.
            // scrollElementIntoCenter.ts за разбором настоящей причины - подгружаемые шрифты
            // docx и отдельный таймер подсветки маркеров согласующих продолжают менять раскладку
            // ПОСЛЕ первого кадра отрисовки). scrollElementIntoCenter сам повторяет попытку
            // несколько раз подряд, каждый раз заново измеряя геометрию.
            const target = current[0];
            if (target) {
                scrollElementIntoCenter(target);
            }
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
            // Временная диагностика "Совпадений нет" - пишет в консоль браузера (F12), почему
            // запрос не нашёлся (пробелы/переносы vs реально другой текст) - см. domCrossNodeSearch.
            // Ничего не меняет в поведении поиска, можно убрать после того, как разберёмся с багом.
            if (matches.length === 0) debugNoMatch(root, trimmed);
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
