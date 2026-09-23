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
//
// 23.09.2026 - место цитаты ищется по "якорю" (текст + контекст до/после + номер вхождения, см.
// utils/docxWork/quoteAnchor.ts), а не по первому совпадению текста: раньше цитата типовой фразы
// всегда подсвечивалась в первом её вхождении, а не там, куда сослался согласующий. Добавлены:
// - черновые (ещё не отправленные) замечания текущего пользователя - QuoteMarkInfo.isDraft,
//   рисуются пунктиром и не кликаются;
// - "фокус" на конкретной цитате (focus) - прокрутка к ней и пульсирующая обводка, используется
//   кнопками "Показать в тексте" вместо прежнего костыля через строку поиска;
// - снятие подсветки больше не уничтожает вложенную в неё подсветку поиска (unwrapHighlights).
import React, {useEffect, useRef} from "react";
import type {QuoteMarkInfo} from "@/utils/vndProcess/redactionQuoteMarks.ts";
import {buildTextMap, unwrapHighlights, wrapSpan} from "@/utils/docxWork/domCrossNodeSearch.ts";
import {resolveQuoteAnchor} from "@/utils/docxWork/quoteAnchor.ts";
import {buildApproverBackground, getApproverColor} from "@/utils/docxWork/approverColors.ts";
import {scrollElementIntoCenter} from "@/utils/docxWork/scrollElementIntoCenter.ts";

const MARK_ATTR = "data-quote-mark-ids";
const FOCUS_CLASS = "quote-mark-focused";
const FOCUS_DURATION_MS = 3600;

// Цвет черновых (ещё не отправленных) замечаний текущего пользователя - фирменный индиго,
// отличается от пастельной палитры согласующих (approverColors.ts).
const DRAFT_BG = "rgba(78, 87, 214, 0.12)";
const DRAFT_ACCENT = "#4e57d6";

function clearMarks(root: HTMLElement) {
    unwrapHighlights(root, `mark[${MARK_ATTR}]`);
}

function createMarkEl(text: string, infos: QuoteMarkInfo[]): HTMLElement {
    const mark = document.createElement("mark");
    mark.setAttribute(MARK_ATTR, infos.map((i) => i.id).join(","));
    mark.textContent = text;

    const saved = infos.filter((i) => !i.isDraft);
    const hasDraft = saved.length < infos.length;
    const colors = saved.map((i) => getApproverColor(i.approverUserId));

    // Фон - цвета сохранённых цитат (полосами, если их несколько); место, где есть только
    // черновое замечание, - светлый индиго.
    const background = colors.length > 0 ? buildApproverBackground(colors) : DRAFT_BG;
    // Нижняя граница: у черновика - пунктир (видно, что замечание ещё не отправлено); у одной
    // сохранённой цитаты - сплошная акцентного цвета её автора; у нескольких - без границы (цвета
    // и так видны в полосках).
    const borderBottom = hasDraft
        ? `2px dashed ${DRAFT_ACCENT}`
        : colors.length === 1 ? `2px solid ${colors[0].accent}` : "none";
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

/** Запрос "показать цитату в тексте": id цитаты (QuoteMarkInfo.id) + nonce - чтобы повторный
 * клик по той же самой цитате снова прокрутил к ней и мигнул, даже если id не изменился. */
export interface QuoteMarkFocusRequest {
    id: number;
    nonce: number;
}

interface UseDocxQuoteMarksOptions {
    /** Кликабельны ли маркеры (открывают резолюцию) - только во время активного согласования
     * этой редакции (см. requirement "в тексте можно было кликнуть только при согласовании").
     * На черновые замечания клик не действует никогда. */
    clickable: boolean;
    /** Вызывается со ВСЕМИ цитатами, которые накрывают отрезок под курсором (обычно одна, но
     * может быть несколько - см. шапку файла) - пустой массив при уходе курсора. */
    onHoverMark: (marks: QuoteMarkInfo[], rect: DOMRect | null) => void;
    /** Как и onHoverMark - список из одной или нескольких цитат этого места; какую из них
     * показать (первую/дать выбрать) решает вызывающая сторона. */
    onClickMark: (marks: QuoteMarkInfo[]) => void;
    /** Цитата, к которой нужно прокрутить и которую нужно "мигнуть" (см. QuoteMarkFocusRequest). */
    focus?: QuoteMarkFocusRequest | null;
    /** Итог запроса focus: found=false - цитату не удалось найти в тексте этого документа;
     * approximate=true - найдено приблизительное место (точного текста уже нет). */
    onFocusResult?: (result: {id: number; found: boolean; approximate: boolean}) => void;
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

/** Ищет позиции всех цитат НЕЗАВИСИМО друг от друга (каждую - по её якорю, см.
 * resolveQuoteAnchor), затем строит минимальный набор непересекающихся отрезков, для каждого
 * из которых точно известно множество накрывающих его цитат - см. подробности в шапке файла.
 * Соседние отрезки с одинаковым множеством цитат объединяются в один. approximateIds - цитаты,
 * найденные только приблизительно (точного текста в документе уже нет). */
function buildOverlaySegments(
    map: ReturnType<typeof buildTextMap>, marks: QuoteMarkInfo[],
): {segments: OverlaySegment[]; approximateIds: Set<number>} {
    const found: { start: number; end: number; info: QuoteMarkInfo }[] = [];
    const approximateIds = new Set<number>();
    for (const markInfo of marks) {
        const resolved = resolveQuoteAnchor(map, markInfo);
        if (!resolved) continue;
        found.push({start: resolved.start, end: resolved.end, info: markInfo});
        if (!resolved.exact) approximateIds.add(markInfo.id);
    }
    if (found.length === 0) return {segments: [], approximateIds};

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
    return {segments, approximateIds};
}

/** Ключ набора цитат по СОДЕРЖИМОМУ, а не по ссылке на массив - родитель пересобирает массив
 * при каждой перезагрузке процесса согласования, и без этого вся подсветка перерисовывалась бы
 * заново (а вместе с ней мигала бы и сбивалась прокрутка) даже когда ничего не поменялось. */
function marksKey(marks: QuoteMarkInfo[]): string {
    return marks
        .map((m) => [m.id, m.isDraft ? 1 : 0, m.text, m.prefix ?? "", m.suffix ?? "", m.occurrence ?? "", m.approverUserId, m.note ?? ""].join("\u0001"))
        .join("\u0002");
}

function markIds(el: Element): number[] {
    return (el.getAttribute(MARK_ATTR) ?? "")
        .split(",")
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n));
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
    const approximateIdsRef = useRef<Set<number>>(new Set());
    const optionsRef = useRef(options);
    optionsRef.current = options;
    // Ключ (набор цитат + документ), для которого подсветка уже нарисована - по нему эффект
    // фокуса понимает, можно ли уже искать <mark> нужной цитаты или надо дождаться отрисовки.
    const [renderedKey, setRenderedKey] = React.useState<string | null>(null);
    const key = marksKey(marks);
    const fullKey = `${resetKey}::${key}`;

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const timeout = setTimeout(() => {
            clearMarks(root);
            infoByIdRef.current = new Map();
            approximateIdsRef.current = new Set();

            const current = marks;
            if (!ready) {
                setRenderedKey(null);
                return;
            }
            if (current.length > 0) {
                const map = buildTextMap(root);
                const {segments, approximateIds} = buildOverlaySegments(map, current);
                approximateIdsRef.current = approximateIds;

                // От конца документа к началу - см. комментарий у wrapSpan в domCrossNodeSearch.
                for (let i = segments.length - 1; i >= 0; i--) {
                    const seg = segments[i];
                    const els = wrapSpan(map, seg.start, seg.end, (text) => createMarkEl(text, seg.infos));
                    if (els.length > 0) {
                        for (const info of seg.infos) infoByIdRef.current.set(info.id, info);
                    }
                }
            }
            setRenderedKey(fullKey);
        }, 150);

        return () => clearTimeout(timeout);
        // key - содержимое набора цитат (см. marksKey), resetKey - как и в useDocxTextSearch,
        // форсирует пересчёт при смене редакции/языка.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, ready, resetKey, containerRef]);

    // Фокус на цитате: ждём, пока подсветка для текущего набора цитат/документа будет нарисована
    // (renderedKey === fullKey), затем прокручиваем к первому фрагменту цитаты и подсвечиваем её
    // целиком пульсирующей обводкой. Один и тот же запрос (nonce) обрабатывается один раз.
    const handledNonceRef = useRef<number | null>(null);
    const focus = options.focus ?? null;
    useEffect(() => {
        const root = containerRef.current;
        if (!root || !focus || !ready || renderedKey !== fullKey) return;
        if (handledNonceRef.current === focus.nonce) return;
        handledNonceRef.current = focus.nonce;

        const els = Array.from(root.querySelectorAll<HTMLElement>(`mark[${MARK_ATTR}]`))
            .filter((el) => markIds(el).includes(focus.id));

        if (els.length === 0) {
            optionsRef.current.onFocusResult?.({id: focus.id, found: false, approximate: false});
            return;
        }

        root.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => el.classList.remove(FOCUS_CLASS));
        els.forEach((el) => el.classList.add(FOCUS_CLASS));
        scrollElementIntoCenter(els[0]);
        optionsRef.current.onFocusResult?.({
            id: focus.id, found: true, approximate: approximateIdsRef.current.has(focus.id),
        });

        const timer = setTimeout(() => {
            els.forEach((el) => el.classList.remove(FOCUS_CLASS));
        }, FOCUS_DURATION_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focus?.id, focus?.nonce, ready, renderedKey, fullKey, containerRef]);

    // Наведение и клик - через делегирование на контейнере (а не по одному слушателю на каждый
    // <mark>), т.к. сами <mark>-элементы пересоздаются при каждом пересчёте подсветки выше.
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const findMark = (e: Event): {el: HTMLElement; infos: QuoteMarkInfo[]} | null => {
            const target = e.target as HTMLElement | null;
            const markEl = target?.closest?.(`mark[${MARK_ATTR}]`) as HTMLElement | null;
            if (!markEl) return null;
            const infos = markIds(markEl)
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
            // Черновые замечания открывать нечего - резолюция ещё не отправлена.
            const saved = found.infos.filter((i) => !i.isDraft);
            if (saved.length === 0) return;
            optionsRef.current.onClickMark(saved);
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
