// Общие константы и функции карточки служебной записки.
import type {HrFormSchema, SzStatusCode} from "@/service/szService/szService.ts";

/**
 * Цвета статусов — один источник для реестра, доски и карточки. Раньше у карточки
 * был свой список, и «Вынесена на орган» в ней была серой, как черновик.
 */
export {STATUS_TONE} from "@/constants/szConstatns/szStatusTone.ts";

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

/** DatePickerInput работает с дд.мм.гггг, а сервер ждёт гггг-мм-дд; пусто или неполная дата — null. */
export function ruToIso(value: string): string | null {
    const m = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const ok = d.getFullYear() === Number(m[3]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]);
    return ok ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * Схема полей кадровой записки для вида.
 *
 * 1. По id вида (schema.hrKindId) — не зависит от названия, поэтому переименование
 *    вида в справочнике больше не прячет поля формы.
 * 2. Если по id не нашлось (вид завели вручную или сервер старый) — по названию, по тем
 *    же правилам, что и сервер в HrFormSchema.For: без лишних пробелов и регистра.
 */
export function findHrFormSchema(
    forms: Record<string, HrFormSchema>,
    hrKind: { id: number; titleRu: string } | null | undefined,
): HrFormSchema | null {
    if (!hrKind) return null;

    const byId = Object.values(forms).find((f) => f.hrKindId != null && f.hrKindId === hrKind.id);
    if (byId) return byId;

    const wanted = hrKind.titleRu?.trim().toLowerCase();
    if (!wanted) return null;
    const key = Object.keys(forms).find((k) => k.trim().toLowerCase() === wanted);
    return key ? forms[key] : null;
}

/**
 * Локаль Intl для языка интерфейса (ru / ky / en). Раньше панели карточки форматировали
 * даты и суммы жёстко по "ru-RU" — в английском и кыргызском интерфейсе всё равно
 * выходил русский формат.
 */
export function intlLocale(language: string | undefined): string {
    if (language?.startsWith("ky")) return "ky-KG";
    if (language?.startsWith("en")) return "en-US";
    return "ru-RU";
}

/**
 * Момент времени (метка с часами: выдан, подписан, решение вынесено) — по языку интерфейса.
 * Для дат без времени (срок, дата регистрации) — formatDate: она не сдвигает день
 * из-за часового пояса.
 */
export function formatDateTime(
    iso: string | null | undefined,
    language: string | undefined,
    options: Intl.DateTimeFormatOptions = {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"},
): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(intlLocale(language), options);
}

/** Сумма с копейками — по языку интерфейса. */
export function formatMoney(value: number | null | undefined, language: string | undefined): string {
    if (value == null) return "—";
    return value.toLocaleString(intlLocale(language), {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

/** Сегодняшняя дата в формате гггг-мм-дд — по часам браузера, без сдвига в UTC. */
export function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Дата гггг-мм-дд раньше сегодняшней: срок поручения в прошлом ставить нельзя. */
export function isPastIso(iso: string | null | undefined): boolean {
    return !!iso && iso < todayIso();
}
