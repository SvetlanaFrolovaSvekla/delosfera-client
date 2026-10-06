// Поля, зависящие от вида записки: кадровая, закупка, обучение.
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import type {PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {SzHrForm} from "@/components/sz/SzHrForm.tsx";
import type {SzCardState} from "@/hooks/sz/useSzCard.ts";
import {inputClass, localizedTitle} from "@/components/componentsSzCard/szCardUtils.ts";

interface SzKindFieldsProps {
    card: SzCardState;
    userList: PickableUser[];
}

export function SzKindFields({card, userList}: SzKindFieldsProps) {
    const {t, i18n} = useTranslation();
    const {orgUnits} = useDictionaries();
    const {form, set, editable, formKey, hrKinds, hrForms, hrValues, setHrValues} = card;

    if (formKey === "Hr") {
        const hrKind = hrKinds.find((k) => k.id === form.hrKindId);
        return (
            <div className="mt-4">
                {editable ? (
                    <div>
                        <span className="block text-[11.5px] text-[#4d5a72] mb-[5px]">{t("szCard.fields.hrKind")}</span>
                        <SelectDropdown
                            value={form.hrKindId != null ? String(form.hrKindId) : ""}
                            onChange={(v) => set("hrKindId", v ? Number(v) : null)}
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
                <SzHrForm
                    schema={hrForms[hrKind?.titleRu ?? ""] ?? null}
                    employees={form.employees ?? []}
                    onEmployeesChange={(list) => set("employees", list)}
                    values={hrValues}
                    onValuesChange={setHrValues}
                    users={userList}
                    orgUnits={orgUnits.map((u) => ({id: Number(u.id), name: u.name}))}
                    editable={editable}
                />
            </div>
        );
    }

    if (formKey === "Procurement") {
        return (
            <div className="mt-4 grid grid-cols-2 gap-4">
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
                <Field label={t("szCard.fields.amount")}>
                    <input className={inputClass} type="number" step="0.01" value={form.amount ?? ""} disabled={!editable}
                           onChange={(e) => set("amount", e.target.value ? Number(e.target.value) : null)}/>
                </Field>
            </div>
        );
    }

    if (formKey === "Training") {
        const unit = orgUnits.find((u) => String(u.id) === String(form.employeeUnitId));
        return (
            <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label={t("szCard.fields.employeeName")}>
                    <input className={inputClass} value={form.employeeName ?? ""} disabled={!editable}
                           onChange={(e) => set("employeeName", e.target.value)}/>
                </Field>
                {editable ? (
                    <div>
                        <span className="block text-[11.5px] text-[#4d5a72] mb-[5px]">{t("szCard.fields.employeeUnit")}</span>
                        <SelectDropdown
                            value={form.employeeUnitId != null ? String(form.employeeUnitId) : ""}
                            onChange={(v) => set("employeeUnitId", v ? Number(v) : null)}
                            options={[
                                {value: "", label: t("szCard.fields.notSelected")},
                                ...orgUnits.map((u) => ({value: String(u.id), label: u.name})),
                            ]}
                            searchable
                            searchPlaceholder={t("szCard.fields.unitSearch")}
                            minWidth="100%"
                            className="w-full"
                        />
                    </div>
                ) : (
                    <ReadOnlyField label={t("szCard.fields.employeeUnit")} value={unit?.name ?? t("szCard.fields.notSelected")}/>
                )}
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

    return null;
}
