import React, {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {poaService, type Poa, type PoaHolderKind} from "@/service/poaService/poaService.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {PoaPersonField} from "@/components/componentsPoa/PoaPersonField.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {ModalHeader} from "@/components/componentsGeneral/rubricator/ModalHeader.tsx";
import {useModalShake} from "@/hooks/useModalShake.ts";
import {displayToIso, isoToDisplay} from "@/utils/dateUtils.ts";
import {ACCENT} from "@/constants/accent.ts";
import {CheckCircle2} from "lucide-react";

/**
 * Выдача доверенности.
 *
 * Поля идут в том порядке, в каком их читают в самом документе: кто доверяет,
 * кому, на что, на какой срок. Порядок в форме и в бумаге совпадает не для
 * красоты — заполняют её, глядя в проект доверенности.
 */

interface Props {
    poa: Poa | null;
    onClose: () => void;
    /** Сохранено на сервере. Модалка при этом не закрывается - закрывает пользователь. */
    onSaved: () => void;
}


function today(): string {
    return isoToDisplay(new Date().toISOString());
}

/** Год — обычный срок доверенности в банке; дальше правят руками. */
function yearAhead(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return isoToDisplay(date.toISOString());
}

/** Валюты предельной суммы. Код валюты в доверенности пишут как есть, поэтому не переводим. */
const CURRENCIES = ["KGS", "USD", "EUR", "RUB", "KZT", "CNY"];

const A = ACCENT.violet;

export function PoaEditModal({poa, onClose, onSaved}: Props) {
    const {t} = useTranslation();
    const {users} = useUserLookup();
    const {panelRef, handleBackdropClick} = useModalShake();

    const [issuedOn, setIssuedOn] = useState(isoToDisplay(poa?.issuedOn) || today());
    const [grantorUserId, setGrantorUserId] = useState<number | null>(poa?.grantorUserId ?? null);
    const [holderKind, setHolderKind] = useState<PoaHolderKind>(poa?.holderKind ?? "Employee");
    const [holderUserId, setHolderUserId] = useState<number | null>(poa?.holderUserId ?? null);
    const [holderName, setHolderName] = useState(poa?.holderName ?? "");
    const [holderPosition, setHolderPosition] = useState(poa?.holderPosition ?? "");
    const [identityDocument, setIdentityDocument] = useState(poa?.holderIdentityDocument ?? "");
    const [powers, setPowers] = useState(poa?.powers ?? "");
    const [allowsDelegation, setAllowsDelegation] = useState(poa?.allowsDelegation ?? false);
    const [amountLimit, setAmountLimit] = useState(poa?.amountLimit?.toString() ?? "");
    const [amountCurrency, setAmountCurrency] = useState(poa?.amountCurrency ?? "KGS");
    const [validFrom, setValidFrom] = useState(isoToDisplay(poa?.validFrom) || today());
    const [validTo, setValidTo] = useState(isoToDisplay(poa?.validTo) || yearAhead());
    const [originalLocation, setOriginalLocation] = useState(poa?.originalLocation ?? "");

    const [saving, setSaving] = useState(false);
    /** Что сохраняем: после первого сохранения новой доверенности - уже её id, а не «создать ещё одну». */
    const [savedId, setSavedId] = useState<number | null>(poa?.id ?? null);
    /** Поля на момент последнего удачного сохранения: пока их не трогали, показываем «Сохранено». */
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

    const snapshot = JSON.stringify([
        issuedOn, grantorUserId, holderKind, holderUserId, holderName, holderPosition, identityDocument,
        powers, allowsDelegation, amountLimit, amountCurrency, validFrom, validTo, originalLocation,
    ]);
    const isSaved = savedSnapshot === snapshot;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    /**
     * Выбрали сотрудника — подставляем ФИО и должность. В доверенности они
     * фиксируются на дату выдачи, но набирать их заново, когда система уже знает,
     * незачем; поправить руками всё равно можно.
     */
    const pickEmployee = (id: number | null) => {
        setHolderUserId(id);
        if (id === null) return;

        const user = users.find((u) => u.id === id);
        if (!user) return;

        setHolderName(user.fullName);
        setHolderPosition(user.position ?? "");
    };

    // Валюта из старой доверенности, которой нет в списке, всё равно должна показываться.
    const currencyOptions = (CURRENCIES.includes(amountCurrency) ? CURRENCIES : [amountCurrency, ...CURRENCIES])
        .map((code) => ({value: code, label: code}));

    const holderKindOptions = (["Employee", "External"] as PoaHolderKind[]).map((kind) => ({
        value: kind,
        // "Сотрудник банка" / "Стороннее лицо"
        label: t(`poaCard.holderKinds.${kind}`),
    }));

    const submit = async () => {
        if (grantorUserId === null) {
            setError(t("poaEdit.grantorRequired")); // "Выберите доверителя."
            return;
        }
        if (holderKind === "Employee" && holderUserId === null) {
            setError(t("poaEdit.employeeRequired")); // "Выберите сотрудника."
            return;
        }
        if (holderName.trim().length < 3) {
            setError(t("poaEdit.holderNameRequired")); // "Укажите, кому выдаётся доверенность."
            return;
        }
        if (powers.trim().length < 5) {
            setError(t("poaEdit.powersRequired")); // "Укажите полномочия по доверенности."
            return;
        }

        const issuedOnIso = displayToIso(issuedOn);
        const validFromIso = displayToIso(validFrom);
        const validToIso = displayToIso(validTo);

        // Дата не разобралась (пустая или неполный ввод) - не отправляем пустое молча.
        if (!issuedOnIso || !validFromIso || !validToIso) {
            setError(t("poaEdit.dateInvalid")); // "Проверьте даты: формат дд.мм.гггг."
            return;
        }
        // ISO-даты сравниваются как строки.
        if (validToIso < validFromIso) {
            setError(t("poaEdit.dateRangeInvalid")); // "Дата окончания раньше даты начала."
            return;
        }

        const limit = amountLimit.trim() ? Number(amountLimit.replace(",", ".")) : null;
        if (limit !== null && (Number.isNaN(limit) || limit <= 0)) {
            setError(t("poaEdit.amountInvalid")); // "Предельная сумма должна быть числом больше нуля."
            return;
        }

        setSaving(true);
        setError(null);

        const request = {
            issuedOn: issuedOnIso,
            grantorUserId,
            holderKind,
            holderUserId: holderKind === "Employee" ? holderUserId : null,
            holderName: holderName.trim(),
            holderPosition: holderPosition.trim() || null,
            holderIdentityDocument: identityDocument.trim() || null,
            powers: powers.trim(),
            allowsDelegation,
            amountLimit: limit,
            amountCurrency: limit !== null ? amountCurrency : null,
            validFrom: validFromIso,
            validTo: validToIso,
            originalLocation: originalLocation.trim() || null,
        };

        try {
            const result = savedId !== null
                ? await poaService.update(savedId, request)
                : await poaService.create(request);
            setSavedId(result.id);
            setSavedSnapshot(snapshot);
            onSaved();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("poaEdit.saveFailed")); // "Не удалось сохранить."
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/40 p-4 backdrop-blur-[2px]"
            onClick={handleBackdropClick}
        >
            <div
                ref={panelRef}
                className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white
                           shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)]"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* "Изменить доверенность" / "Выдать доверенность" */}
                <ModalHeader
                    title={savedId !== null ? t("poaEdit.edit") : t("poaEdit.create")}
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="flex flex-col gap-4">
                        <Group title={t("poaEdit.groupFrom" /* "От кого" */)}>
                            <Field label={t("poaEdit.grantor" /* "Доверитель" */)}>
                                <PoaPersonField
                                    users={users}
                                    value={grantorUserId}
                                    onChange={setGrantorUserId}
                                    fallbackName={poa?.grantorName}
                                    placeholder={t("poaEdit.selectPlaceholder" /* "— выберите —" */)}
                                    modalTitle={t("poaEdit.grantor" /* "Доверитель" */)}
                                    searchPlaceholder={t("poaEdit.userSearch" /* "Найдите по фамилии" */)}
                                    clearLabel={t("poaEdit.clearPerson" /* "Очистить" */)}
                                    bySeniority
                                />
                            </Field>
                            <Field label={t("poaEdit.issuedOn" /* "Дата выдачи" */)}>
                                <DatePickerInput value={issuedOn} onChange={setIssuedOn} accent="violet"/>
                            </Field>
                        </Group>

                        <Group title={t("poaEdit.groupTo" /* "Кому" */)}>
                            <Field label={t("poaEdit.holderKind" /* "Представитель" */)}>
                                <SelectDropdown
                                    options={holderKindOptions}
                                    value={holderKind}
                                    onChange={(v) => setHolderKind(v as PoaHolderKind)}
                                    minWidth="100%"
                                    accent="violet"
                                />
                            </Field>

                            {holderKind === "Employee" ? (
                                <Field label={t("poaEdit.employee" /* "Сотрудник" */)}>
                                    <PoaPersonField
                                        users={users}
                                        value={holderUserId}
                                        onChange={pickEmployee}
                                        fallbackName={poa?.holderName}
                                        fallbackPosition={poa?.holderPosition}
                                        placeholder={t("poaEdit.selectPlaceholder" /* "— выберите —" */)}
                                        modalTitle={t("poaEdit.employee" /* "Сотрудник" */)}
                                        searchPlaceholder={t("poaEdit.userSearch" /* "Найдите по фамилии" */)}
                                        clearLabel={t("poaEdit.clearPerson" /* "Очистить" */)}
                                    />
                                </Field>
                            ) : (
                                <div/>
                            )}

                            <Field label={t("poaEdit.holderName" /* "ФИО в доверенности" */)} wide>
                                <input
                                    value={holderName}
                                    onChange={(event) => setHolderName(event.target.value)}
                                    className={FIELD}
                                />
                            </Field>
                            <Field label={t("poaEdit.holderPosition" /* "Должность" */)} wide>
                                <input
                                    value={holderPosition}
                                    onChange={(event) => setHolderPosition(event.target.value)}
                                    className={FIELD}
                                />
                            </Field>
                            <Field label={t("poaEdit.identityDocument" /* "Документ, удостоверяющий личность" */)} wide>
                                <input
                                    value={identityDocument}
                                    onChange={(event) => setIdentityDocument(event.target.value)}
                                    placeholder={t("poaEdit.identityPlaceholder" /* "Паспорт ID 0000000, выдан…" */)}
                                    className={FIELD}
                                />
                            </Field>
                        </Group>

                        <Group title={t("poaEdit.groupWhat" /* "На что" */)}>
                            <Field label={t("poaEdit.powers" /* "Полномочия" */)} wide>
                                <textarea
                                    value={powers}
                                    onChange={(event) => setPowers(event.target.value)}
                                    rows={5}
                                    /* "Как записано в самом документе — спор решается по формулировке." */
                                    placeholder={t("poaEdit.powersPlaceholder")}
                                    className={`${FIELD_BASE} resize-y py-2`}
                                />
                            </Field>

                            <Field label={t("poaEdit.amountLimit" /* "Предельная сумма" */)}>
                                <input
                                    value={amountLimit}
                                    onChange={(event) => setAmountLimit(event.target.value)}
                                    inputMode="decimal"
                                    placeholder={t("poaEdit.amountPlaceholder" /* "не ограничена" */)}
                                    className={FIELD}
                                />
                            </Field>
                            <Field label={t("poaEdit.currency" /* "Валюта" */)}>
                                <SelectDropdown
                                    options={currencyOptions}
                                    value={amountCurrency}
                                    onChange={setAmountCurrency}
                                    minWidth="100%"
                                    accent="violet"
                                />
                            </Field>

                            <div className="col-span-2">
                                <PlainCheckbox checked={allowsDelegation} onChange={setAllowsDelegation} tone="accent">
                                    {/* "С правом передоверия" */}
                                    {t("poaEdit.allowsDelegation")}
                                </PlainCheckbox>
                            </div>
                        </Group>

                        <Group title={t("poaEdit.groupTerm" /* "Срок и оригинал" */)}>
                            <Field label={t("poaEdit.validFrom" /* "Действует с" */)}>
                                <DatePickerInput value={validFrom} onChange={setValidFrom} accent="violet"/>
                            </Field>
                            <Field label={t("poaEdit.validTo" /* "Действует по" */)}>
                                <DatePickerInput value={validTo} onChange={setValidTo} accent="violet"/>
                            </Field>
                            <Field label={t("poaEdit.originalLocation" /* "Где хранится оригинал" */)} wide>
                                <input
                                    value={originalLocation}
                                    onChange={(event) => setOriginalLocation(event.target.value)}
                                    placeholder={t("poaEdit.originalPlaceholder" /* "Юридическое управление, сейф 2" */)}
                                    className={FIELD}
                                />
                            </Field>
                        </Group>
                    </div>

                    {error && <p className="mt-3 text-[13px] text-[#c0392b]">{error}</p>}
                </div>

                <div className="flex-none border-t border-[#eef2f7] px-6 py-4">
                    <div className="flex items-center justify-end gap-2.5">
                        {isSaved && (
                            <span role="status" className="mr-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2e8b57]">
                                <CheckCircle2 size={16}/>
                                {t("poaEdit.saved") /* Сохранено */}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4
                                       text-[12.5px] font-semibold text-[#55617a] transition-colors hover:bg-[#f6f8fb]"
                        >
                            {/* После сохранения отменять уже нечего - «Закрыть» */}
                            {savedSnapshot !== null ? t("poaEdit.close") : t("general.cancel")}
                        </button>
                        <button
                            type="button"
                            disabled={saving || isSaved}
                            onClick={submit}
                            className={`h-9 cursor-pointer rounded-[9px] px-5 text-[12.5px] font-semibold text-white
                                        transition hover:brightness-[1.06] disabled:cursor-not-allowed
                                        disabled:opacity-60 ${A.bg} ${A.hoverBg}`}
                        >
                            {/* "Сохраняем…" / "Сохранить проект" */}
                            {saving ? t("poaEdit.saving") : t("poaEdit.saveDraft")}
                        </button>
                    </div>
                    <p className="mt-2 text-right text-[12px] text-[#8b97ab]">
                        {/* "Номер по книге присваивается при выдаче, а не сейчас." */}
                        {t("poaEdit.numberNote")}
                    </p>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Group({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <fieldset className="rounded-[12px] border border-[#e5e9f0] p-4">
            <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b97ab]">
                {title}
            </legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
        </fieldset>
    );
}

const FIELD_BASE =
    `w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#1c2740] outline-none ` +
    `placeholder:text-[#a3adbd] transition ${A.focusBorder}`;

const FIELD = `${FIELD_BASE} h-10`;

function Field({label, children, wide}: {label: string; children: React.ReactNode; wide?: boolean}) {
    return (
        <div className={`block ${wide ? "col-span-2" : ""}`}>
            <span className="mb-1.5 block text-[12px] font-semibold text-[#3a4560]">{label}</span>
            {children}
        </div>
    );
}
