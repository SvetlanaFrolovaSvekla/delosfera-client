import {Info, CheckCircle2, AlertTriangle, AlertCircle, RotateCcw} from "lucide-react";
import {NOTIFICATION_SEVERITY_META} from "@/constants/notificationSeverity.ts";
import type {NotificationSeverity} from "@/service/notificationsService/notificationsServiceType.ts";

const SEVERITY_ORDER: NotificationSeverity[] = ["Info", "Success", "Warning", "Urgent"];

const SEVERITY_ICONS: Record<NotificationSeverity, typeof Info> = {
    Info: Info,
    Success: CheckCircle2,
    Warning: AlertTriangle,
    Urgent: AlertCircle,
};

interface NotificationSeverityFilterProps {
    value: NotificationSeverity[];
    onChange: (value: NotificationSeverity[]) => void;
    countBySeverity?: Partial<Record<NotificationSeverity, number>>;
}

export function NotificationSeverityFilter({
                                               value,
                                               onChange,
                                               countBySeverity,
                                           }: NotificationSeverityFilterProps) {
    const toggle = (severity: NotificationSeverity) => {
        if (value.includes(severity)) {
            onChange(value.filter((s) => s !== severity));
        } else {
            onChange([...value, severity]);
        }
    };

    return (
        <div
            className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
            <span className="mr-0.5 flex-none text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Тип уведомления
            </span>

            <span className="hidden h-5 w-px flex-none bg-slate-300 sm:block"/>

            <div className="flex flex-wrap items-center gap-1.5">
                {SEVERITY_ORDER.map((severity) => {
                    const meta = NOTIFICATION_SEVERITY_META[severity];
                    const Icon = SEVERITY_ICONS[severity];
                    const active = value.includes(severity);
                    const count = countBySeverity?.[severity];

                    return (
                        <button
                            key={severity}
                            onClick={() => toggle(severity)}
                            className={
                                "cursor-pointer group relative inline-flex items-center gap-1.5 rounded-xl border px-3 py-[7px] text-[12.5px] font-semibold transition-all " +
                                (active
                                    ? "border"
                                    : "border-slate-200 bg-white text-slate-500 shadow-[0_2px_8px_-2px_rgba(15,27,45,0.18)] hover:-translate-y-px hover:border-slate-300 hover:text-slate-700")
                            }
                            style={
                                active
                                    ? {
                                        backgroundColor: meta.bg,
                                        color: meta.dot,
                                        borderColor: meta.border,
                                    }
                                    : undefined
                            }
                        >
                            <Icon
                                className="h-3.5 w-3.5 flex-none transition-transform group-hover:scale-110"
                                style={{color: active ? meta.dot : "#a3adbd"}}
                                strokeWidth={2.3}
                            />
                            {meta.label}
                            {!!count && (
                                <span
                                    className="ml-0.5 rounded-full px-1.5 py-px font-mono text-[10px] font-bold"
                                    style={{
                                        backgroundColor: active ? "#fff" : "#f2f5f9",
                                        color: active ? meta.dot : "#8b97ab",
                                    }}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {value.length > 0 && (
                <button
                    onClick={() => onChange([])}
                    className="ml-auto flex-none cursor-pointer inline-flex h-9 items-center gap-2 rounded-lg
                     border border-slate-200 bg-white px-3.5 text-[13px] font-semibold
                      text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed
                      disabled:opacity-40"
                >
                    <RotateCcw className="h-4 w-4"/>
                    Сбросить фильтр
                </button>
            )}
        </div>
    );
}