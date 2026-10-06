// Отзыв записки из согласования с обоснованием, которое увидят участники.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {SzButton} from "@/components/componentsSzCard/SzButton.tsx";

interface SzWithdrawPanelProps {
    saving: boolean;
    onSubmit: (reason: string) => Promise<boolean>;
    onClose: () => void;
}

export function SzWithdrawPanel({saving, onSubmit, onClose}: SzWithdrawPanelProps) {
    const {t} = useTranslation();
    const [reason, setReason] = useState("");

    const submit = async () => {
        if (await onSubmit(reason)) onClose();
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-4">
            <div className="text-[13px] font-semibold text-[#0f1b2d]">{t("szCard.withdraw.title")}</div>
            <p className="mt-1 mb-2.5 text-[12.5px] text-[#8b97ab]">{t("szCard.withdraw.hint")}</p>
            <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t("szCard.withdraw.reasonPlaceholder")}
                className="w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none resize-y focus:border-[#2f68f5]"
            />
            <div className="mt-2.5 flex gap-2">
                <SzButton variant="dangerSolid" size="sm" onClick={submit} disabled={saving}>
                    {t("szCard.withdraw.submit")}
                </SzButton>
                <SzButton size="sm" onClick={onClose}>{t("general.cancel")}</SzButton>
            </div>
        </div>
    );
}
