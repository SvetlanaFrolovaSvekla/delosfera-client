import type {NotificationSeverity} from "@/service/notificationsService/notificationsServiceType.ts";

export const SEVERITY_DOT: Record<NotificationSeverity, string> = {
    Info: "#2f68f5",
    Success: "#1c7a4d",
    Warning: "#b3730a",
    Urgent: "#e0483d",
};

export const PREVIEW_COUNT = 5;

// Во что превращается severity уведомления, когда оно всплывает тостом
// (см. NotificationsDropdown и toastService.ts).
export const SEVERITY_TOAST_VARIANT: Record<NotificationSeverity, "info" | "success" | "warning" | "error"> = {
    Info: "info",
    Success: "success",
    Warning: "warning",
    Urgent: "error",
};
