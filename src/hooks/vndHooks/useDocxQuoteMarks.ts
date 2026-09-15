// Персистентная подсветка "маркером" цитат из резолюций согласующих внутри отрендеренного
// текста редакции (docx-preview) - см. QuoteMarkInfo/collectQuoteMarks. Устройство обхода DOM
// то же самое, что и в useDocxTextSearch (склеенный текст всех текстовых узлов + Range - см.
// domCrossNodeSearch) - только здесь подсветка не временная (по запросу поиска), а построена
// сразу по списку цитат, с наведением (кто оставил комментарий) и кликом (открыть резолюцию
// целиком).
//
// 14.09.2026 - у каждого согласующего теперь СВОЙ цвет (см. approverColors.ts), а не единая
// жёлтая подсветка на всех - иначе в тексте с несколькими замечаниями было не понять, кто что
// процитировал, не наводясь на каждый маркер по очереди. Заодно переписан сам алгоритм
// подсветки: раньше цитаты сортировались по убыванию длины и подсвечивались "кто первый занял
// текст, тот и владеет" (rejectTags=["MARK"] не давал более короткой/поздней цитате залезть на
// уже подсвеченное место) - то есть если два согласующих процитировали ОДНО И ТО ЖЕ место,
// второй просто не подсвечивался вовсе, и было незаметно, что там вообще есть ещё одна цитата.
// Теперь сначала ищутся позиции ВСЕХ цитат независимо друг от друга (см. buildOverlaySegments
// ниже), а затем документ размечается непересекающимися отрезками так, чтобы для каждого
// отрезка было точно известно МНОЖЕСТВО цитат, которые его накрывают - отрезок с одной цитатой
// красится в цвет её автора, отрезок с несколькими - диагональными полосками из цветов всех
// причастных (см. buildApproverBackground), а наведение/клик отдают ВЕСЬ список авторов этого
// места, а не произвольно выбранного одного.
import React, {useEffect, useRef} from "react";
import type {QuoteMarkInfo} from "@/utils/redactionQuoteMarks.ts";
import {buildTextMap, buildWhitespaceTolerantRegex, findFirstMatch, wrapSpan} from "@/utils/domCrossNodeSearch.ts";
import {buildApproverBackground, getApproverColor} from "@/utils/approverColors.ts";

const MARK_ATTR = "data-quote-mark-ids";

function clearMarks(root: HTMLElement) {
    root.querySelectorAll(`mark[${MARK_ATTR}]`).forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
    });
}

function createMarkEl(text: string, infos: QuoteMarkInfo[]): HTMLElement {
    const mark = document.createElement("mark");
    mark.setAttribute(MARK_ATTR, infos.map((i) => i.id).join(","));
    mark.textContent = text;
    const colors = infos.map((i) => getApproverColor(i.approverUserId));
    const background = buildApproverBackground(colors);
    // Нижняя граница - только когда цитата одна: для полосатого фона нескольких авторов свой
    // акцентный цвет уже виден в самих полосках, отдельная граница только замусорила бы вид.
    const borderBottom = colors.length === 1 ? `2px solid ${colors[0].accent}` : "none";
    mark.style.cssText = `
        background: ${background};
        color: inherit;
        border-radius: 3px;
        padding: 0 1px;
        border-bottom: ${borderBottom};
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        cursor: pointer;
        transition: filter 0.15s ease;
    `;
    return mark;
}

interface UseDocxQuoteMarksOptions {
    /** Кликабельны ли маркеры (открывают резолюцию) - только во время активного согласования
     * этой редакции (см. requirement "в тексте можно было кликнуть только при согласовании"). */
    clickable: boolean;
    /** Вызывается со ВСЕМИ цитатами, которые накрывают отрезок под курсором (обычно одна, но
     * может быть несколько - см. шапку файла) - пустой массив при уходе курсора. */
    onHoverMark: (marks: QuoteMarkInfo[], rect: DOMRect | null) => void;
    /** Как и onHoverMark - список из одной или нескольких цитат этого места; какую из них
     * показать (первую/дать выбрать) решает вызывающая сторона. */
    onClickMark: (marks: QuoteMarkInfo[]) => void;
}

interface OverlaySegment {
    start: number;
    end: number;
    infos: QuoteMarkInfo[];
}

function sameInfoSet(a: QuoteMarkInfo[], b: QuoteMarkInfo[]): boolean {
    if (a.length !== b.length) return false;
    const idsA = new Set(a.map((x) => x.id));
    return b.every((x) => idsA.has(x.id));
}

/** Ищет позиции всех цитат НЕЗАВИСИМО друг от друга (в отличие от старого алгоритма - без
 * "занял текст, дальше не лезь"), затем строит минимальный набор непересекающихся отрезков, для
 * каждого из которых точно известно множество накрывающих его цитат - см. подробности в шапке
 * файла. Соседние отрезки с одинаковым множеством цитат объединяются в один - иначе, например,
 * одна и та же цитата одного автора рисовалась бы несколькими <mark> без всякой причины. */
function buildOverlaySegments(
    map: ReturnType<typeof buildTextMap>, marks: QuoteMarkInfo[],
): OverlaySegment[] {
    const found: { start: number; end: number; info: QuoteMarkInfo }[] = [];
    for (const markInfo of marks) {
        const trimmed = markInfo.text.trim();
        if (!trimmed) continue;
        const regex = buildWhitespaceTolerantRegex(trimmed);
        if (!regex) continue;
        const m = findFirstMatch(map, regex);
        if (m) found.push({start: m.start, end: m.end, info: markInfo});
    }
    if (found.length === 0) return [];

    const boundarySet = new Set<number>();
    for (const f of found) {
        boundarySet.add(f.start);
        boundarySet.add(f.end);
    }
    const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

    const segments: OverlaySegment[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
        const segStart = boundaries[i];
        const segEnd = boundaries[i + 1];
        if (segEnd <= segStart) continue;
        const covering = found
            .filter((f) => f.start <= segStart && f.end >= segEnd)
            .map((f) => f.info);
        if (covering.length === 0) continue;

        const last = segments[segments.length - 1];
        if (last && last.end === segStart && sameInfoSet(last.infos, covering)) {
            last.end = segEnd;
        } else {
            segments.push({start: segStart, end: segEnd, infos: covering});
        }
    }
    return segments;
}

export function useDocxQuoteMarks(
    containerRef: React.RefObject<HTMLElement | null>,
    marks: QuoteMarkInfo[],
    ready: boolean,
    resetKey: string | number,
    options: UseDocxQuoteMarksOptions,
) {
    // Ключ - id цитаты, значение - сама цитата; используется при наведении/клике, чтобы по
    // id'шникам из data-quote-mark-ids собрать обратно список QuoteMarkInfo этого места.
    const infoByIdRef = useRef<Map<number, QuoteMarkInfo>>(new Map());
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const timeout = setTimeout(() => {
            clearMarks(root);
            infoByIdRef.current = new Map();

            if (!ready || marks.length === 0) return;

            const map = buildTextMap(root);
            const segments = buildOverlaySegments(map, marks);

            // От конца документа к началу - см. комментарий у wrapSpan в domCrossNodeSearch.
            for (let i = segments.length - 1; i >= 0; i--) {
                const seg = segments[i];
                const els = wrapSpan(map, seg.start, seg.end, (text) => createMarkEl(text, seg.infos));
                if (els.length > 0) {
                    for (const info of seg.infos) infoByIdRef.current.set(info.id, info);
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

        const findMark = (e: Event): {el: HTMLElement; infos: QuoteMarkInfo[]} | null => {
            const target = e.target as HTMLElement | null;
            const markEl = target?.closest?.(`mark[${MARK_ATTR}]`) as HTMLElement | null;
            if (!markEl) return null;
            const ids = (markEl.getAttribute(MARK_ATTR) ?? "")
                .split(",")
                .map((s) => Number(s))
                .filter((n) => !Number.isNaN(n));
            const infos = ids
                .map((id) => infoByIdRef.current.get(id))
                .filter((info): info is QuoteMarkInfo => !!info);
            if (infos.length === 0) return null;
            return {el: markEl, infos};
        };

        const handleOver = (e: Event) => {
            const found = findMark(e);
            if (!found) return;
            optionsRef.current.onHoverMark(found.infos, found.el.getBoundingClientRect());
        };
        const handleOut = (e: Event) => {
            const found = findMark(e);
            if (!found) return;
            optionsRef.current.onHoverMark([], null);
        };
        const handleClick = (e: Event) => {
            const found = findMark(e);
            if (!found || !optionsRef.current.clickable) return;
            optionsRef.current.onClickMark(found.infos);
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
