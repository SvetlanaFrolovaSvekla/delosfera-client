// Типы событий журнала аудита ВНД и их цвета (точки у записей, чипсы-фильтры, легенда "?").
// Сервер отдаёт точный тип в ActivityLogEntryResponse.kind (ActivityEventKind в camelCase);
// для старых записей без kind тип угадывается по icon.
import type {ActivityIcon, ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";

export type AuditKindKey =
    | "created"
    | "itemAdded"
    | "processStarted"
    | "approverChanged"
    | "approved"
    | "rejected"
    | "revisionNeeded"
    | "resubmitted"
    | "autoApproved"
    | "holdStarted"
    | "finalized"
    | "published"
    | "requisitesUpdated"
    | "redactionEdited"
    | "draftDeleted"
    | "other";

export interface AuditKindMeta {
    key: AuditKindKey;
    /** Цвет точки */
    color: string;
    /** Какие ActivityEventKind (camelCase) сюда относятся */
    kinds: string[];
}

/** Порядок - примерно жизненный цикл документа; в нём же идут легенда и чипсы. */
export const AUDIT_KINDS: AuditKindMeta[] = [
    {key: "created", color: "#0ea5e9", kinds: ["created"]},
    {key: "itemAdded", color: "#6366f1", kinds: ["itemAdded"]},
    {key: "processStarted", color: "#8b5cf6", kinds: ["processStarted"]},
    {key: "approverChanged", color: "#c026d3", kinds: ["approverAdded", "approverRemoved"]},
    {key: "approved", color: "#10b981", kinds: ["approved", "approvedWithComment"]},
    {key: "rejected", color: "#ef4444", kinds: ["rejected"]},
    {key: "revisionNeeded", color: "#f97316", kinds: ["revisionNeeded"]},
    {key: "resubmitted", color: "#06b6d4", kinds: ["resubmitted"]},
    {key: "autoApproved", color: "#ec4899", kinds: ["autoApprovedTimeout"]},
    {key: "holdStarted", color: "#f59e0b", kinds: ["holdStarted"]},
    {key: "finalized", color: "#14b8a6", kinds: ["finalized"]},
    {key: "published", color: "#15803d", kinds: ["published"]},
    {key: "requisitesUpdated", color: "#64748b", kinds: ["requisitesUpdated"]},
    {key: "redactionEdited", color: "#a16207", kinds: ["redactionEdited"]},
    {key: "draftDeleted", color: "#1f2937", kinds: ["draftDeleted"]},
    {key: "other", color: "#c3ccd8", kinds: ["other"]},
];

const BY_KEY = new Map(AUDIT_KINDS.map((k) => [k.key, k]));
const BY_SERVER_KIND = new Map(AUDIT_KINDS.flatMap((k) => k.kinds.map((kind) => [kind, k] as const)));

/** Старый сервер без kind - лучшее, что можно сказать по одной иконке */
const BY_ICON: Record<ActivityIcon, AuditKindKey> = {
    check: "approved",
    x: "rejected",
    doc: "itemAdded",
    clock: "holdStarted",
    edit: "redactionEdited",
    trash: "draftDeleted",
    info: "other",
};

export function getAuditKind(entry: ActivityLogEntryResponse): AuditKindMeta {
    const byKind = entry.kind ? BY_SERVER_KIND.get(entry.kind) : undefined;
    return byKind ?? BY_KEY.get(BY_ICON[entry.icon] ?? "other")!;
}
