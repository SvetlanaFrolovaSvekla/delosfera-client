import type {TidDiffSegment} from "@/hooks/vndHooks/useTidDiffRows.ts";

export function getInitials(fullName: string): string {
    return fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Сегменты автосравнения в HTML для начального содержимого
 * RichDiffEditor: изменённые куски (hl: true) оборачиваются в цветной <span>, остальной текст
 * идёт как есть - никакой заливки фона и зачёркивания, просто цвет текста. */
export function segmentsToHtml(segments: TidDiffSegment[], color: string): string {
    return segments
        .map((seg) => {
            const escaped = escapeHtml(seg.text).replace(/\n/g, "<br/>");
            return seg.hl ? `<span style="color:${color}">${escaped}</span>` : escaped;
        })
        .join("");
}