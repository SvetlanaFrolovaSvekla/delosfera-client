/**
 * Поля кадровой записки, свои для каждого вида.
 *
 * До этого форма была одна на все виды: ФИО, подразделение сотрудника и
 * подразделение перевода. Для командировки в ней не было ни срока, ни города; для
 * изменения оклада — ни старой суммы, ни новой. Всё это писали в текст записки,
 * откуда ни отобрать, ни посчитать.
 *
 * Схему полей отдаёт сервер: состав задан кадровой политикой, и держать его копию
 * на клиенте значит гарантировать расхождение при первой же правке.
 */
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {
    HrFieldSchema,
    HrFormSchema,
    SzEmployee,
} from "@/service/szService/szService.ts";
import type {PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {Plus, X} from "lucide-react";

interface Props {
    schema: HrFormSchema | null;
    employees: SzEmployee[];
    onEmployeesChange: (list: SzEmployee[]) => void;

    /** Общие значения записки — те поля, что не помечены perEmployee. */
    values: Record<string, unknown>;
    onValuesChange: (values: Record<string, unknown>) => void;

    users: PickableUser[];
    orgUnits: {id: number; name: string; parentId?: number | null}[];
    editable: boolean;
}

const fieldClass = "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5] disabled:bg-[#f8fafc]";

/** В значениях записки дата лежит как гггг-мм-дд, а DatePickerInput работает с дд.мм.гггг. */
const isoToRu = (v: unknown): string => {
    const m = typeof v === "string" ? v.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
    return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
};

const ruToIso = (s: string): string | null => {
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const ok = d.getFullYear() === Number(m[3]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]);
    return ok ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/**
 * Дата через общий DatePickerInput. Он отдаёт наружу и недонабранный текст («12.0»), поэтому
 * сырую строку держим у себя и пишем в записку только полную корректную дату (или null, если
 * поле очистили) — иначе при вводе значение отскакивало бы назад.
 */
function HrDateField({value, onChange, disabled}: {
    value: unknown;
    onChange: (iso: string | null) => void;
    disabled: boolean;
}) {
    const [raw, setRaw] = useState(isoToRu(value));

    useEffect(() => {
        const current = ruToIso(raw);
        const incoming = isoToRu(value) ? ruToIso(isoToRu(value)) : null;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (current !== incoming) setRaw(isoToRu(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <DatePickerInput
            accent="blue"
            value={raw}
            disabled={disabled}
            className="!h-10 !rounded-[9px] !text-[13px]"
            onChange={(s) => {
                setRaw(s);
                const iso = ruToIso(s);
                if (iso) onChange(iso);
                else if (s === "") onChange(null);
            }}
        />
    );
}

{/* - Изменение оклада: Сотрудники, С какой даты, Основание;
                    - Командировка: Сотрудники, Куда, Цель поездки, с, По, командировочные расходы, Сумма расходом, Источник финансирования;
                    - Перемещение с изменением оклада: Сотрудники, Новая должность, В подразделение, С какой даты, Основание;
                    - Перемещение без изменения оклада;
                    - Прием на работу: Сотрудники, Дата выхода, Испытательный срок, Вид занятости;
                    - Прием стажёров с оплатой: Сотрудники, Подразделение, Наставник, С, По;
*/}

/**
 * Постоянные ключи строк списка, который живёт снаружи (в форме записки).
 *
 * С key={index} при удалении сотрудника из середины компонент следующей строки
 * переиспользовался: внутреннее состояние HrDateField (недонабранная дата) и пикеров
 * «переезжало» к соседу. Ключи меняются вместе со списком: add/remove — здесь; если
 * список сменился снаружи (открыли записку, применили шаблон) и длина не совпала —
 * ключи подгоняются под новую длину.
 */
let employeeRowSeq = 0;

function useRowKeys(length: number) {
    const [keys, setKeys] = useState<number[]>(() => Array.from({length}, () => ++employeeRowSeq));

    // Подгонка во время рендера — штатный приём React для состояния, зависящего от пропсов.
    if (keys.length !== length) {
        setKeys(keys.length > length
            ? keys.slice(0, length)
            : [...keys, ...Array.from({length: length - keys.length}, () => ++employeeRowSeq)]);
    }

    return {
        keyAt: (i: number) => keys[i] ?? `row-${i}`,
        added: () => setKeys((k) => [...k, ++employeeRowSeq]),
        removed: (i: number) => setKeys((k) => k.filter((_, j) => j !== i)),
    };
}

export function SzHrForm({
    schema, employees, onEmployeesChange, values, onValuesChange, users, orgUnits, editable,
}: Props) {
    const {t} = useTranslation();

    // Дерево СП для модалки выбора — как у поля «Адресат — структурное подразделение».
    const unitOptions = useMemo(
        () => orgUnits.map((u) => ({
            key: String(u.id),
            label: u.name,
            parentId: u.parentId != null ? String(u.parentId) : undefined,
        })),
        [orgUnits],
    );

    const sharedFields = useMemo(() => schema?.fields.filter((f) => !f.perEmployee) ?? [], [schema]);
    const perEmployeeFields = useMemo(() => schema?.fields.filter((f) => f.perEmployee) ?? [], [schema]);
    const rowKeys = useRowKeys(employees.length);

    if (!schema) {
        return (
            <p className="mt-3 text-[12.5px] text-[#8b97ab]">
                {/* Выберите вид кадровой записки — под него появятся нужные поля. */}
                {t("szCard.fields.hrFormPickKind")}
            </p>
        );
    }

    const addEmployee = () => {
        // Пустая строка, а не сразу первый из списка: подставленный человек легко
        // уезжает в согласование незамеченным.
        onEmployeesChange([...employees, {fullName: "", userId: null, orgUnitId: null, values: {}}]);
        rowKeys.added();
    };

    // Для записки с одним сотрудником второго добавить нельзя.
    const canAdd = editable && (schema.allowMultipleEmployees || employees.length === 0);

    const replaceEmployee = (i: number, e: SzEmployee) =>
        onEmployeesChange(employees.map((x, j) => (j === i ? e : x)));

    const removeEmployee = (i: number) => {
        onEmployeesChange(employees.filter((_, j) => j !== i));
        rowKeys.removed(i);
    };

    const pickEmployee = (i: number, userId: number) => {
        const u = users.find((x) => x.id === userId);
        if (!u) return;

        replaceEmployee(i, {
            ...employees[i],
            userId: u.id,
            fullName: u.fullName,
            position: u.position ?? employees[i].position,
            orgUnitId: u.orgUnitId ?? employees[i].orgUnitId,
        });
    };

    // Подразделение
    const unitLabel = t("szCard.fields.hrUnit");
    // Убрать сотрудника
    const removeLabel = t("szCard.fields.hrRemoveEmployee");

    const readOnlyBox = (text: string) => (
        <div className={`${fieldClass} flex items-center bg-[#f8fafc] text-[#55617a]`}>{text || "—"}</div>
    );

    /** СП через модалку выбора (дерево с поиском) вместо плоского выпадающего списка. */
    const renderOrgUnitSelect = (label: string, id: number | null | undefined, onPick: (id: number | null) => void, required?: boolean) =>
        editable ? (
            <SingleSelectListField
                accent="blue"
                label={label}
                required={required}
                modalTitle={label}
                options={unitOptions}
                selectedKey={id != null ? String(id) : null}
                onChange={(key) => onPick(key ? Number(key) : null)}
                searchPlaceholder={t("szCard.fields.unitSearch")}
                placeholder={t("szCard.fields.notSelected")}
                boldLabel={false}
            />
        ) : (
            <div className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8b97ab]">{label}</span>
                {readOnlyBox(orgUnits.find((u) => u.id === id)?.name ?? "")}
            </div>
        );

    const getValue = (f: HrFieldSchema, source: Record<string, unknown>) => source[f.code];

    const renderInput = (
        f: HrFieldSchema,
        source: Record<string, unknown>,
        apply: (v: unknown) => void,
    ) => {
        const v = getValue(f, source);

        switch (f.type) {
            case "checkbox":
                return (
                    <div className="flex h-10 items-center">
                        <PlainCheckbox tone="brand" checked={Boolean(v)} disabled={!editable} onChange={apply}>
                            {f.label}
                        </PlainCheckbox>
                    </div>
                );

            case "select":
                // Общий SelectDropdown вместо нативного <select>, как у поля «Вид записки».
                return editable ? (
                    <SelectDropdown
                        accent="blue"
                        value={(v as string) ?? ""}
                        onChange={(val) => apply(val || null)}
                        options={[
                            {value: "", label: t("szCard.fields.notSelected")}, // Не выбрано
                            ...(f.options ?? []).map((o) => ({value: o, label: o})),
                        ]}
                        minWidth="100%"
                        className="w-full"
                    />
                ) : readOnlyBox((v as string) ?? "");

            case "orgUnit":
                return renderOrgUnitSelect(f.label, v as number | null, apply, f.required);

            case "date":
                return <HrDateField value={v} disabled={!editable} onChange={apply}/>;

            case "money":
            case "number":
                return (
                    <input type="number" step={f.type === "money" ? "0.01" : "1"} className={fieldClass}
                           value={(v as number) ?? ""} disabled={!editable}
                           onChange={(e) => apply(e.target.value ? Number(e.target.value) : null)}/>
                );

            default:
                return (
                    <input className={fieldClass} value={(v as string) ?? ""} disabled={!editable}
                           onChange={(e) => apply(e.target.value)}/>
                );
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-4">
            {/* Сотрудники */}
            <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[11.5px] text-[#8b97ab]">
                        {/* Сотрудники / Сотрудник */}
                        {schema.allowMultipleEmployees ? t("szCard.fields.hrEmployeesLabel") : t("szCard.fields.hrEmployeeLabel")}
                        {employees.length > 0 && `: ${employees.length}`}
                    </span>
                </div>

                {(canAdd || employees.length === 0) && (
                    <div
                        tabIndex={canAdd ? 0 : undefined}
                        role={canAdd ? "button" : undefined}
                        onClick={() => { if (canAdd) addEmployee(); }}
                        onKeyDown={(e) => {
                            if (!canAdd) return;
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                addEmployee();
                            }
                        }}
                        className={`${employees.length > 0 ? "mb-2 " : ""}rounded-[9px] border border-dashed border-[#d6dded] bg-[#fafbfd] px-4 py-5 text-center text-[13px] text-[#8b97ab] outline-none transition-colors ${
                            canAdd ? "cursor-pointer hover:border-[#b9c8e8] focus:border-[#2f68f5]" : ""}`}
                    >
                        {employees.length === 0 && (
                            <>
                                {/* Сотрудники не указаны */}
                                {t("szCard.fields.hrEmployeesEmpty")}
                                <div className="mt-1.5 text-[11.5px] text-[#a6b0c2]">
                                    {/* Можно указать несколько сотрудников / Нужен один сотрудник */}
                                    {schema.allowMultipleEmployees ? t("szCard.fields.hrEmployeesHintMany") : t("szCard.fields.hrEmployeesHintOne")}
                                </div>
                            </>
                        )}
                        {canAdd && (
                            <div className={`${employees.length === 0 ? "mt-2 " : ""}flex items-center justify-center gap-1 text-[12.5px] text-[#2f68f5]`}>
                                <Plus size={13} strokeWidth={2.5}/>
                                {/* добавить / Добавить ещё сотрудников */}
                                {employees.length === 0 ? t("szCard.fields.hrAdd") : t("szCard.fields.hrAddMore")}
                            </div>
                        )}
                    </div>
                )}

                {employees.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {employees.map((e, i) => (
                            <div key={rowKeys.keyAt(i)} className="rounded-[10px] border border-[#eef2f7] bg-[#fafbfd] p-3">
                                <div className="flex items-start gap-2">
                                    <div className="grid flex-1 gap-2" style={{gridTemplateColumns: "1fr 1fr"}}>
                                        {schema.employeeMayBeExternal ? (
                                            <label className="flex flex-col gap-1">
                                                {/* ФИО */}
                                                <span className="text-[11px] text-[#8b97ab]">{t("szCard.fields.hrFullName")}</span>
                                                <input className={fieldClass} value={e.fullName} disabled={!editable}
                                                       // Фамилия Имя Отчество
                                                       placeholder={t("szCard.fields.hrFullNamePlaceholder")}
                                                       onChange={(ev) => replaceEmployee(i, {...e, fullName: ev.target.value})}/>
                                            </label>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {/* Сотрудник */}
                                                <span className="text-[11px] text-[#8b97ab]">{t("szCard.fields.hrEmployeeLabel")}</span>
                                                {editable ? (
                                                    <UserPickerField
                                                        accent="blue"
                                                        people={users}
                                                        value={e.userId ?? null}
                                                        placeholder={t("szCard.fields.hrEmployeePick")}
                                                        modalTitle={t("szCard.fields.hrEmployeeModalTitle")}
                                                        searchPlaceholder={t("szCard.fields.userSearch")}
                                                        onChange={(id) => pickEmployee(i, id)}
                                                    />
                                                ) : readOnlyBox(e.fullName)}
                                            </div>
                                        )}

                                        {renderOrgUnitSelect(unitLabel, e.orgUnitId, (id) => replaceEmployee(i, {...e, orgUnitId: id}))}

                                        {perEmployeeFields.map((f) => (
                                            <div key={f.code} className="flex flex-col gap-1">
                                                {f.type !== "checkbox" && f.type !== "orgUnit" && (
                                                    <span className="text-[11px] text-[#8b97ab]">
                                                        {f.label}{f.required && <span className="text-[#c0392b]"> *</span>}
                                                    </span>
                                                )}
                                                {renderInput(f, e.values ?? {}, (v) =>
                                                    replaceEmployee(i, {...e, values: {...(e.values ?? {}), [f.code]: v}}))}
                                            </div>
                                        ))}
                                    </div>

                                    {editable && (
                                        <div className="mt-5">
                                            <Tooltip content={removeLabel} side="top">
                                                <button type="button" onClick={() => removeEmployee(i)} aria-label={removeLabel}
                                                        className="cursor-pointer border-none bg-transparent p-1 text-[#55617a] hover:text-[#c0392b]">
                                                    <X size={15}/>
                                                </button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Общие поля вида */}
            {sharedFields.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {sharedFields.map((f) => (
                        <div key={f.code} className="flex flex-col gap-1">
                            {f.type !== "checkbox" && f.type !== "orgUnit" && (
                                <span className="text-[11.5px] text-[#8b97ab]">
                                    {f.label}{f.required && <span className="text-[#c0392b]"> *</span>}
                                </span>
                            )}
                            {renderInput(f, values, (v) => onValuesChange({...values, [f.code]: v}))}
                            {f.hint && (
                                <span className="text-[11px] leading-[1.4] text-[#a3adbd]">{f.hint}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
