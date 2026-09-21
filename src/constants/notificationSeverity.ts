import type { NotificationSeverity } from "@/service/notificationsService/notificationsServiceType.ts";

interface NotificationSeverityMeta {
    labelKey: string; // ключ i18n подписи — см. notifications.severity.* в translation.json
    dot: string;
    bg: string;
    border: string;
}

export const NOTIFICATION_SEVERITY_META: Record<NotificationSeverity, NotificationSeverityMeta> = {
    Info:    { labelKey: "notifications.severity.info",    dot: "#2f68f5", bg: "#e9f0ff", border: "#cbddff" },
    Success: { labelKey: "notifications.severity.success", dot: "#1c7a4d", bg: "#e2f4ea", border: "#c3e6d1" },
    Warning: { labelKey: "notifications.severity.warning", dot: "#b3730a", bg: "#fbeecf", border: "#f0dcae" },
    Urgent:  { labelKey: "notifications.severity.urgent",  dot: "#c0392b", bg: "#fbe7e4", border: "#f1c9c2" },
};
