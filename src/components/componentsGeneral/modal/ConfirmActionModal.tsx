// Общая модалка подтверждения действия (удаление, блокировка, разблокировка и т.п.)
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks/useModalShake.ts";
import {AlertTriangle, Lock, Unlock, ShieldCheck, type LucideIcon} from "lucide-react";
import type {ReactNode} from "react";

export type ConfirmActionVariant = "danger" | "warning" | "success" | "primary";

interface VariantStyle {
    haloBg: string;
    circleBg: string;
    confirmBg: string;
    Icon: LucideIcon;
}

const VARIANT_STYLES: Record<ConfirmActionVariant, VariantStyle> = {
    danger: {
        haloBg: "bg-[#fdeceb]",
        circleBg: "bg-[#c0392b]",
        confirmBg: "bg-[#c0392b]",
        Icon: Lock,
    },
    warning: {
        haloBg: "bg-[#fdf3e7]",
        circleBg: "bg-[#e08a1f]",
        confirmBg: "bg-[#e08a1f]",
        Icon: AlertTriangle,
    },
    success: {
        haloBg: "bg-[#e5f7ee]",
        circleBg: "bg-[#1a8a5f]",
        confirmBg: "bg-[#1a8a5f]",
        Icon: Unlock,
    },
    primary: {
        haloBg: "bg-[#ececfc]",
        circleBg: "bg-[#4e57d6]",
        confirmBg: "bg-[#4e57d6]",
        Icon: ShieldCheck,
    },
};

interface ConfirmActionModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel: string;
    loadingLabel?: string;
    loading?: boolean;
    error?: string | null;
    variant?: ConfirmActionVariant;
    icon?: LucideIcon;
    /** Произвольный доп. контент между текстом и блоком ошибки —
     * например, подсказка (Clue) о том, какие роли дают это право. */
    children?: ReactNode;
}

export function ConfirmActionModal({
                                       open,
                                       onClose,
                                       onConfirm,
                                       title,
                                       message,
                                       confirmLabel,
                                       loadingLabel,
                                       loading = false,
                                       error = null,
                                       variant = "warning",
                                       icon,
                                       children,
                                   }: ConfirmActionModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();

    if (!open) return null;

    const style = VARIANT_STYLES[variant];
    const Icon = icon ?? style.Icon;

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="relative w-[380px] max-w-[90vw] bg-white rounded-2xl px-7 pt-8 pb-6 shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
            >
                <div className={`mx-auto mb-4 w-14 h-14 rounded-full ${style.haloBg} grid place-items-center`}>
                    <div
                        className={`w-10 h-10 rounded-full ${style.circleBg} grid place-items-center animate-in zoom-in duration-500 delay-100`}
                    >
                        <Icon className="w-5 h-5 text-white" strokeWidth={2}/>
                    </div>
                </div>

                <h3 className="text-center text-[16px] font-bold text-[#1c2740] mb-1.5">
                    {title}
                </h3>
                <p className="text-center text-[13px] text-[#8b97ab] leading-[1.5] mb-5">
                    {message}
                </p>

                {children && (
                    <div className="mb-5">
                        {children}
                    </div>
                )}

                {error && (
                    <div className="mb-4 px-3 py-2 rounded-[9px] bg-[#fdeceb] text-[#c0392b] text-[12.5px] text-center">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-center gap-2.5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="h-9 flex-1 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {t("general.cancel")}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`h-9 flex-1 rounded-[9px] border-none ${style.confirmBg} text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed transition-[filter]`}
                    >
                        {loading ? (loadingLabel ?? t("general.processing", "Обработка…")) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}