// Панель с сообщением о ненайденных данных/об ошибке загрузки данных
import type {LucideIcon} from "lucide-react";
import {AlertTriangle, SearchX} from "lucide-react";

interface EmptyStateProps {
    variant?: "empty" | "error";
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const VARIANT_STYLES = {
    empty: {
        iconBg: "bg-[#f2f5f9]",
        iconColor: "text-[#a3adbd]",
        titleColor: "text-[#26324a]",
        descColor: "text-[#8b97ab]",
        defaultIcon: SearchX,
    },
    error: {
        iconBg: "bg-[#fdf1f1]",
        iconColor: "text-[#c0392b]",
        titleColor: "text-[#c0392b]",
        descColor: "text-[#c0392b]",
        defaultIcon: AlertTriangle,
    },
} as const;

export function EmptyState({
                               variant = "empty",
                               icon,
                               title,
                               description,
                               actionLabel,
                               onAction,
                           }: EmptyStateProps) {
    const styles = VARIANT_STYLES[variant];
    const Icon = icon ?? styles.defaultIcon;

    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl py-20 px-6 flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-2xl ${styles.iconBg} grid place-items-center mb-4`}>
                <Icon className={`w-6 h-6 ${styles.iconColor}`} strokeWidth={1.6}/>
            </div>
            <h3 className={`m-0 text-[15px] font-semibold ${styles.titleColor}`}>
                {title}
            </h3>
            {description && (
                <p className={`mt-[6px] mb-5 text-[13px] ${styles.descColor} max-w-[340px]`}>
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}