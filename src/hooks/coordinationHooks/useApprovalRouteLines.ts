// Рисовка линий от этапов уже построенного маршрута к блокам нормативов (read-only версия useStageRouting)
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";

interface RouteItem {
    localId: string;
}

// Радиус скругления углов у линий-коннекторов (там, где линия сворачивает с вертикали на
// горизонталь) - без него ломанная из прямых L-сегментов выглядит "рублено"/криво, особенно
// когда таких линий много и они сходятся веером к одному блоку норматива снизу.
const CORNER_RADIUS = 10;

interface Point {
    x: number;
    y: number;
}

export interface EdgeFade {
    /** Есть ещё карточки левее видимой области - показываем затухание слева */
    start: boolean;
    /** Есть ещё карточки правее видимой области - показываем затухание справа */
    end: boolean;
}

const NO_EDGE_FADE: EdgeFade = {start: false, end: false};

// Строит ломаную из точек `points` в виде SVG-пути со скруглёнными углами (вместо резких
// изломов на L-командах): на каждом внутреннем повороте прямая обрезается на `radius` px до
// вершины, а сам угол проходится квадратичной кривой. Радиус сам ужимается вдвое от длины
// соседних отрезков, если они короче - иначе на совсем коротких сегментах кривая "вылезла" бы
// за пределы отрезка и путь бы самопересекался.
function roundedElbowPath(points: Point[], radius: number): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];

        const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);

        if (d1 === 0 || d2 === 0) continue;

        const r = Math.min(radius, d1 / 2, d2 / 2);
        const before = {
            x: curr.x + ((prev.x - curr.x) / d1) * r,
            y: curr.y + ((prev.y - curr.y) / d1) * r,
        };
        const after = {
            x: curr.x + ((next.x - curr.x) / d2) * r,
            y: curr.y + ((next.y - curr.y) / d2) * r,
        };

        d += ` L ${before.x} ${before.y} Q ${curr.x} ${curr.y} ${after.x} ${after.y}`;
    }

    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
}

export function useApprovalRouteLines<T extends RouteItem>(items: T[]) {
    const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const targetRef = useRef<HTMLDivElement | null>(null);
    const funnelWrapperRef = useRef<HTMLDivElement | null>(null);
    const cardsScrollRef = useRef<HTMLDivElement | null>(null);
    const [paths, setPaths] = useState<string[]>([]);
    // Какие края ряда карточек сейчас "обрезаны" скроллом - используется, чтобы аккуратно
    // притушить эти края градиентом (вместо того, чтобы карточка выглядела грубо обрезанной
    // ровно по границе блока), и только с той стороны, где действительно есть что скроллить.
    const [edgeFade, setEdgeFade] = useState<EdgeFade>(NO_EDGE_FADE);
    // true, если ряд карточек шире видимой области. Важно: контейнер центрирует карточки
    // (justify-content: center), пока они помещаются - но если оставить center и после того,
    // как они перестали помещаться, браузер не даёт проскроллить left/scrollLeft в отрицательную
    // область, поэтому та часть карточек, что "вылезла" ЗА левый край центрированного ряда,
    // становится недостижимой скроллом вообще (обрезана и не докрутить). Поэтому при overflow
    // выключаем центрирование и выравниваем ряд по левому краю - тогда весь ряд лежит в
    // scrollLeft от 0 до maxScrollLeft и любая карточка доскроллиуема.
    const [, setIsOverflowing] = useState(false);

    const recomputePaths = useCallback(() => {
        const wrapper = funnelWrapperRef.current;
        const target = targetRef.current;
        if (!wrapper || !target) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2 - wrapperRect.left;
        const targetTopY = targetRect.top - wrapperRect.top;

        let maxCardBottom = 0;
        const points: { x: number; bottom: number }[] = [];
        items.forEach((item) => {
            const el = stageRefs.current[item.localId];
            if (!el) return;
            const r = el.getBoundingClientRect();
            const x = r.left + r.width / 2 - wrapperRect.left;
            const bottom = r.bottom - wrapperRect.top;
            points.push({x, bottom});
            if (bottom > maxCardBottom) maxCardBottom = bottom;
        });

        const trunkY = maxCardBottom + 26;

        const next = points.map(({x, bottom}) =>
            roundedElbowPath(
                [
                    {x, y: bottom},
                    {x, y: trunkY},
                    {x: targetX, y: trunkY},
                    {x: targetX, y: targetTopY},
                ],
                CORNER_RADIUS,
            ),
        );
        setPaths(next);
    }, [items]);

    const recomputeEdgeFade = useCallback(() => {
        const el = cardsScrollRef.current;
        if (!el) return;
        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        if (maxScrollLeft <= 1) {
            setEdgeFade(NO_EDGE_FADE);
            setIsOverflowing(false);
            return;
        }
        setIsOverflowing(true);
        setEdgeFade({
            start: el.scrollLeft > 1,
            end: el.scrollLeft < maxScrollLeft - 1,
        });
    }, []);

    const recomputeAll = useCallback(() => {
        recomputePaths();
        recomputeEdgeFade();
    }, [recomputePaths, recomputeEdgeFade]);

    useLayoutEffect(() => {
        recomputeAll();

        const ro = new ResizeObserver(recomputeAll);
        if (funnelWrapperRef.current) ro.observe(funnelWrapperRef.current);
        if (cardsScrollRef.current) ro.observe(cardsScrollRef.current);

        window.addEventListener("resize", recomputeAll);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recomputeAll);
        };
    }, [recomputeAll]);

    useEffect(() => {
        const currentIds = new Set(items.map((item) => item.localId));
        Object.keys(stageRefs.current).forEach((id) => {
            if (!currentIds.has(id)) delete stageRefs.current[id];
        });
    }, [items]);

    const registerStageRef = useCallback((localId: string) => (el: HTMLDivElement | null) => {
        stageRefs.current[localId] = el;
    }, []);

    return {
        funnelWrapperRef,
        targetRef,
        cardsScrollRef,
        paths,
        edgeFade,
        recomputePaths: recomputeAll,
        registerStageRef,
    };
}
