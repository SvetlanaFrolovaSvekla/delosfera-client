// Подсветка различий между двумя отрендеренными docx-превью (напр. новая и предыдущая
// редакция ВНД в модалке сравнения). Строит пословный diff по всему тексту каждого
// контейнера и красит несовпадающие куски прямо в уже отрисованном DOM — так же, как
// useDocxTextSearch подсвечивает совпадения поиска.
import {useEffect, useRef, useState} from "react";
import {diffWords, type DiffOp} from "@/utils/textDiff.ts";

const DIFF_ATTR = "data-diff-hl";

interface TextNodeEntry {
    node: Text;
    start: number;
    end: number;
}

function collectTextNodes(root: HTMLElement): TextNodeEntry[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            const tag = node.parentElement?.tagName;
            if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    const entries: TextNodeEntry[] = [];
    let offset = 0;
    let n: Node | null;
    while ((n = walker.nextNode())) {
        const text = (n as Text).nodeValue ?? "";
        entries.push({node: n as Text, start: offset, end: offset + text.length});
        offset += text.length;
    }
    return entries;
}

function getFullText(entries: TextNodeEntry[]): string {
    let result = "";
    for (const entry of entries) result += entry.node.nodeValue ?? "";
    return result;
}

function clearHighlights(root: HTMLElement) {
    root.querySelectorAll(`mark[${DIFF_ATTR}]`).forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
    });
}

function applyRanges(root: HTMLElement, ranges: [number, number][], style: string) {
    if (ranges.length === 0) return;
    // Пересобираем список текстовых узлов на каждый вызов — предыдущие правки (например,
    // подсветка другого набора диапазонов) уже могли перекроить DOM
    const entries = collectTextNodes(root);
    let rangeIdx = 0;

    for (const entry of entries) {
        while (rangeIdx < ranges.length && ranges[rangeIdx][1] <= entry.start) rangeIdx++;

        let localIdx = rangeIdx;
        let cursor = entry.start;
        const segments: {text: string; hl: boolean}[] = [];

        while (localIdx < ranges.length && ranges[localIdx][0] < entry.end) {
            const [rStart, rEnd] = ranges[localIdx];
            const segStart = Math.max(rStart, entry.start);
            const segEnd = Math.min(rEnd, entry.end);

            if (segStart > cursor) {
                segments.push({text: entry.node.nodeValue!.slice(cursor - entry.start, segStart - entry.start), hl: false});
            }
            segments.push({text: entry.node.nodeValue!.slice(segStart - entry.start, segEnd - entry.start), hl: true});
            cursor = segEnd;

            if (rEnd > entry.end) break; // диапазон продолжается в следующем узле
            localIdx++;
        }

        rangeIdx = localIdx;

        if (segments.length === 0) continue;
        if (cursor < entry.end) {
            segments.push({text: entry.node.nodeValue!.slice(cursor - entry.start), hl: false});
        }

        const frag = document.createDocumentFragment();
        for (const seg of segments) {
            if (!seg.text) continue;
            if (seg.hl) {
                const mark = document.createElement("mark");
                mark.setAttribute(DIFF_ATTR, "");
                mark.setAttribute("style", style);
                mark.textContent = seg.text;
                frag.appendChild(mark);
            } else {
                frag.appendChild(document.createTextNode(seg.text));
            }
        }
        entry.node.parentNode?.replaceChild(frag, entry.node);
    }
}

const REMOVE_STYLE =
    "background:#fdeceb;color:#a63a2c;text-decoration:line-through;text-decoration-color:#d98f83;border-radius:3px;padding:0 1px;box-decoration-break:clone;-webkit-box-decoration-break:clone;";
const ADD_STYLE =
    "background:#e8f8ee;color:#1c7a4d;border-radius:3px;padding:0 1px;box-decoration-break:clone;-webkit-box-decoration-break:clone;";

export type DiffHighlightStatus = "idle" | "computing" | "done" | "unavailable";

/**
 * Подсвечивает различия между содержимым oldContainer и newContainer.
 * resetKey должен меняться при смене редакции/языка на любой из сторон — тогда
 * подсветка снимается со старых узлов и пересчитывается заново.
 */
export function useDocxDiffHighlight(
    oldContainer: HTMLElement | null,
    newContainer: HTMLElement | null,
    oldReady: boolean,
    newReady: boolean,
    resetKey: string,
): DiffHighlightStatus {
    const [status, setStatus] = useState<DiffHighlightStatus>("idle");
    const appliedKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!oldReady || !newReady || !oldContainer || !newContainer) {
            setStatus("idle");
            return;
        }

        let computeTimeout: ReturnType<typeof setTimeout> | undefined;

        // Небольшая задержка: даём docx-preview дорисовать layout (изображения, стили) перед
        // тем, как считать текст — иначе можем словить неполный/промежуточный DOM
        const timeout = setTimeout(() => {
            if (appliedKeyRef.current === resetKey) return;

            clearHighlights(oldContainer);
            clearHighlights(newContainer);

            const oldEntries = collectTextNodes(oldContainer);
            const newEntries = collectTextNodes(newContainer);
            const oldText = getFullText(oldEntries);
            const newText = getFullText(newEntries);

            setStatus("computing");

            // Сам diff тоже откладываем на следующий тик, чтобы "computing" успел отрисоваться
            computeTimeout = setTimeout(() => {
                const ops: DiffOp[] | null = diffWords(oldText, newText);

                if (ops === null) {
                    appliedKeyRef.current = resetKey;
                    setStatus("unavailable");
                    return;
                }

                const removeRanges: [number, number][] = [];
                const addRanges: [number, number][] = [];
                for (const op of ops) {
                    if (op.type === "remove" && op.oldRange) removeRanges.push(op.oldRange);
                    if (op.type === "add" && op.newRange) addRanges.push(op.newRange);
                }

                applyRanges(oldContainer, removeRanges, REMOVE_STYLE);
                applyRanges(newContainer, addRanges, ADD_STYLE);

                appliedKeyRef.current = resetKey;
                setStatus("done");
            }, 0);
        }, 150);

        return () => {
            clearTimeout(timeout);
            if (computeTimeout !== undefined) clearTimeout(computeTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oldContainer, newContainer, oldReady, newReady, resetKey]);

    return status;
}
