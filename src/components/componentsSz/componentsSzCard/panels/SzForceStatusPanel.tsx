// Ручной перевод статуса записки - только для пользователя с правами (администратора).
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {SZ_STATUS_LABEL, type SzStatusCode} from "@/service/szService/szService.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {inputClass} from "@/utils/szProcess/szCardUtils.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {ArrowRightLeft, X} from "lucide-react";

const STATUS_CODES = Object.keys(SZ_STATUS_LABEL) as SzStatusCode[];

interface SzForceStatusPanelProps {
    saving: boolean;
    onSubmit: (code: SzStatusCode, reason: string) => Promise<boolean>;
    onDone: () => void;
}

export function SzForceStatusPanel({saving, onSubmit, onDone}: SzForceStatusPanelProps) {
    const {t} = useTranslation();
    const [code, setCode] = useState<SzStatusCode>("Draft");
    const [reason, setReason] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const reasonMissing = !reason.trim();

    const confirm = async () => {
        const ok = await onSubmit(code, reason);
        setConfirmOpen(false);
        if (ok) onDone();
    };

    return (
        <div className="relative mt-4 rounded-[12px] border border-[#f0c98a] bg-[#fffaf0] p-4">
            {/* Закрыть панель */}
            <button
                type="button"
                onClick={onDone}
                disabled={saving}
                aria-label={t("szCard.force.close")}
                className="cursor-pointer absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-[8px] text-[#8a5a00] transition-colors hover:bg-[#f7e6c4] disabled:opacity-50 disabled:pointer-events-none"
            >
                <X className="h-4 w-4" strokeWidth={2}/>
            </button>
            <div className="pr-8 text-[13px] font-semibold text-[#8a5a00]">{t("szCard.force.title")}</div>
            <p className="mt-1 mb-2.5 pr-8 text-[12.5px] text-[#8a5a00]">{t("szCard.force.hint")}</p>
            <div className="flex flex-wrap items-start gap-2">
                <SelectDropdown
                    value={code}
                    onChange={(v) => setCode(v as SzStatusCode)}
                    options={STATUS_CODES.map((c) => ({value: c, label: t(`szRegistry.status.${c}`)}))}
                    minWidth="260px"
                />
                {/* Основание перевода */}
                <input
                    className={`${inputClass} flex-1 min-w-[240px]`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("szCard.force.reasonPlaceholder")}
                />
                {/* Перевести. Неактивная кнопка не получает событий мыши, поэтому ей
                    отключаем pointer-events — наведение ловит обёртка тултипа. */}
                <Tooltip content={t("szCard.force.reasonRequired")} disabled={!reasonMissing} side="top">
                    <SzButton
                        variant="warningSolid"
                        onClick={() => setConfirmOpen(true)}
                        disabled={saving || reasonMissing}
                        className="disabled:pointer-events-none"
                    >
                        {t("szCard.force.submit")}
                    </SzButton>
                </Tooltip>
            </div>

            <ConfirmActionModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirm}
                title={t("szCard.force.confirmTitle")}
                message={t("szCard.force.confirmMessage", {status: t(`szRegistry.status.${code}`)})}
                confirmLabel={t("szCard.force.submit")}
                loadingLabel={t("szCard.force.processing")}
                loading={saving}
                variant="warning"
                icon={ArrowRightLeft}
            />
        </div>
    );
}
