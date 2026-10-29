// Виды действий в «Истории действий» профиля и их цвета (точки у записей, чипсы-фильтры,
// легенда "?"). Сервер отдаёт вид в UserActivityItem.kind (см. UserActivityKinds на бэкенде).
// Цвета — те же, что у похожих событий в журнале аудита ВНД (auditEventKinds).
import type {UserActivityItem} from "@/service/userService/userServiceType.ts";

export type UserActivityKindKey =
    | "created"
    | "processStarted"
    | "approved"
    | "approvedWithComment"
    | "rejected"
    | "autoApproved"
    | "removed"
    | "other";

export interface UserActivityKindMeta {
    key: UserActivityKindKey;
    /** Цвет точки */
    color: string;
}

/** Порядок — примерно жизненный цикл документа; в нём же идут легенда и чипсы. */
export const USER_ACTIVITY_KINDS: UserActivityKindMeta[] = [
    {key: "created", color: "#0ea5e9"},
    {key: "processStarted", color: "#8b5cf6"},
    {key: "approved", color: "#10b981"},
    {key: "approvedWithComment", color: "#f97316"},
    {key: "rejected", color: "#ef4444"},
    {key: "autoApproved", color: "#ec4899"},
    {key: "removed", color: "#64748b"},
    {key: "other", color: "#c3ccd8"},
];

const BY_KEY = new Map(USER_ACTIVITY_KINDS.map((k) => [k.key, k]));

/** Старый сервер без kind — угадываем по type. */
const BY_TYPE: Record<UserActivityItem["type"], UserActivityKindKey> = {
    vnd_created: "created",
    approval_initiated: "processStarted",
    approval_decided: "other",
};

export function getUserActivityKind(item: UserActivityItem): UserActivityKindMeta {
    const byKind = item.kind ? BY_KEY.get(item.kind as UserActivityKindKey) : undefined;
    return byKind ?? BY_KEY.get(BY_TYPE[item.type] ?? "other")!;
}
