import {useMemo} from "react";
import {Plus, X} from "lucide-react";
import type {
    HrFieldSchema,
    HrFormSchema,
    SzEmployee,
} from "@/service/szService/szService.ts";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/UserPicker.tsx";

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

interface Props {
    schema: HrFormSchema | null;
    employees: SzEmployee[];
    onEmployeesChange: (list: SzEmployee[]) => void;

    /** Общие значения записки — те поля, что не помечены perEmployee. */
    values: Record<string, unknown>;
    onValuesChange: (values: Record<string, unknown>) => void;

    users: PickableUser[];
    orgUnits: {id: number; name: string}[];
    editable: boolean;
}

const поле = "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5] disabled:bg-[#f8fafc]";

export function SzHrForm({
    schema, employees, onEmployeesChange, values, onValuesChange, users, orgUnits, editable,
}: Props) {
    const общие = useMemo(() => schema?.fields.filter((f) => !f.perEmployee) ?? [], [schema]);
    const личные = useMemo(() => schema?.fields.filter((f) => f.perEmployee) ?? [], [schema]);

    if (!schema) {
        return (
            <p className="mt-3 text-[12.5px] text-[#8b97ab]">
                Выберите вид кадровой записки — под него появятся нужные поля.
            </p>
        );
    }

    const добавить = () => {
        // Пустая строка, а не сразу первый из списка: подставленный человек легко
        // уезжает в согласование незамеченным.
        onEmployeesChange([...employees, {fullName: "", userId: null, orgUnitId: null, values: {}}]);
    };

    const заменить = (i: number, e: SzEmployee) =>
        onEmployeesChange(employees.map((x, j) => (j === i ? e : x)));

    const убрать = (i: number) => onEmployeesChange(employees.filter((_, j) => j !== i));

    const выбратьСотрудника = (i: number, userId: number) => {
        const u = users.find((x) => x.id === userId);
        if (!u) return;

        заменить(i, {
            ...employees[i],
            userId: u.id,
            fullName: u.fullName,
            position: u.position ?? employees[i].position,
            orgUnitId: u.orgUnitId ?? employees[i].orgUnitId,
        });
    };

    const значение = (f: HrFieldSchema, источник: Record<string, unknown>) => источник[f.code];

    const поле_ввода = (
        f: HrFieldSchema,
        источник: Record<string, unknown>,
        применить: (v: unknown) => void,
    ) => {
        const v = значение(f, источник);

        switch (f.type) {
            case "checkbox":
                return (
                    <label className="flex h-10 items-center gap-2 text-[13px] text-[#55617a]">
                        <input type="checkbox" checked={Boolean(v)} disabled={!editable}
                               onChange={(e) => применить(e.target.checked)}/>
                        {f.label}
                    </label>
                );

            case "select":
                return (
                    <select className={поле} value={(v as string) ?? ""} disabled={!editable}
                            onChange={(e) => применить(e.target.value || null)}>
                        <option value="">Не выбрано</option>
                        {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                );

            case "orgUnit":
                return (
                    <select className={поле} value={(v as number) ?? ""} disabled={!editable}
                            onChange={(e) => применить(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Не выбрано</option>
                        {orgUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                );

            case "date":
                return (
                    <input type="date" className={поле} value={(v as string) ?? ""} disabled={!editable}
                           onChange={(e) => применить(e.target.value || null)}/>
                );

            case "money":
            case "number":
                return (
                    <input type="number" step={f.type === "money" ? "0.01" : "1"} className={поле}
                           value={(v as number) ?? ""} disabled={!editable}
                           onChange={(e) => применить(e.target.value ? Number(e.target.value) : null)}/>
                );

            default:
                return (
                    <input className={поле} value={(v as string) ?? ""} disabled={!editable}
                           onChange={(e) => применить(e.target.value)}/>
                );
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-4">
            {/* ── сотрудники ─────────────────────────────── */}
            <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[11.5px] text-[#8b97ab]">
                        {schema.allowMultipleEmployees ? "Сотрудники" : "Сотрудник"}
                        {employees.length > 0 && `: ${employees.length}`}
                    </span>
                    {editable && (schema.allowMultipleEmployees || employees.length === 0) && (
                        <button type="button" onClick={добавить}
                                className="flex items-center gap-1 border-none bg-transparent p-0 text-[12.5px] text-[#2f68f5]">
                            <Plus size={13} strokeWidth={2.5}/>
                            добавить
                        </button>
                    )}
                </div>

                {employees.length === 0 ? (
                    <div className="rounded-[9px] border border-dashed border-[#e5e9f0] px-3 py-4 text-center text-[12.5px] text-[#a6b0c2]">
                        Сотрудники не указаны
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {employees.map((e, i) => (
                            <div key={i} className="rounded-[10px] border border-[#eef2f7] bg-[#fafbfd] p-3">
                                <div className="flex items-start gap-2">
                                    <div className="grid flex-1 gap-2" style={{gridTemplateColumns: "1fr 1fr"}}>
                                        {schema.employeeMayBeExternal ? (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] text-[#8b97ab]">ФИО</span>
                                                <input className={поле} value={e.fullName} disabled={!editable}
                                                       placeholder="Фамилия Имя Отчество"
                                                       onChange={(ev) => заменить(i, {...e, fullName: ev.target.value})}/>
                                            </label>
                                        ) : (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-[11px] text-[#8b97ab]">Сотрудник</span>
                                                <UserPicker
                                                    users={users}
                                                    value={e.userId ?? null}
                                                    disabled={!editable}
                                                    placeholder="Найти сотрудника"
                                                    onChange={(u) => u && выбратьСотрудника(i, u.id)}
                                                />
                                            </label>
                                        )}

                                        <label className="flex flex-col gap-1">
                                            <span className="text-[11px] text-[#8b97ab]">Подразделение</span>
                                            <select className={поле} value={e.orgUnitId ?? ""} disabled={!editable}
                                                    onChange={(ev) => заменить(i, {
                                                        ...e,
                                                        orgUnitId: ev.target.value ? Number(ev.target.value) : null,
                                                    })}>
                                                <option value="">Не выбрано</option>
                                                {orgUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </label>

                                        {личные.map((f) => (
                                            <label key={f.code} className="flex flex-col gap-1">
                                                {f.type !== "checkbox" && (
                                                    <span className="text-[11px] text-[#8b97ab]">
                                                        {f.label}{f.required && " *"}
                                                    </span>
                                                )}
                                                {поле_ввода(f, e.values ?? {}, (v) =>
                                                    заменить(i, {...e, values: {...(e.values ?? {}), [f.code]: v}}))}
                                            </label>
                                        ))}
                                    </div>

                                    {editable && (
                                        <button type="button" onClick={() => убрать(i)} title="Убрать сотрудника"
                                                className="mt-5 border-none bg-transparent p-1 text-[#55617a] hover:text-[#c0392b]">
                                            <X size={15}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── общие поля вида ────────────────────────── */}
            {общие.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {общие.map((f) => (
                        <label key={f.code} className="flex flex-col gap-1">
                            {f.type !== "checkbox" && (
                                <span className="text-[11.5px] text-[#8b97ab]">
                                    {f.label}{f.required && " *"}
                                </span>
                            )}
                            {поле_ввода(f, values, (v) => onValuesChange({...values, [f.code]: v}))}
                            {f.hint && (
                                <span className="text-[11px] leading-[1.4] text-[#a3adbd]">{f.hint}</span>
                            )}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
