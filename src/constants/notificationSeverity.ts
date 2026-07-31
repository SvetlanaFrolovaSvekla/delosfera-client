import type { NotificationSeverity } from "@/service/notificationsService/notificationsServiceType.ts";

interface NotificationSeverityMeta {
    label: string;
    dot: string;
    bg: string;
    border: string;
}

export const NOTIFICATION_SEVERITY_META: Record<NotificationSeverity, NotificationSeverityMeta> = {
    Info:    { label: "Информация",     dot: "#2f68f5", bg: "#e9f0ff", border: "#cbddff" },
    Success: { label: "Успех",          dot: "#1c7a4d", bg: "#e2f4ea", border: "#c3e6d1" },
    Warning: { label: "Предупреждение", dot: "#b3730a", bg: "#fbeecf", border: "#f0dcae" },
    Urgent:  { label: "Срочно",         dot: "#c0392b", bg: "#fbe7e4", border: "#f1c9c2" },
};