// Отзыв записки из согласования с обоснованием, которое увидят участники.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {inputClass} from "@/utils/szProcess/szCardUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Undo2, X} from "lucide-react";

interface SzWithdrawPanelProps {
    saving: boolean;
    onSubmit: (reason: string) => Promise<boolean>;
    onClose: () => void;
}

export function SzWithdrawPanel({saving, onSubmit, onClose}: SzWithdrawPanelProps) {
    const {t} = useTranslation();
    const [reason, setReason] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const reasonMissing = !reason.trim();

    const confirm = async () => {
        const ok = await onSubmit(reason);
        setConfirmOpen(false);
        if (ok) onClose();
    };

    return (
        <div className="relative mt-4 rounded-[12px] border border-[#f1c9c2] bg-[#fdf5f4] p-4">
            {/* Закрыть панель */}
            <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label={t("szCard.withdraw.close")}
                className="cursor-pointer absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-[8px] text-[#c0392b] transition-colors hover:bg-[#fbe2de] disabled:opacity-50 disabled:pointer-events-none"
            >
                <X className="h-4 w-4" strokeWidth={2}/>
            </button>
            <div className="pr-8 text-[13px] font-semibold text-[#c0392b]">{t("szCard.withdraw.title")}</div>
            <p className="mt-1 mb-2.5 pr-8 text-[12.5px] text-[#c0392b]">{t("szCard.withdraw.hint")}</p>
            <div className="flex flex-wrap items-start gap-2">
                {/* Обоснование отзыва */}
                <input
                    className={`${inputClass} flex-1 min-w-[240px]`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("szCard.withdraw.reasonPlaceholder")}
                />
                {/* Отозвать */}
                <Tooltip content={t("szCard.withdraw.reasonRequired")} disabled={!reasonMissing} side="top">
                    <SzButton
                        variant="dangerSolid"
                        onClick={() => setConfirmOpen(true)}
                        disabled={saving || reasonMissing}
                        className="disabled:pointer-events-none"
                    >
                        {t("szCard.withdraw.submit")}
                    </SzButton>
                </Tooltip>
            </div>

            <ConfirmActionModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirm}
                title={t("szCard.withdraw.confirmTitle")}
                message={t("szCard.withdraw.confirmMessage")}
                confirmLabel={t("szCard.withdraw.submit")}
                loadingLabel={t("szCard.withdraw.processing")}
                loading={saving}
                variant="danger"
                icon={Undo2}
            />
        </div>
    );
}
