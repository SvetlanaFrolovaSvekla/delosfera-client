import { NOTIFICATION_SEVERITY_META } from "@/constants/notificationSeverity.ts";
import type { NotificationSeverity } from "@/service/notificationsService/notificationsServiceType.ts";
import { Tooltip } from "@/components/componentsGeneral/Tooltip.tsx";

interface SeverityDotProps {
    severity: NotificationSeverity;
    className?: string;
}

export function SeverityDot({ severity, className = "" }: SeverityDotProps) {
    const meta = NOTIFICATION_SEVERITY_META[severity];

    return (
        <Tooltip content={meta.label} side="top">
            <span
                className={`inline-block h-2.5 w-2.5 flex-none rounded-full ${className}`}
                style={{ backgroundColor: meta.dot, boxShadow: `0 0 0 3px ${meta.bg}` }}
            />
        </Tooltip>
    );
}