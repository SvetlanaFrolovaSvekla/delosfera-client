// Общая модалка подтверждения удаления
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks//useModalShake.ts";
import {AlertTriangle} from "lucide-react";

interface ConfirmDeleteModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    loading?: boolean;
    error?: string | null;
}

export function ConfirmDeleteModal({
                                       open,
                                       onClose,
                                       onConfirm,
                                       title,
                                       message,
                                       loading = false,
                                       error = null,
                                   }: ConfirmDeleteModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();

    if (!open) return null;

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
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#fdeceb] grid place-items-center">
                    <div className="w-10 h-10 rounded-full bg-[#c0392b] grid place-items-center animate-in zoom-in duration-500 delay-100">
                        <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2}/>
                    </div>
                </div>

                <h3 className="text-center text-[16px] font-bold text-[#1c2740] mb-1.5">
                    {title}
                </h3>
                <p className="text-center text-[13px] text-[#8b97ab] leading-[1.5] mb-5">
                    {message}
                </p>

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
                        className="h-9 flex-1 rounded-[9px] border-none bg-[#c0392b] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed transition-[filter]"
                    >
                        {loading ? t("general.deleting") : t("general.delete")}
                    </button>
                </div>
            </div>
        </div>
    );
}