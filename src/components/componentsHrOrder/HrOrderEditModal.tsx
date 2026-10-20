/**
 * Издание приказа по личному составу.
 *
 * Реквизиты по видам берутся от кадровых записок: у приказа о командировке те же
 * поля, что у записки о ней — город, срок, цель. Записка просит, приказ решает,
 * но описывают они одно событие, и заводить два справочника полей незачем.
 */
import React, {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {
    hrOrderService,
    type HrOrderKind, type HrOrderKindInfo,
} from "@/service/hrOrderService/hrOrderService.ts";
import {hrForms, type HrFormSchema, type SzEmployee} from "@/service/szService/szService.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {SzHrForm} from "@/components/componentsSz/componentsSzCard/form/SzHrForm.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {parseDDMMYYYY} from "@/utils/dateUtils.ts";
import {RichTextEditor} from "@/components/componentsEditor/RichTextEditor.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {ModalHeader} from "@/components/componentsGeneral/rubricator/ModalHeader.tsx";
import {useModalShake} from "@/hooks/useModalShake.ts";
import {ACCENT} from "@/constants/accent.ts";

interface Props {
    orderId: number | null;
    kinds: HrOrderKindInfo[];
    onClose: () => void;
    /** isNew — приказ только что создан (а не изменён). */
    onSaved: (isNew: boolean) => void;
}

/** Даты в форме хранятся как "дд.мм.гггг" - в этом формате работает DatePickerInput; на сервер уходит ISO. */
const isoToDisplay = (iso?: string | null): string => {
    if (!iso) return "";
    const [year, month, day] = iso.slice(0, 10).split("-");
    return year && month && day ? `${day}.${month}.${year}` : "";
};

/** "дд.мм.гггг" -> "гггг-мм-дд"; пустая строка, если дата не распознана. */
const displayToIso = (display: string): string => {
    const date = parseDDMMYYYY(display);
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/** Вид без своей формы («Иной»): только сотрудники, без реквизитов. */
const PLAIN_SCHEMA: HrFormSchema = {allowMultipleEmployees: true, employeeMayBeExternal: false, fields: []};

function today(): string {
    return isoToDisplay(new Date().toISOString());
}

const A = ACCENT.violet;

export function HrOrderEditModal({orderId, kinds, onClose, onSaved}: Props) {
    const {t} = useTranslation();
    const {users} = useUserLookup();
    const {orgUnits} = useDictionaries();
    const {panelRef, handleBackdropClick} = useModalShake();

    const [loading, setLoading] = useState(orderId !== null);
    const [forms, setForms] = useState<Record<string, HrFormSchema>>({});

    const [kind, setKind] = useState<HrOrderKind>("Other");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [basis, setBasis] = useState("");
    const [orderDate, setOrderDate] = useState(today());
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [effectiveTo, setEffectiveTo] = useState("");
    const [signerUserId, setSignerUserId] = useState<number | null>(null);

    /** Сотрудники приказа. Формат общий с кадровой запиской — форма одна и та же. */
    const [employees, setEmployees] = useState<SzEmployee[]>([]);
    const [values, setValues] = useState<Record<string, unknown>>({});

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        hrForms().then(setForms).catch(() => {});
    }, []);

    useEffect(() => {
        if (orderId === null) return;

        hrOrderService.get(orderId)
            .then((order) => {
                setKind(order.kind);
                setTitle(order.title);
                setBody(order.body ?? "");
                setBasis(order.basis ?? "");
                setOrderDate(isoToDisplay(order.orderDate) || today());
                setEffectiveFrom(isoToDisplay(order.effectiveFrom));
                setEffectiveTo(isoToDisplay(order.effectiveTo));
                setSignerUserId(order.signerUserId);
                setEmployees(order.employees.map((e) => ({
                    userId: e.userId,
                    fullName: e.name ?? "",
                    values: e.fieldValues ? safeParse(e.fieldValues) : {},
                })));
            })
            .catch(() => setError(t("hrOrderEdit.loadFailed"))) // "Не удалось загрузить приказ."
            .finally(() => setLoading(false));
    }, [orderId, t]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const formKey = kinds.find((k) => k.kind === kind)?.formKey ?? null;
    // У вида без формы («Иной») схемы нет, но сотрудников указать нужно.
    const schema = formKey ? forms[formKey] ?? null : PLAIN_SCHEMA;

    const submit = async () => {
        if (title.trim().length < 3) {
            setError(t("hrOrderEdit.titleRequired")); // "Укажите заголовок приказа."
            return;
        }
        // Строка «добавить» без выбранного человека сотрудником не считается.
        const picked = employees.filter((e) => e.userId != null);
        if (picked.length === 0) {
            setError(t("hrOrderEdit.employeesRequired")); // "Укажите хотя бы одного сотрудника."
            return;
        }

        const orderDateIso = displayToIso(orderDate);
        const effectiveFromIso = displayToIso(effectiveFrom);
        const effectiveToIso = displayToIso(effectiveTo);

        // Дата заполнена, но не разобралась (неполный ввод) - не отправляем пустое молча.
        if (!orderDateIso || (effectiveFrom && !effectiveFromIso) || (effectiveTo && !effectiveToIso)) {
            setError(t("hrOrderEdit.dateInvalid")); // "Проверьте даты: формат дд.мм.гггг."
            return;
        }
        // ISO-даты сравниваются как строки.
        if (effectiveToIso && effectiveFromIso && effectiveToIso < effectiveFromIso) {
            setError(t("hrOrderEdit.dateRangeInvalid")); // "Дата окончания раньше даты начала."
            return;
        }

        setSaving(true);
        setError(null);

        const request = {
            kind,
            title: title.trim(),
            body: body || null,
            basis: basis.trim() || null,
            orderDate: orderDateIso,
            effectiveFrom: effectiveFromIso || null,
            effectiveTo: effectiveToIso || null,
            signerUserId,
            employees: picked.map((e) => ({
                userId: e.userId as number,
                // Общие поля вида идут каждому сотруднику: у командировки город
                // и срок одни на всех, а личные поля лежат в самом сотруднике.
                fields: {...values, ...(e.values ?? {})},
            })),
        };

        try {
            if (orderId === null) await hrOrderService.create(request);
            else await hrOrderService.update(orderId, request);
            onSaved(orderId === null);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("hrOrderEdit.saveFailed")); // "Не удалось сохранить приказ."
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
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white
                           shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)]"
            >
                {/* "Издать приказ" / "Изменить приказ" */}
                <ModalHeader
                    title={orderId === null ? t("hrOrderEdit.issue") : t("hrOrderEdit.edit")}
                    onClose={onClose}
                />

                {loading ? (
                    <Loader label={t("hrOrderEdit.loading" /* "Загружаем…" */)}/>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                            <Field label={t("hrOrderEdit.kind" /* "Вид приказа" */)} required>
                                <SelectDropdown
                                    options={kinds.map((k) => ({value: k.kind, label: k.title}))}
                                    value={kind}
                                    onChange={(v) => setKind(v as HrOrderKind)}
                                    minWidth="100%"
                                    searchable
                                    searchPlaceholder={t("hrOrderEdit.kindSearch", "Найти вид приказа")}
                                />
                            </Field>

                            <Field label={t("hrOrderEdit.orderDate" /* "Дата приказа" */)} required>
                                <DatePickerInput value={orderDate} onChange={setOrderDate}/>
                            </Field>

                            <Field label={t("hrOrderEdit.titleField" /* "Заголовок" */)} required wide>
                                <input
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder={t("hrOrderEdit.titlePlaceholder" /* "О направлении в командировку" */)}
                                    className={FIELD}
                                />
                            </Field>

                            <Field label={t("hrOrderEdit.effectiveFrom" /* "Действует с" */)}>
                                <DatePickerInput value={effectiveFrom} onChange={setEffectiveFrom}/>
                            </Field>

                            <Field label={t("hrOrderEdit.effectiveTo" /* "По" */)}>
                                <DatePickerInput value={effectiveTo} onChange={setEffectiveTo}/>
                            </Field>

                            <Field label={t("hrOrderEdit.basis" /* "Основание" */)} wide>
                                <input
                                    value={basis}
                                    onChange={(event) => setBasis(event.target.value)}
                                    placeholder={t("hrOrderEdit.basisPlaceholder" /* "Служебная записка № 12 от 03.08.2026" */)}
                                    className={FIELD}
                                />
                            </Field>

                            <Field label={t("hrOrderEdit.signer" /* "Подписант" */)} wide>
                                <UserPickerField
                                    people={users}
                                    value={signerUserId}
                                    onChange={setSignerUserId}
                                    clearable
                                    onClear={() => setSignerUserId(null)}
                                    placeholder={t("hrOrderEdit.signerEmpty" /* "Подпишет тот, кто регистрирует" */)}
                                    modalTitle={t("hrOrderEdit.signer" /* "Подписант" */)}
                                    searchPlaceholder={t("hrOrderEdit.signerSearch" /* "Найдите по фамилии" */)}
                                    bySeniority
                                />
                            </Field>
                        </div>

                        {/* Сотрудники и реквизиты по виду — та же форма, что у кадровой записки. */}
                        <div className="mt-4">
                            <SzHrForm
                                schema={schema}
                                employees={employees}
                                onEmployeesChange={setEmployees}
                                values={values}
                                onValuesChange={setValues}
                                users={users}
                                orgUnits={orgUnits.map((u) => ({id: u.id, name: u.titleRu}))}
                                editable
                                accent="violet"
                            />
                        </div>

                        <div className="mt-4">
                            <RichTextEditor
                                label={t("hrOrderEdit.orderText" /* "Текст приказа" */)}
                                value={body}
                                onChange={setBody}
                            />
                        </div>

                        {error && <p className="mt-3 text-[13px] text-[#c0392b]">{error}</p>}
                        </div>

                        <div className="flex-none border-t border-[#eef2f7] px-6 py-4">
                            <div className="flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4
                                               text-[12.5px] font-semibold text-[#55617a] transition-colors hover:bg-[#f6f8fb]"
                                >
                                    {/* "Отмена" */}
                                    {t("general.cancel")}
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={submit}
                                    className={`h-9 cursor-pointer rounded-[9px] px-5 text-[12.5px] font-semibold text-white
                                                transition hover:brightness-[1.06] disabled:cursor-not-allowed
                                                disabled:opacity-60 ${A.bg} ${A.hoverBg}`}
                                >
                                    {/* "Сохраняем…" / "Сохранить проект" */}
                                    {saving ? t("hrOrderEdit.saving") : t("hrOrderEdit.saveDraft")}
                                </button>
                            </div>
                            <p className="mt-2 text-right text-[12px] text-[#8b97ab]">
                                {/* "Номер по книге присваивается при подписании, а не сейчас." */}
                                {t("hrOrderEdit.numberNote")}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

const FIELD =
    `w-full h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#1c2740] outline-none ` +
    `placeholder:text-[#a3adbd] transition ${A.focusBorder}`;

function Field({label, children, required, wide}: {
    label: string; children: React.ReactNode; required?: boolean; wide?: boolean;
}) {
    const {t} = useTranslation();

    return (
        <label className={`block ${wide ? "col-span-2" : ""}`}>
            <span className="mb-1.5 block text-[12px] font-semibold text-[#3a4560]">
                {label}
                {required && <span className="ml-0.5 text-[#c0392b]" title={t("hrOrderEdit.required" /* "Обязательное поле" */)}>*</span>}
            </span>
            {children}
        </label>
    );
}

function safeParse(json: string): Record<string, unknown> {
    try {
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        // Реквизиты испорчены — приказ важнее, откроем его без них.
        return {};
    }
}
