// Общие константы и функции карточки служебной записки.
import {colors} from "@/design/tokens.ts";
import type {SzStatusCode} from "@/service/szService/szService.ts";

export const STATUS_TONE: Partial<Record<SzStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    PendingRegistration: colors.status.onact,
    OnSigning: colors.status.review,
    Registered: colors.status.review,
    OnRevision: colors.status.onact,
    OnAddresseeDecision: colors.status.review,
    OnExecution: colors.status.consol,
    Executed: colors.status.active,
    Rejected: colors.status.arch,
    Withdrawn: colors.status.draft,
    Archived: colors.status.arch,
};

/** Статусы, в которых автор ещё может править и отправлять записку. */
export const EDITABLE_STATUSES: readonly SzStatusCode[] = ["Draft", "OnRevision", "Withdrawn"];

/** Статусы, в которых автор может отозвать записку из согласования. */
export const WITHDRAWABLE_STATUSES: readonly SzStatusCode[] = [
    "OnApproval", "PendingRegistration", "OnSigning", "Registered", "OnRevision",
];

/** Статусы, в которых вопрос можно вынести на коллегиальный орган или видеть его судьбу. */
export const BODY_SUBMISSION_STATUSES: readonly SzStatusCode[] = [
    "OnExecution", "OnAddresseeDecision", "OnBoardReview",
];

export const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

export const labelClass = "block text-[11.5px] text-[#8b97ab] mb-[5px]";

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

/** Сообщение, которое сервер вернул вместе с отказом, если оно есть. */
export function serverMessage(e: unknown): string | undefined {
    return (e as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/** Наименование справочника на текущем языке интерфейса; русское — запасное. */
export function localizedTitle(
    item: { titleRu: string; titleEn: string | null; titleKg: string | null },
    language: string,
): string {
    if (language === "ky") return item.titleKg || item.titleRu;
    if (language === "en") return item.titleEn || item.titleRu;
    return item.titleRu;
}
