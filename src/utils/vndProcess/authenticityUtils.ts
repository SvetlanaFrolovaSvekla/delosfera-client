import type {
    VndAuthenticityCheckResponse,
    VndAuthenticityRedactionMatch,
} from "@/service/vndService/vndAuthenticityService.ts";
import {toast} from "@/service/toastService.ts";

export const formatDateTime = (iso: string | null, locale: string) =>
    iso ? new Date(iso).toLocaleString(locale, {dateStyle: "short", timeStyle: "short"}) : "—";

export const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function vndTitle(match: VndAuthenticityRedactionMatch, language: string) {
    if (language === "en") return match.titleEn || match.titleRu;
    if (language === "ky") return match.titleKg || match.titleRu;
    return match.titleRu;
}

/** Итог проверки одной строкой — то, ради чего страницу открывают. */
export type Verdict = "confirmed" | "partial" | "notFound";

export function verdictOf(result: VndAuthenticityCheckResponse): { verdict: Verdict; signed: number; total: number } {
    const processes = result.matches.flatMap((m) => m.processes);
    const confirmed = processes.find((p) =>
        p.status === "approved" && p.approversTotal > 0 && p.signedUnderThisText === p.approversTotal);
    if (confirmed) return {
        verdict: "confirmed",
        signed: confirmed.signedUnderThisText,
        total: confirmed.approversTotal
    };

    if (result.matches.length === 0) return {verdict: "notFound", signed: 0, total: 0};

    // Лучший из найденных процессов — с наибольшим числом подписей под этим текстом.
    const best = [...processes].sort((a, b) => b.signedUnderThisText - a.signedUnderThisText)[0];
    return {verdict: "partial", signed: best?.signedUnderThisText ?? 0, total: best?.approversTotal ?? 0};
}

export async function copyToClipboard(text: string, okMessage: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(okMessage, undefined, 2000);
    } catch {
        // Буфер обмена недоступен (например, страница открыта не по https) — молча ничего не делаем.
    }
}
