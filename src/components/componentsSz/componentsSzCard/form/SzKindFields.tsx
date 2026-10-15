// Поля, зависящие от вида записки: кадровая, закупка, обучение.
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import type {SzCardState} from "@/hooks/sz/useSzCard.ts";

import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {SzHrForm} from "@/components/componentsSz/componentsSzCard/form/SzHrForm.tsx";
import {findHrFormSchema, inputClass, localizedTitle} from "@/utils/szProcess/szCardUtils.ts";

import type {PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";

interface SzKindFieldsProps {
    card: SzCardState;
    userList: PickableUser[];
}

export function SzKindFields({card, userList}: SzKindFieldsProps) {
    const {t, i18n} = useTranslation();
    const {orgUnits} = useDictionaries();
    const {form, set, setForm, editable, formKey, hrKinds, hrForms, hrValues, setHrValues} = card;

    /**
     * Смена вида кадровой записки. Значения полей прежнего вида (город командировки,
     * старый оклад…) иначе оставались в форме и уходили на сервер вместе с полями
     * нового вида. Оставляем только те поля, что есть и в новой схеме (например,
     * «С какой даты», «Основание»), — остальное сбрасываем. Сами сотрудники остаются:
     * список людей от вида не зависит.
     */
    const changeHrKind = (nextId: number | null) => {
        if (nextId === (form.hrKindId ?? null)) return;
        const nextKind = hrKinds.find((k) => k.id === nextId);
        const nextSchema = findHrFormSchema(hrForms, nextKind);

        const sharedCodes = new Set(nextSchema?.fields.filter((f) => !f.perEmployee).map((f) => f.code) ?? []);
        const perEmployeeCodes = new Set(nextSchema?.fields.filter((f) => f.perEmployee).map((f) => f.code) ?? []);
        const pick = (values: Record<string, unknown> | undefined, codes: Set<string>) =>
            Object.fromEntries(Object.entries(values ?? {}).filter(([code]) => codes.has(code)));

        setForm((f) => ({
            ...f,
            hrKindId: nextId,
            employees: (f.employees ?? []).map((e) => ({...e, values: pick(e.values, perEmployeeCodes)})),
        }));
        setHrValues(pick(hrValues, sharedCodes));
    };

    // Дерево СП для модалки выбора
    const orgUnitTreeOptions = useMemo(
        () => orgUnits.map((u) => ({
            key: String(u.id),
            label: u.name,
            parentId: u.parentId != null ? String(u.parentId) : undefined,
        })),
        [orgUnits],
    );

    /* КАДРОВАЯ */
    if (formKey === "Hr") {
        const hrKind = hrKinds.find((k) => k.id === form.hrKindId);
        return (
            <div className="mt-4">
                {editable ? (
                    <div>
                        {/* Вид кадровой записки */}
                        <span className="block text-[11.5px] text-[#4d5a72] mb-[5px]">
                            {t("szCard.fields.hrKind")}<span className="text-[#c0392b]"> *</span>
                        </span>
                        <SelectDropdown
                            accent="blue"
                            value={form.hrKindId != null ? String(form.hrKindId) : ""}
                            onChange={(v) => changeHrKind(v ? Number(v) : null)}
                            options={[
                                {value: "", label: t("szCard.fields.notSelected")},
                                ...hrKinds.map((k) => ({value: String(k.id), label: localizedTitle(k, i18n.language)})),
                            ]}
                            minWidth="100%"
                            className="w-full"
                        />
                    </div>
                ) : (
                    <ReadOnlyField
                        label={t("szCard.fields.hrKind")}
                        value={hrKind ? localizedTitle(hrKind, i18n.language) : t("szCard.fields.notSelected")}
                    />
                )}

                {/* Поля зависят от вида: у командировки свои, у изменения оклада свои.
                    Схему отдаёт сервер, здесь её только рисуют. */}

                {/* - Изменение оклада: Сотрудники, С какой даты, Основание;
                    - Командировка: Сотрудники, Куда, Цель поездки, с, По, командировочные расходы, Сумма расходом, Источник финансирования;
                    - Перемещение с изменением оклада: Сотрудники, Новая должность, В подразделение, С какой даты, Основание;
                    - Перемещение без изменения оклада;
                    - Прием на работу: Сотрудники, Дата выхода, Испытательный срок, Вид занятости;
                    - Прием стажёров с оплатой: Сотрудники, Подразделение, Наставник, С, По;
                */}

                <SzHrForm
                    schema={findHrFormSchema(hrForms, hrKind)}
                    employees={form.employees ?? []}
                    onEmployeesChange={(list) => set("employees", list)}
                    values={hrValues}
                    onValuesChange={setHrValues}
                    users={userList}
                    orgUnits={orgUnits.map((u) => ({
                        id: Number(u.id),
                        name: u.name,
                        parentId: u.parentId != null ? Number(u.parentId) : null,
                    }))}
                    editable={editable}
                />
            </div>
        );
    }

    /* НА ЗАКУПКУ */
    if (formKey === "Procurement") {
        return (
            <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Заложено в бюджет */}
                <div className="flex items-end pb-2.5">
                    <PlainCheckbox
                        tone="brand"
                        checked={form.hasBudget ?? false}
                        onChange={(checked) => set("hasBudget", checked)}
                        disabled={!editable}
                    >
                        {t("szCard.fields.hasBudget")}
                    </PlainCheckbox>
                </div>
                {/* Сумма закупки */}
                <Field label={t("szCard.fields.amount")} required>
                    <input className={inputClass} type="number" step="0.01" value={form.amount ?? ""}
                           disabled={!editable}
                           onChange={(e) => set("amount", e.target.value ? Number(e.target.value) : null)}/>
                </Field>
            </div>
        );
    }

    /* НА ОБУЧЕНИЕ */
    if (formKey === "Training") {
        const unit = orgUnits.find((u) => String(u.id) === String(form.employeeUnitId));
        return (
            <div className="mt-4 grid grid-cols-2 gap-4">
                {/* ФИО сотрудника */}
                <Field label={t("szCard.fields.employeeName")} required>
                    <input className={inputClass} value={form.employeeName ?? ""} disabled={!editable}
                           onChange={(e) => set("employeeName", e.target.value)}/>
                </Field>
                {/* Филиал/СП сотрудника */}
                {editable ? (
                    <SingleSelectListField
                        accent="blue"
                        label={t("szCard.fields.employeeUnit")}
                        required
                        modalTitle={t("szCard.fields.employeeUnit")}
                        options={orgUnitTreeOptions}
                        selectedKey={form.employeeUnitId != null ? String(form.employeeUnitId) : null}
                        onChange={(key) => set("employeeUnitId", key ? Number(key) : null)}
                        searchPlaceholder={t("szCard.fields.unitSearch")}
                        boldLabel={false}
                    />
                ) : (
                    <ReadOnlyField label={t("szCard.fields.employeeUnit")}
                                   value={unit?.name ?? t("szCard.fields.notSelected")}/>
                )}
                {/* Есть командировочные расходы */}
                <div className="flex items-end pb-2.5">
                    <PlainCheckbox
                        tone="brand"
                        checked={form.travelExpenses ?? false}
                        onChange={(checked) => set("travelExpenses", checked)}
                        disabled={!editable}
                    >
                        {t("szCard.fields.travelExpenses")}
                    </PlainCheckbox>
                </div>
            </div>
        );
    }

    /* ПРОЧИЕ - нет доп. Полей */

    return null;
}
