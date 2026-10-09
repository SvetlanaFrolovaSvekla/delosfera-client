import type { NotificationSeverity } from "@/service/notificationsService/notificationsServiceType.ts";

interface NotificationSeverityMeta {
    labelKey: string; // Ключ i18n подписи — см. notifications.severity.* в translation.json
    dot: string;   // кружок - пастельный оттенок
    text: string;  // насыщенный оттенок для текста (пастельный на светлом фоне плохо читается)
    bg: string;
    border: string;
}

export const NOTIFICATION_SEVERITY_META: Record<NotificationSeverity, NotificationSeverityMeta> = {
    Info:    { labelKey: "notifications.severity.info",    dot: "rgba(47,104,245,0.8)", text: "#2f68f5", bg: "#eef3ff", border: "#cbddff" },
    Success: { labelKey: "notifications.severity.success", dot: "rgba(28,122,41,0.8)", text: "#1c7a37", bg: "#ebf7f0", border: "#c3e6d1" },
    Warning: { labelKey: "notifications.severity.warning", dot: "rgba(179,115,10,0.8)", text: "#b3730a", bg: "#fdf5e1", border: "#f0dcae" },
    Urgent:  { labelKey: "notifications.severity.urgent",  dot: "rgba(192,57,43,0.8)", text: "#c0392b", bg: "#fdeeec", border: "#f1c9c2" },
};
