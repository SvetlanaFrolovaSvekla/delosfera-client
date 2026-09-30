/**
 * Форма идентификации в ЭЦП (общая для окна подписи и личного кабинета): ПИН и ИНН организации
 * с побуквенным счётчиком, способ получения кода, ввод кода, кнопки шага. Что делать с кодом
 * (подписать / сохранить) решает хост через onSubmit.
 */
import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {
    ORGANIZATION_INN_MAX_LENGTH, PERSON_IDNP_LENGTH, type EcpIdentification,
} from "@/hooks/useEcpIdentification.ts";
import {ECP_PRIMARY_BTN, ECP_SECONDARY_BTN, ecpMethodLabel} from "@/components/signing/ecpUi.ts";

const INPUT_CLS =
    "w-full h-10 min-w-0 px-3 rounded-[9px] border border-[#e5e9f0] bg-white outline-none text-[13px] " +
    "text-[#1c2740] box-border font-mono tracking-[.06em] placeholder:tracking-normal placeholder:text-[#c3ccd8] " +
    "focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc] disabled:bg-[#f6f8fb]";

interface DigitsFieldProps {
    label: string;
    hint?: string;
    value: string;
    max: number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    onChange: (value: string) => void;
    onEnter?: () => void;
}

function DigitsField({label, hint, value, max, placeholder, required, disabled, autoFocus, onChange, onEnter}: DigitsFieldProps) {
    return (
        <div className="min-w-0">
            <div className="flex items-end justify-between gap-2 mb-[5px]">
                <span className="text-[11.5px] text-[#8b97ab]">
                    {label} {required && <span className="text-[#c0392b]">*</span>}
                </span>
                {/* Порог -1: счётчик не краснеет заранее, это не «лимит текста», а длина номера. */}
                <CharCounter length={value.length} max={max} nearLimitThreshold={-1}/>
            </div>
            <input
                type="text" inputMode="numeric" autoComplete="off" maxLength={max}
                value={value} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
                className={INPUT_CLS}
            />
            {hint && <div className="mt-1 text-[11px] leading-[1.4] text-[#a3adbd]">{hint}</div>}
        </div>
    );
}

interface Props {
    ident: EcpIdentification;
    /** Подпись главной кнопки на шаге ввода кода (напр. «Подтвердить и подписать»). */
    submitLabel: string;
    submitBusyLabel: string;
    onSubmit: () => void;
    onCancel: () => void;
    /** Доп. контент под полем кода (напр. галочка «Запомнить»). */
    codeExtra?: ReactNode;
}

export function EcpIdentityForm({ident, submitLabel, submitBusyLabel, onSubmit, onCancel, codeExtra}: Props) {
    const {t} = useTranslation();
    const {busy, error, step} = ident;

    return (
        <div className="flex flex-col gap-3.5">
            {error && (
                <div className="px-3 py-2 rounded-[9px] bg-[#fdeceb] text-[#c0392b] text-[12.5px] leading-[1.5]">
                    {error}
                </div>
            )}

            {step === "idnp" && (
                <>
                    <DigitsField
                        label={t("ecp.identity.pin")} required hint={t("ecp.identity.pinHint")}
                        value={ident.personIdnp} max={PERSON_IDNP_LENGTH} placeholder="00000000000000"
                        disabled={busy} autoFocus
                        onChange={ident.changeIdnp}
                        onEnter={() => { if (ident.canNext && !busy) void ident.next(); }}
                    />
                    <DigitsField
                        label={t("ecp.identity.innLabel")} hint={t("ecp.identity.innHint")}
                        value={ident.organizationInn} max={ORGANIZATION_INN_MAX_LENGTH} placeholder={t("ecp.identity.innPlaceholder")}
                        disabled={busy}
                        onChange={ident.changeInn}
                        onEnter={() => { if (ident.canNext && !busy) void ident.next(); }}
                    />
                    {ident.methodsLoaded && (
                        <SelectDropdown
                            label={t("ecp.identity.method")} labelPosition="top" className="w-full" minWidth="0"
                            options={ident.methods.map((m) => ({value: m, label: ecpMethodLabel(t, m)}))}
                            value={ident.method} onChange={ident.setMethod}
                        />
                    )}
                </>
            )}

            {step === "code" && (
                <>
                    <p className="m-0 text-[12.5px] leading-[1.5] text-[#8b97ab]">
                        {t("ecp.identity.codeSent", {method: ecpMethodLabel(t, ident.method)})}
                    </p>
                    <div className="min-w-0">
                        <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">{t("ecp.identity.code")}</span>
                        <input
                            type="text" autoComplete="off" autoFocus maxLength={32}
                            value={ident.code} disabled={busy}
                            onChange={(e) => ident.setCode(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !busy) onSubmit(); }}
                            className={INPUT_CLS}
                        />
                    </div>
                    {codeExtra}
                </>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button type="button" className={ECP_SECONDARY_BTN} disabled={busy} onClick={onCancel}>{t("general.cancel")}</button>
                {step === "idnp" ? (
                    <button type="button" className={ECP_PRIMARY_BTN} disabled={busy || !ident.canNext}
                            onClick={() => void ident.next()}>
                        {busy ? t("ecp.identity.wait") : ident.methodsLoaded ? t("ecp.identity.getCode") : t("ecp.identity.next")}
                    </button>
                ) : (
                    <button type="button" className={ECP_PRIMARY_BTN} disabled={busy} onClick={onSubmit}>
                        {busy ? submitBusyLabel : submitLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
