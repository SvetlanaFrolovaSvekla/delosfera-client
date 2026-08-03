// Рисовка линий от этапов уже построенного маршрута к блокам нормативов (read-only версия useStageRouting)
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";

interface RouteItem {
    localId: string;
}

export function useApprovalRouteLines<T extends RouteItem>(items: T[]) {
    const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const targetRef = useRef<HTMLDivElement | null>(null);
    const funnelWrapperRef = useRef<HTMLDivElement | null>(null);
    const cardsScrollRef = useRef<HTMLDivElement | null>(null);
    const [paths, setPaths] = useState<string[]>([]);

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

        const next = points.map(
            ({x, bottom}) => `M ${x} ${bottom} L ${x} ${trunkY} L ${targetX} ${trunkY} L ${targetX} ${targetTopY}`,
        );
        setPaths(next);
    }, [items]);

    useLayoutEffect(() => {
        recomputePaths();
        const ro = new ResizeObserver(recomputePaths);
        if (funnelWrapperRef.current) ro.observe(funnelWrapperRef.current);
        window.addEventListener("resize", recomputePaths);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recomputePaths);
        };
    }, [recomputePaths]);

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
        recomputePaths,
        registerStageRef,
    };
}