import {useCallback, useEffect, useState} from "react";
import {Plus, Trash2, GripVertical, ChevronDown, ChevronRight} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/UserPicker.tsx";
import {userService} from "@/service/userService/userService.ts";
import {organizationUnitService}
    from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {
    workflowService, ROUTE_ROLES, STEP_KIND_TITLE,
    type RouteTemplateDetails, type TemplateStep, type TemplateParticipant,
} from "@/service/workflowService/workflowService.ts";

/**
 * Конструктор маршрута согласования: кто согласует, в каком порядке и как этап
 * закрывается.
 *
 * Согласующего задают тремя способами. Конкретный человек — когда этап
 * действительно его личный. Роль — «руководитель подразделения автора»,
 * «председатель Правления»: так маршрут переживает смену людей в должностях,
 * роль разрешается в человека при запуске. Подразделение — когда решает любой из
 * отдела.
 */

const DOC_TYPES: {value: string; title: string}[] = [
    {value: "Sz", title: "Служебная записка"},
    {value: "Procurement", title: "Заявка на закупку"},
    {value: "Vnd", title: "ВНД"},
];

const KINDS: TemplateStep["kind"][] = ["Approval", "FinalControl", "Signing", "Board"];

const input = "h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none " +
    "focus:border-[#2f68f5]";

/** Пустой этап: одно согласование по роли руководителя — самый частый первый шаг. */
const пустойЭтап = (order: number): TemplateStep => ({
    order,
    mode: "Sequential",
    kind: "Approval",
    isFinalMethodology: false,
    timeNormHours: null,
    requiredSignatureLevel: null,
    participants: [],
});

interface Шаблон {
    id: number;
    name: string;
    documentType: string;
}

export function RouteTemplatesPage() {
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.ManageSystemSettings);

    const [list, setList] = useState<Шаблон[]>([]);
    const [selected, setSelected] = useState<RouteTemplateDetails | null>(null);
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [units, setUnits] = useState<{id: number; titleRu: string}[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const loadList = useCallback(async () => {
        try {
            const raw = await workflowService.templates();
            setList(raw.map((t) => ({id: t.id, name: t.name, documentType: t.documentType})));
        } catch {
            setError("Не удалось загрузить список маршрутов");
        }
    }, []);

    useEffect(() => { void loadList(); }, [loadList]);
    useEffect(() => { userService.lookup().then(setUsers).catch(() => setUsers([])); }, []);
    useEffect(() => {
        organizationUnitService.getAll()
            .then((rows) => setUnits(rows.map((u) => ({id: u.id, titleRu: u.titleRu}))))
            .catch(() => setUnits([]));
    }, []);

    const открыть = async (id: number) => {
        try {
            setSelected(await workflowService.template(id));
            setError(null);
        } catch {
            setError("Не удалось открыть маршрут");
        }
    };

    const создать = () => setSelected({
        id: 0,
        name: "",
        documentType: "Sz",
        isGlobalRule: false,
        steps: [пустойЭтап(1)],
    });

    const сохранить = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const request = {
                name: selected.name.trim(),
                documentType: selected.documentType,
                isGlobalRule: selected.isGlobalRule,
                steps: selected.steps,
            };
            if (selected.id === 0) {
                const id = await workflowService.createTemplate(request);
                await открыть(id);
            } else {
                await workflowService.updateTemplate(selected.id, request);
            }
            await loadList();
            setError(null);
        } catch (e) {
            setError(извлечьОшибку(e) ?? "Не удалось сохранить маршрут");
        } finally {
            setBusy(false);
        }
    };

    const удалить = async () => {
        if (!selected || selected.id === 0) { setSelected(null); return; }
        setBusy(true);
        try {
            await workflowService.deleteTemplate(selected.id);
            setSelected(null);
            await loadList();
            setError(null);
        } catch (e) {
            setError(извлечьОшибку(e) ?? "Не удалось удалить маршрут");
        } finally {
            setBusy(false);
        }
    };

    const менятьЭтап = (index: number, patch: Partial<TemplateStep>) => {
        if (!selected) return;
        const steps = selected.steps.map((s, i) => i === index ? {...s, ...patch} : s);
        setSelected({...selected, steps});
    };

    const добавитьЭтап = () => {
        if (!selected) return;
        setSelected({
            ...selected,
            steps: [...selected.steps, пустойЭтап(selected.steps.length + 1)],
        });
    };

    const убратьЭтап = (index: number) => {
        if (!selected) return;
        const steps = selected.steps
            .filter((_, i) => i !== index)
            .map((s, i) => ({...s, order: i + 1}));
        setSelected({...selected, steps});
    };

    /** Двигаем этап: маршрут — это порядок, и переставлять его должно быть легко. */
    const сдвинуть = (index: number, delta: number) => {
        if (!selected) return;
        const target = index + delta;
        if (target < 0 || target >= selected.steps.length) return;
        const steps = [...selected.steps];
        [steps[index], steps[target]] = [steps[target], steps[index]];
        setSelected({...selected, steps: steps.map((s, i) => ({...s, order: i + 1}))});
    };

    return (
        <div className="flex gap-5 p-[22px_26px]" style={{minHeight: "calc(100vh - 120px)"}}>
            <aside className="w-[280px] flex-none">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="m-0 text-[16px] font-semibold text-[#0f1b2d]">Маршруты согласования</h1>
                    {canEdit && (
                        <button onClick={создать}
                                className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#e5e9f0]
                                           bg-white text-[#2f68f5] hover:bg-[#f6f8fb]">
                            <Plus size={16}/>
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    {list.map((t) => (
                        <button key={t.id} onClick={() => void открыть(t.id)}
                                className="flex flex-col items-start rounded-[9px] border px-3 py-2 text-left transition"
                                style={{
                                    borderColor: selected?.id === t.id ? "#2f68f5" : "#eef2f7",
                                    background: selected?.id === t.id ? "#f5f8ff" : "#fff",
                                }}>
                            <span className="text-[13px] font-medium text-[#1c2740]">{t.name}</span>
                            <span className="text-[11.5px] text-[#8b97ab]">{docTitle(t.documentType)}</span>
                        </button>
                    ))}
                    {list.length === 0 && (
                        <div className="text-[13px] text-[#8b97ab]">Маршрутов пока нет.</div>
                    )}
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                {error && (
                    <div className="mb-3 rounded-[9px] border border-[#f3c9c9] bg-[#fdf0f0] px-4 py-2.5
                                    text-[13px] text-[#b5352f]">
                        {error}
                    </div>
                )}

                {!selected && (
                    <div className="grid place-items-center h-full text-[14px] text-[#8b97ab]">
                        Выберите маршрут слева или создайте новый.
                    </div>
                )}

                {selected && (
                    <div className="flex flex-col gap-4 max-w-[860px]">
                        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                            <div className="flex flex-wrap gap-3">
                                <label className="flex-1 min-w-[280px]">
                                    <span className="block text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd] mb-1">
                                        Название
                                    </span>
                                    <input className={`${input} w-full`} value={selected.name} disabled={!canEdit}
                                           placeholder="Например: Кадровая записка — приём"
                                           onChange={(e) => setSelected({...selected, name: e.target.value})}/>
                                </label>
                                <label className="w-[220px]">
                                    <span className="block text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd] mb-1">
                                        Тип документа
                                    </span>
                                    <select className={`${input} w-full`} value={selected.documentType} disabled={!canEdit}
                                            onChange={(e) => setSelected({...selected, documentType: e.target.value})}>
                                        {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.title}</option>)}
                                    </select>
                                </label>
                            </div>
                        </div>

                        {selected.steps.map((step, i) => (
                            <StepCard
                                key={i}
                                step={step}
                                index={i}
                                total={selected.steps.length}
                                users={users}
                                units={units}
                                canEdit={canEdit}
                                onChange={(patch) => менятьЭтап(i, patch)}
                                onRemove={() => убратьЭтап(i)}
                                onMove={(delta) => сдвинуть(i, delta)}
                            />
                        ))}

                        {canEdit && (
                            <button onClick={добавитьЭтап}
                                    className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed
                                               border-[#c7d2e2] py-3 text-[13px] font-medium text-[#55617a] hover:bg-[#f6f8fb]">
                                <Plus size={15}/> Добавить этап
                            </button>
                        )}

                        {canEdit && (
                            <div className="flex items-center gap-2 pt-1">
                                <button onClick={() => void сохранить()} disabled={busy}
                                        className="h-9 px-5 rounded-[9px] bg-[#2f68f5] text-white text-[13px] font-semibold
                                                   hover:brightness-[1.06] disabled:opacity-50">
                                    Сохранить
                                </button>
                                <button onClick={() => void удалить()} disabled={busy}
                                        className="h-9 px-4 rounded-[9px] border border-[#f0d2d2] bg-white text-[#b5352f]
                                                   text-[13px] font-medium hover:bg-[#fdf5f5]">
                                    {selected.id === 0 ? "Отменить" : "Удалить маршрут"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function StepCard({step, index, total, users, units, canEdit, onChange, onRemove, onMove}: {
    step: TemplateStep;
    index: number;
    total: number;
    users: PickableUser[];
    units: {id: number; titleRu: string}[];
    canEdit: boolean;
    onChange: (patch: Partial<TemplateStep>) => void;
    onRemove: () => void;
    onMove: (delta: number) => void;
}) {
    const [open, setOpen] = useState(true);

    const добавитьУчастника = () => {
        onChange({participants: [...step.participants, {userId: null, unitId: null, roleRef: null, required: true}]});
    };
    const менятьУчастника = (pi: number, patch: Partial<TemplateParticipant>) => {
        onChange({participants: step.participants.map((p, i) => i === pi ? {...p, ...patch} : p)});
    };
    const убратьУчастника = (pi: number) => {
        onChange({participants: step.participants.filter((_, i) => i !== pi)});
    };

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#eef2f7]">
                <button onClick={() => setOpen((v) => !v)} className="text-[#a3adbd]">
                    {open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </button>

                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#eef2f7]
                                 text-[11px] font-semibold text-[#5b6b85]">
                    {step.order}
                </span>

                <select className={`${input} w-[190px]`} value={step.kind} disabled={!canEdit}
                        onChange={(e) => onChange({kind: e.target.value as TemplateStep["kind"]})}>
                    {KINDS.map((k) => <option key={k} value={k}>{STEP_KIND_TITLE[k]}</option>)}
                </select>

                <select className={`${input} w-[150px]`} value={step.mode} disabled={!canEdit}
                        onChange={(e) => onChange({mode: e.target.value as TemplateStep["mode"]})}>
                    <option value="Sequential">По очереди</option>
                    <option value="Parallel">Всем сразу</option>
                </select>

                <span className="flex-1"/>

                {canEdit && (
                    <>
                        <button onClick={() => onMove(-1)} disabled={index === 0}
                                className="grid h-7 w-7 place-items-center rounded-[7px] text-[#8b97ab]
                                           hover:bg-[#f6f8fb] disabled:opacity-30" title="Выше">↑</button>
                        <button onClick={() => onMove(1)} disabled={index === total - 1}
                                className="grid h-7 w-7 place-items-center rounded-[7px] text-[#8b97ab]
                                           hover:bg-[#f6f8fb] disabled:opacity-30" title="Ниже">↓</button>
                        <button onClick={onRemove}
                                className="grid h-7 w-7 place-items-center rounded-[7px] text-[#b5352f]
                                           hover:bg-[#fdf5f5]" title="Убрать этап">
                            <Trash2 size={14}/>
                        </button>
                    </>
                )}
            </div>

            {open && (
                <div className="p-4 flex flex-col gap-2.5">
                    {step.participants.length === 0 && (
                        <div className="rounded-[8px] bg-[#fdf6e6] px-3 py-2 text-[12.5px] text-[#8a6d1f]">
                            На этапе нет согласующих — маршрут остановится на нём.
                        </div>
                    )}

                    {step.participants.map((p, pi) => (
                        <ParticipantRow
                            key={pi}
                            participant={p}
                            users={users}
                            units={units}
                            canEdit={canEdit}
                            onChange={(patch) => менятьУчастника(pi, patch)}
                            onRemove={() => убратьУчастника(pi)}
                        />
                    ))}

                    {canEdit && (
                        <button onClick={добавитьУчастника}
                                className="self-start flex items-center gap-1.5 text-[12.5px] font-medium text-[#2f68f5]
                                           hover:underline">
                            <Plus size={14}/> Добавить согласующего
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

type Способ = "role" | "user" | "unit";

function ParticipantRow({participant, users, units, canEdit, onChange, onRemove}: {
    participant: TemplateParticipant;
    users: PickableUser[];
    units: {id: number; titleRu: string}[];
    canEdit: boolean;
    onChange: (patch: Partial<TemplateParticipant>) => void;
    onRemove: () => void;
}) {
    const способ: Способ =
        participant.userId != null ? "user" : participant.unitId != null ? "unit" : "role";

    /** Способ взаимоисключающий: выбрали человека — роль и подразделение снимаются. */
    const сменитьСпособ = (s: Способ) => {
        if (s === "user") onChange({userId: null, unitId: null, roleRef: null});
        if (s === "unit") onChange({userId: null, unitId: null, roleRef: null});
        if (s === "role") onChange({userId: null, unitId: null, roleRef: ROUTE_ROLES[0].value});
    };

    return (
        <div className="flex items-center gap-2 rounded-[9px] border border-[#eef2f7] px-3 py-2">
            <GripVertical size={14} className="text-[#c7d0dc] flex-none"/>

            <select className={`${input} w-[130px]`} value={способ} disabled={!canEdit}
                    onChange={(e) => сменитьСпособ(e.target.value as Способ)}>
                <option value="role">Роль</option>
                <option value="user">Человек</option>
                <option value="unit">Подразделение</option>
            </select>

            <div className="flex-1 min-w-0">
                {способ === "role" && (
                    <select className={`${input} w-full`} value={participant.roleRef ?? ""} disabled={!canEdit}
                            onChange={(e) => onChange({roleRef: e.target.value})}>
                        {ROUTE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.title}</option>)}
                    </select>
                )}

                {способ === "user" && (
                    <UserPicker users={users} value={participant.userId}
                                disabled={!canEdit}
                                onChange={(u) => onChange({userId: u?.id ?? null})}/>
                )}

                {способ === "unit" && (
                    <select className={`${input} w-full`} value={participant.unitId ?? ""} disabled={!canEdit}
                            onChange={(e) => onChange({unitId: e.target.value ? Number(e.target.value) : null})}>
                        <option value="">— выберите подразделение —</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                    </select>
                )}
            </div>

            <label className="flex items-center gap-1.5 text-[12px] text-[#55617a] whitespace-nowrap">
                <input type="checkbox" checked={participant.required} disabled={!canEdit}
                       onChange={(e) => onChange({required: e.target.checked})}/>
                Обязателен
            </label>

            {canEdit && (
                <button onClick={onRemove}
                        className="grid h-7 w-7 place-items-center rounded-[7px] text-[#b5352f] hover:bg-[#fdf5f5]">
                    <Trash2 size={13}/>
                </button>
            )}
        </div>
    );
}

const docTitle = (t: string) => DOC_TYPES.find((d) => d.value === t)?.title ?? t;

function извлечьОшибку(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        const r = (e as {response?: {data?: {message?: string}}}).response;
        return r?.data?.message ?? null;
    }
    return null;
}
