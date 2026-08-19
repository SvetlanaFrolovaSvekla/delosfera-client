// Панель с сообщением о ненайденных данных/об ошибке загрузки данных
import type {LucideIcon} from "lucide-react";
import {AlertTriangle, SearchX} from "lucide-react";

type EmptyStateActionVariant = "default" | "primary";

interface EmptyStateProps {
    variant?: "empty" | "error";
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    actionIcon?: LucideIcon;
    actionVariant?: EmptyStateActionVariant;
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

const ACTION_BUTTON_STYLES: Record<EmptyStateActionVariant, string> = {
    default:
        "border border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]",
    primary:
        "border-none bg-[#4e57d6] text-white hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]",
};

export function EmptyState({
                               variant = "empty",
                               icon,
                               title,
                               description,
                               actionLabel,
                               actionIcon: ActionIcon,
                               actionVariant = "default",
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
                    className={`inline-flex items-center gap-2 h-9 px-4 rounded-[9px] font-semibold text-[12.5px] cursor-pointer ${ACTION_BUTTON_STYLES[actionVariant]}`}
                >
                    {ActionIcon && <ActionIcon className="w-4 h-4" strokeWidth={2}/>}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}