// Ручной перевод статуса записки — только для администратора системы.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SZ_STATUS_LABEL, type SzStatusCode} from "@/service/szService/szService.ts";
import {SzButton} from "@/components/componentsSzCard/SzButton.tsx";
import {inputClass} from "@/components/componentsSzCard/szCardUtils.ts";

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

    const submit = async () => {
        if (await onSubmit(code, reason)) onDone();
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#f0c98a] bg-[#fffaf0] p-4">
            <div className="text-[13px] font-semibold text-[#8a5a00]">{t("szCard.force.title")}</div>
            <p className="mt-1 mb-2.5 text-[12.5px] text-[#8a5a00]">{t("szCard.force.hint")}</p>
            <div className="flex flex-wrap items-start gap-2">
                <SelectDropdown
                    value={code}
                    onChange={(v) => setCode(v as SzStatusCode)}
                    options={STATUS_CODES.map((c) => ({value: c, label: t(`szRegistry.status.${c}`)}))}
                    minWidth="260px"
                />
                <input
                    className={`${inputClass} flex-1 min-w-[240px]`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("szCard.force.reasonPlaceholder")}
                />
                <SzButton variant="warningSolid" onClick={submit} disabled={saving || !reason.trim()}>
                    {t("szCard.force.submit")}
                </SzButton>
            </div>
        </div>
    );
}
