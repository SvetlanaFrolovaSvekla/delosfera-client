// Общий каркас модалок раздела «Корреспонденция»: портал, затемнение с «тряской», Esc, шапка, футер
import {useEffect, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {X} from "lucide-react";
import {useModalShake} from "@/hooks/useModalShake.ts";

interface LetterModalShellProps {
    onClose: () => void;
    /** Ширина панели, например "max-w-[720px]". */
    widthClass?: string;
    header: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
}

export function LetterModalShell({onClose, widthClass = "max-w-[720px]", header, footer, children}: LetterModalShellProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return createPortal(
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,27,45,.42)] p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] ${widthClass}`}
            >
                <div className="flex flex-none items-start justify-between gap-3 border-b border-[#eef2f7] px-5 py-4">
                    <div className="min-w-0 flex-1">{header}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("correspondencePage.close")}
                        className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a]"
                    >
                        <X className="h-[16px] w-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

                {footer && (
                    <div className="flex-none border-t border-[#eef2f7] px-5 py-4">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}

/** Подпись над полем, которое не является Editable*Field (выпадающие списки, пикер пользователя). */
export function FormField({label, required, className = "", children}: {
    label: ReactNode; required?: boolean; className?: string; children: ReactNode;
}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">
                {label} {required && <span className="text-[#c0392b]">*</span>}
            </span>
            {children}
        </div>
    );
}

/** Кнопки «Отмена» и основное действие: те же, что в остальных модалках системы. */
export function ModalActions({busy, disabled, onCancel, onSubmit, submitLabel, busyLabel}: {
    busy: boolean;
    disabled?: boolean;
    onCancel: () => void;
    onSubmit: () => void;
    submitLabel: string;
    busyLabel: string;
}) {
    const {t} = useTranslation();
    return (
        <div className="flex items-center justify-end gap-2.5">
            <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {t("general.cancel")}
            </button>
            <button
                type="button"
                onClick={onSubmit}
                disabled={busy || disabled}
                className="h-9 cursor-pointer rounded-[9px] border-none bg-[#4e57d6] px-5 text-[12.5px] font-semibold text-white hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {busy ? busyLabel : submitLabel}
            </button>
        </div>
    );
}
