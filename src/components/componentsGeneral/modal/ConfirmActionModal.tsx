// Общая модалка подтверждения действия (удаление, блокировка, разблокировка и т.п.)
import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks/useModalShake.ts";
import {AlertTriangle, Lock, Unlock, ShieldCheck, type LucideIcon} from "lucide-react";
import type {Accent} from "@/constants/accent.ts";

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

/** Основная (primary) модалка в синем акценте реестра СЗ - вместо фиолетового по умолчанию. */
const PRIMARY_BLUE: VariantStyle = {
    haloBg: "bg-[#e9f0ff]",
    circleBg: "bg-[#2f68f5]",
    confirmBg: "bg-[#2f68f5]",
    Icon: ShieldCheck,
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
    /**
     * Акцент основной модалки (variant="primary"): по умолчанию фиолетовый, "blue" - синий, как в СЗ.
     * Красной, жёлтой и зелёной модалкам (danger / warning / success) цвет не меняет.
     */
    accent?: Accent;
    icon?: LucideIcon;
    /** Шире обычного (760px) — для окон с подробным пояснением внутри. */
    wide?: boolean;
    /** Кнопка подтверждения вдвое шире «Отмены» (по умолчанию — поровну): для длинных подписей. */
    wideConfirm?: boolean;
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
                                       accent,
                                       icon,
                                       wide = false,
                                       wideConfirm = false,
                                       children,
                                   }: ConfirmActionModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();

    if (!open) return null;

    const style = variant === "primary" && accent === "blue" ? PRIMARY_BLUE : VARIANT_STYLES[variant];
    const Icon = icon ?? style.Icon;

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-100 flex items-center justify-center bg-[#0f1b2d]/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className={`relative ${wide ? "w-[860px] px-10" : "w-[380px] px-7"} max-w-[92vw] max-h-[92vh] overflow-y-auto bg-white rounded-2xl pt-8 pb-6 shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300`}
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
                        className={`h-9 ${wideConfirm ? "flex-[2] whitespace-nowrap" : "flex-1"} rounded-[9px] border-none ${style.confirmBg} text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed transition-[filter]`}
                    >
                        {loading ? (loadingLabel ?? t("general.processing", "Обработка…")) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}