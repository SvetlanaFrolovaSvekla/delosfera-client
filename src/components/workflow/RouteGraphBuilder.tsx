import {useState, type ReactNode} from "react";
import {
    Plus, Trash2, GripVertical, Users, User as UserIcon, Building2,
    GitBranch, ArrowDown, FileText, CheckCircle2, Split, Clock, PenLine, ShieldCheck,
    Copy, ChevronDown, ChevronRight, AlertTriangle,
} from "lucide-react";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {
    STEP_KIND_TITLE, SIGNATURE_LEVEL_TITLE,
    type RouteRoleOption, type RouteConditionOption, type TemplateStep, type TemplateParticipant,
} from "@/service/workflowService/workflowService.ts";

/**
 * Графический конструктор маршрута согласования (BPMN-1).
 *
 * Маршрут — это поток: сверху вниз идут этапы, каждый этап — узел. Внутри узла
 * согласующие: человек, подразделение или роль (роль разрешается в человека при
 * запуске, поэтому маршрут переживает смену людей в должностях). Этап-развилка
 * (режим «Параллельно») ветвит поток — согласующие получают документ одновременно
 * и сходятся обратно перед следующим этапом. Условный этап включается только когда
 * поток сообщает его условие.
 *
 * Модель плоская: этап это RouteTemplateStep(Order, Mode, Kind, Condition,
 * Participants). Параллельность и условия живут на самом этапе, поэтому граф — это
 * вертикальная цепочка узлов с развилками внутри, а не свободный BPMN-холст.
 * Линейные шаблоны (все этапы Sequential, по одному согласующему) открываются и
 * правятся здесь без изменений.
 */

const KINDS: TemplateStep["kind"][] = ["Approval", "FinalControl", "Signing", "Board"];

/** Название условия из каталога вида документа; если код неизвестен — сам код. */
const conditionTitle = (c: string | null | undefined, catalog: RouteConditionOption[]) =>
    !c ? "" : catalog.find((x) => x.value === c)?.title ?? c;

const input = "h-8 px-2.5 rounded-[8px] border border-[#e5e9f0] bg-white text-[12.5px] outline-none " +
    "focus:border-[#2f68f5]";

/** Пустой этап: согласование по очереди, роль руководителя добавит пользователь. */
const emptyStep = (order: number): TemplateStep => ({
    order,
    mode: "Sequential",
    kind: "Approval",
    isFinalMethodology: false,
    timeNormHours: null,
    quorum: null,
    requiredSignatureLevel: null,
    condition: null,
    participants: [],
});

interface Props {
    steps: TemplateStep[];
    users: PickableUser[];
    units: {id: number; titleRu: string}[];
    roles: RouteRoleOption[];
    /** Каталог условий вида документа; пусто — условных этапов у вида нет. */
    conditions: RouteConditionOption[];
    canEdit: boolean;
    onChange: (steps: TemplateStep[]) => void;
}

export function RouteGraphBuilder({steps, users, units, roles, conditions, canEdit, onChange}: Props) {
    const [dragFrom, setDragFrom] = useState<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    /** Перетаскивание согласующего между этапами: {этап-источник, индекс участника}. */
    const [partDrag, setPartDrag] = useState<{step: number; part: number} | null>(null);

    /** Перенести перетаскиваемого согласующего в конец другого этапа. */
    const moveParticipant = (toStep: number) => {
        const from = partDrag;
        setPartDrag(null);
        if (!from || from.step === toStep) return;

        const moving = steps[from.step]?.participants[from.part];
        if (!moving) return;

        onChange(steps.map((s, i) => {
            if (i === from.step) {
                const participants = s.participants.filter((_, j) => j !== from.part);
                // Источник потерял участника — кворум не должен стать ≥ их числа.
                const quorum = s.quorum != null && s.quorum >= participants.length ? null : s.quorum;
                return {...s, participants, quorum};
            }
            if (i === toStep) return {...s, participants: [...s.participants, moving]};
            return s;
        }));
    };

    /** Свёрнутые этапы (по индексу). Состояние живёт здесь, чтобы работало «свернуть все». */
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const toggleCollapse = (i: number) => setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i); else next.add(i);
        return next;
    });
    // Индексы сдвигаются при добавлении/удалении/переносе — свёрнутость сбрасываем.
    const resetCollapsed = () => setCollapsed(new Set());

    const renumber = (list: TemplateStep[]) => list.map((s, i) => ({...s, order: i + 1}));

    const patchStep = (index: number, patch: Partial<TemplateStep>) =>
        onChange(steps.map((s, i) => (i === index ? {...s, ...patch} : s)));

    const addStep = (at: number) => {
        const next = [...steps];
        next.splice(at, 0, emptyStep(at + 1));
        resetCollapsed();
        onChange(renumber(next));
    };

    const removeStep = (index: number) => {
        resetCollapsed();
        onChange(renumber(steps.filter((_, i) => i !== index)));
    };

    /** Дубль этапа со всеми согласующими и настройками; id снимаем — это новый этап. */
    const duplicateStep = (index: number) => {
        const src = steps[index];
        const copy: TemplateStep = {
            ...src,
            id: undefined,
            participants: src.participants.map((p) => ({...p, id: undefined})),
        };
        const next = [...steps];
        next.splice(index + 1, 0, copy);
        resetCollapsed();
        onChange(renumber(next));
    };

    const move = (from: number, to: number) => {
        if (to < 0 || to >= steps.length || from === to) return;
        const next = [...steps];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        resetCollapsed();
        onChange(renumber(next));
    };

    const drop = (to: number) => {
        if (dragFrom !== null) move(dragFrom, to);
        setDragFrom(null);
        setDragOver(null);
    };

    const totalSla = steps.reduce((sum, s) => sum + (s.timeNormHours ?? 0), 0);

    return (
        <div className="flex flex-col items-center">
            {steps.length > 0 && (
                <div className="mb-2 flex items-center gap-3 text-[12px] text-[#8b97ab]">
                    <span>Этапов: {steps.length}</span>
                    {totalSla > 0 && (
                        <span className="flex items-center gap-1">
                            <Clock size={12}/> суммарный норматив: {totalSla} ч
                        </span>
                    )}
                    {steps.length > 1 && (
                        <button type="button"
                                onClick={() => setCollapsed(collapsed.size === steps.length
                                    ? new Set()
                                    : new Set(steps.map((_, i) => i)))}
                                className="ml-1 text-[#2f68f5] hover:underline">
                            {collapsed.size === steps.length ? "Развернуть все" : "Свернуть все"}
                        </button>
                    )}
                </div>
            )}

            <FlowPill icon={<FileText size={14}/>} tone="#2f68f5" text="Документ отправлен на согласование"/>

            {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center w-full">
                    <Connector label={conditionTitle(step.condition, conditions)}/>

                    {canEdit && dragOver === i && dragFrom !== null && dragFrom !== i && (
                        <div className="w-[520px] max-w-full h-[3px] rounded bg-[#2f68f5] mb-1"/>
                    )}

                    <StepNode
                        step={step}
                        index={i}
                        total={steps.length}
                        users={users}
                        units={units}
                        roles={roles}
                        conditions={conditions}
                        canEdit={canEdit}
                        dragging={dragFrom === i}
                        onDragStart={() => setDragFrom(i)}
                        onDragEnter={() => setDragOver(i)}
                        onDragEnd={() => {
                            setDragFrom(null);
                            setDragOver(null);
                        }}
                        onDrop={() => drop(i)}
                        onChange={(patch) => patchStep(i, patch)}
                        onRemove={() => removeStep(i)}
                        onDuplicate={() => duplicateStep(i)}
                        onMove={(delta) => move(i, i + delta)}
                        collapsed={collapsed.has(i)}
                        onToggleCollapse={() => toggleCollapse(i)}
                        partDragActive={partDrag !== null && partDrag.step !== i}
                        onPartDragStart={(part) => setPartDrag({step: i, part})}
                        onPartDragEnd={() => setPartDrag(null)}
                        onPartDrop={() => moveParticipant(i)}
                    />

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => addStep(i + 1)}
                            title="Вставить этап ниже"
                            className="my-0.5 grid h-6 w-6 place-items-center rounded-full border border-dashed
                                       border-[#c7d2e2] bg-white text-[#8b97ab] hover:border-[#2f68f5]
                                       hover:text-[#2f68f5] transition"
                        >
                            <Plus size={13}/>
                        </button>
                    )}
                </div>
            ))}

            {steps.length === 0 && canEdit && (
                <button
                    type="button"
                    onClick={() => addStep(0)}
                    className="my-3 flex items-center gap-2 rounded-[10px] border border-dashed border-[#c7d2e2]
                               px-5 py-3 text-[13px] font-medium text-[#55617a] hover:bg-[#f6f8fb]"
                >
                    <Plus size={15}/> Добавить первый этап
                </button>
            )}

            <Connector/>
            <FlowPill icon={<CheckCircle2 size={14}/>} tone="#1c7a4d" text="Маршрут согласован"/>

            {canEdit && steps.length > 0 && (
                <button
                    type="button"
                    onClick={() => addStep(steps.length)}
                    className="mt-4 flex items-center gap-2 rounded-[10px] border border-dashed border-[#c7d2e2]
                               px-5 py-2.5 text-[13px] font-medium text-[#55617a] hover:bg-[#f6f8fb]"
                >
                    <Plus size={15}/> Добавить этап в конец
                </button>
            )}
        </div>
    );
}

function FlowPill({icon, text, tone}: {icon: ReactNode; text: string; tone: string}) {
    return (
        <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold"
            style={{background: `${tone}14`, color: tone}}
        >
            {icon}
            {text}
        </div>
    );
}

/** Стрелка между узлами; если этап условный — на связке висит бейдж-развилка условия. */
function Connector({label}: {label?: string | null}) {
    return (
        <div className="flex flex-col items-center">
            <div className="h-3 w-px bg-[#c7d2e2]"/>
            {label && (
                <div className="flex items-center gap-1.5 rounded-full border border-[#f0dcae] bg-[#fdf6e6]
                                px-2.5 py-1 text-[11px] font-medium text-[#8a6d1f]">
                    <GitBranch size={12}/>
                    Если: {label}
                </div>
            )}
            <ArrowDown size={14} className="text-[#c7d2e2]"/>
        </div>
    );
}

function StepNode({
    step, index, total, users, units, roles, conditions, canEdit,
    dragging, onDragStart, onDragEnter, onDragEnd, onDrop, onChange, onRemove, onDuplicate, onMove,
    collapsed, onToggleCollapse, partDragActive, onPartDragStart, onPartDragEnd, onPartDrop,
}: {
    step: TemplateStep;
    index: number;
    total: number;
    users: PickableUser[];
    units: {id: number; titleRu: string}[];
    roles: RouteRoleOption[];
    conditions: RouteConditionOption[];
    canEdit: boolean;
    dragging: boolean;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    onDrop: () => void;
    onChange: (patch: Partial<TemplateStep>) => void;
    onRemove: () => void;
    onDuplicate: () => void;
    onMove: (delta: number) => void;
    /** Свёрнут ли узел — состоянием владеет builder (для «свернуть все»). */
    collapsed: boolean;
    onToggleCollapse: () => void;
    /** Тащат согласующего с другого этапа — этот этап можно подсветить как приёмник. */
    partDragActive: boolean;
    onPartDragStart: (part: number) => void;
    onPartDragEnd: () => void;
    onPartDrop: () => void;
}) {
    const parallel = step.mode === "Parallel";

    // Проблемы этапа — те же правила, что валидирует страница и сервер; показываем прямо
    // на узле, чтобы было видно, где чинить, а не только сводкой сверху.
    const problems: string[] = [];
    if (step.participants.length === 0) problems.push("нет согласующих");
    if (parallel && step.participants.length > 1 && !step.participants.some((p) => p.required))
        problems.push("нет обязательного");
    if (step.participants.some((p) => p.userId == null && p.unitId == null && !p.roleRef))
        problems.push("участник не выбран");
    if (step.isFinalMethodology && index !== total - 1) problems.push("методолог не последний");

    const addParticipant = () =>
        onChange({
            participants: [
                ...step.participants,
                {userId: null, unitId: null, roleRef: roles[0]?.value ?? "author-head", required: true},
            ],
        });
    const patchParticipant = (pi: number, patch: Partial<TemplateParticipant>) =>
        onChange({participants: step.participants.map((p, i) => (i === pi ? {...p, ...patch} : p))});
    const removeParticipant = (pi: number) => {
        const participants = step.participants.filter((_, i) => i !== pi);
        // Кворум не может быть ≥ числа согласующих — иначе это «нужны все» (null).
        const quorum = step.quorum != null && step.quorum >= participants.length ? null : step.quorum;
        onChange({participants, quorum});
    };

    return (
        <div
            onDragEnter={canEdit ? onDragEnter : undefined}
            onDragOver={canEdit ? (e) => e.preventDefault() : undefined}
            onDrop={canEdit ? onDrop : undefined}
            className="w-[560px] max-w-full rounded-[13px] border bg-white transition"
            style={{
                borderColor: parallel ? "#cbddff" : "#e5e9f0",
                opacity: dragging ? 0.4 : 1,
                boxShadow: "0 1px 2px rgba(16,27,45,.04)",
            }}
        >
            <div
                className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#eef2f7]"
                style={{background: parallel ? "#f5f9ff" : "#fbfcfe"}}
            >
                {canEdit && (
                    <span
                        draggable
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        title="Перетащите, чтобы изменить порядок"
                        className="cursor-grab active:cursor-grabbing text-[#b7c0cf] hover:text-[#6b7688]"
                    >
                        <GripVertical size={16}/>
                    </span>
                )}

                <button
                    type="button" onClick={onToggleCollapse}
                    title={collapsed ? "Развернуть этап" : "Свернуть этап"}
                    className="grid h-6 w-5 flex-none place-items-center rounded-[6px] text-[#8b97ab] hover:bg-[#eef2f7]"
                >
                    {collapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
                </button>

                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#2f68f5]
                                 text-[11px] font-bold text-white">
                    {step.order}
                </span>

                {collapsed ? (
                    <span className="flex-1 min-w-0 flex items-center gap-2 text-[12.5px] text-[#2b3852] truncate">
                        <span className="font-medium">{STEP_KIND_TITLE[step.kind]}</span>
                        <span className="text-[#8b97ab]">·</span>
                        <span className="text-[#55617a]">
                            {parallel ? "параллельно" : "по очереди"}
                            {parallel && step.quorum ? ` (кворум ${step.quorum}/${step.participants.length})` : ""}
                        </span>
                        <span className="text-[#8b97ab]">·</span>
                        <span className="text-[#8b97ab]">согл.: {step.participants.length}</span>
                    </span>
                ) : (
                    <>
                        <select
                            className={`${input} w-[172px]`} value={step.kind} disabled={!canEdit}
                            onChange={(e) => onChange({kind: e.target.value as TemplateStep["kind"]})}
                        >
                            {KINDS.map((k) => <option key={k} value={k}>{STEP_KIND_TITLE[k]}</option>)}
                        </select>

                        <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => onChange(parallel
                                ? {mode: "Sequential", quorum: null}   // кворум имеет смысл только на развилке
                                : {mode: "Parallel"})}
                            title={parallel ? "Согласуют одновременно" : "Согласуют по очереди"}
                            className="flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border text-[12px] font-medium
                                       disabled:opacity-60"
                            style={{
                                borderColor: parallel ? "#2f68f5" : "#e5e9f0",
                                color: parallel ? "#2f68f5" : "#55617a",
                                background: parallel ? "#eef5ff" : "#fff",
                            }}
                        >
                            {parallel ? <Split size={13}/> : <ArrowDown size={13}/>}
                            {parallel ? "Параллельно" : "По очереди"}
                        </button>

                        {conditions.length > 0 ? (
                            <select
                                className={`${input} flex-1 min-w-0`} value={step.condition ?? ""} disabled={!canEdit}
                                title="Условие включения этапа"
                                onChange={(e) => onChange({condition: e.target.value ? e.target.value : null})}
                            >
                                <option value="">Без условия — всегда</option>
                                {conditions.map((c) => <option key={c.value} value={c.value}>{c.title}</option>)}
                                {/* Условие из другого вида документа — не теряем значение при смене типа. */}
                                {step.condition && !conditions.some((c) => c.value === step.condition) && (
                                    <option value={step.condition}>{step.condition}</option>
                                )}
                            </select>
                        ) : (
                            <span className="flex-1 min-w-0"/>
                        )}
                    </>
                )}

                {problems.length > 0 && (
                    <span className="flex-none flex items-center gap-1 text-[11px] font-medium text-[#b5352f]"
                          title={problems.join("; ")}>
                        <AlertTriangle size={13}/>{problems.length}
                    </span>
                )}

                {canEdit && (
                    <span className="flex items-center flex-none">
                        <button
                            type="button" onClick={onDuplicate}
                            className="grid h-7 w-7 place-items-center rounded-[7px] text-[#8b97ab]
                                       hover:bg-[#f0f3f8]" title="Дублировать этап"
                        >
                            <Copy size={14}/>
                        </button>
                        <button
                            type="button" onClick={() => onMove(-1)} disabled={index === 0}
                            className="grid h-7 w-6 place-items-center rounded-[7px] text-[#8b97ab]
                                       hover:bg-[#f0f3f8] disabled:opacity-30" title="Выше"
                        >↑</button>
                        <button
                            type="button" onClick={() => onMove(1)} disabled={index === total - 1}
                            className="grid h-7 w-6 place-items-center rounded-[7px] text-[#8b97ab]
                                       hover:bg-[#f0f3f8] disabled:opacity-30" title="Ниже"
                        >↓</button>
                        <button
                            type="button" onClick={onRemove}
                            className="grid h-7 w-7 place-items-center rounded-[7px] text-[#b5352f]
                                       hover:bg-[#fdf5f5]" title="Убрать этап"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </span>
                )}
            </div>

            {problems.length > 0 && !collapsed && (
                <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5">
                    {problems.map((p) => (
                        <span key={p} className="rounded-full bg-[#fdecec] px-2.5 py-0.5 text-[11px] font-medium text-[#b5352f]">
                            {p}
                        </span>
                    ))}
                </div>
            )}

            {!collapsed && <div className="p-3.5">
                <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[9px] bg-[#f8fafd]
                                border border-[#eef2f7] px-3 py-2">
                    <label className="flex items-center gap-1.5 text-[12px] text-[#55617a]"
                           title="Норматив на этап в часах; пусто — без срока">
                        <Clock size={13} className="text-[#9aa6b6]"/>
                        Срок, ч:
                        <input
                            type="number" min={0} disabled={!canEdit}
                            className={`${input} w-[74px]`}
                            value={step.timeNormHours ?? ""}
                            placeholder="—"
                            onChange={(e) => onChange({
                                timeNormHours: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                            })}
                        />
                    </label>

                    <label className="flex items-center gap-1.5 text-[12px] text-[#55617a]"
                           title="Чем закрывается этап: без подписи, простой (ПЭП) или квалифицированной (ЭЦП)">
                        <PenLine size={13} className="text-[#9aa6b6]"/>
                        Подпись:
                        <select
                            className={`${input} w-[188px]`} disabled={!canEdit}
                            value={step.requiredSignatureLevel ?? ""}
                            onChange={(e) => onChange({
                                requiredSignatureLevel:
                                    e.target.value ? (e.target.value as "Simple" | "Qualified") : null,
                            })}
                        >
                            <option value="">Без подписи</option>
                            {(Object.keys(SIGNATURE_LEVEL_TITLE) as ("Simple" | "Qualified")[])
                                .map((l) => <option key={l} value={l}>{SIGNATURE_LEVEL_TITLE[l]}</option>)}
                        </select>
                    </label>

                    {step.kind === "FinalControl" && (
                        <label className="flex items-center gap-1.5 text-[12px] text-[#55617a]"
                               title="Финальный контроль Отдела методологии — заключительная виза перед подписанием">
                            <ShieldCheck size={13} className="text-[#9aa6b6]"/>
                            <input
                                type="checkbox" disabled={!canEdit}
                                checked={step.isFinalMethodology}
                                onChange={(e) => onChange({isFinalMethodology: e.target.checked})}
                            />
                            Финальный методолог
                        </label>
                    )}
                </div>

                {step.participants.length === 0 && (
                    <div className="rounded-[8px] bg-[#fdf6e6] px-3 py-2 text-[12px] text-[#8a6d1f]">
                        На этапе нет согласующих — маршрут остановится на нём.
                    </div>
                )}

                {parallel && step.participants.length > 1 && (
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#2f68f5]">
                            <Split size={12}/> Развилка: получат документ одновременно, сойдутся перед следующим этапом
                        </span>
                        <label className="flex items-center gap-1.5 text-[11.5px] text-[#55617a]"
                               title="Сколько согласований из назначенных достаточно, чтобы этап прошёл. Пусто — нужны все.">
                            Кворум:
                            <select
                                className={`${input} h-7 w-[128px]`} disabled={!canEdit}
                                value={step.quorum ?? ""}
                                onChange={(e) => onChange({quorum: e.target.value ? Number(e.target.value) : null})}
                            >
                                <option value="">все ({step.participants.length})</option>
                                {Array.from({length: step.participants.length - 1}, (_, i) => i + 1)
                                    .map((n) => (
                                        <option key={n} value={n}>{n} из {step.participants.length}</option>
                                    ))}
                            </select>
                        </label>
                    </div>
                )}

                <div
                    onDragOver={canEdit && partDragActive ? (e) => e.preventDefault() : undefined}
                    onDrop={canEdit && partDragActive
                        ? (e) => { e.preventDefault(); e.stopPropagation(); onPartDrop(); }
                        : undefined}
                    className={
                        (parallel ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2") +
                        (partDragActive
                            ? " rounded-[9px] outline-dashed outline-2 outline-offset-2 outline-[#8fb4ff]"
                            : "")
                    }
                >
                    {partDragActive && step.participants.length === 0 && (
                        <div className="col-span-2 rounded-[8px] bg-[#f0f6ff] px-3 py-2 text-[12px] text-[#2f68f5]">
                            Перенести согласующего сюда
                        </div>
                    )}
                    {step.participants.map((p, pi) => (
                        <ParticipantRow
                            key={pi}
                            participant={p}
                            users={users}
                            units={units}
                            roles={roles}
                            canEdit={canEdit}
                            parallel={parallel}
                            index={pi}
                            onChange={(patch) => patchParticipant(pi, patch)}
                            onRemove={() => removeParticipant(pi)}
                            onDragStartPart={() => onPartDragStart(pi)}
                            onDragEndPart={onPartDragEnd}
                        />
                    ))}
                </div>

                {canEdit && (
                    <button
                        type="button" onClick={addParticipant}
                        className="mt-2.5 self-start flex items-center gap-1.5 text-[12.5px] font-medium
                                   text-[#2f68f5] hover:underline"
                    >
                        <Plus size={14}/> Добавить согласующего
                    </button>
                )}
            </div>}
        </div>
    );
}

type Mode = "role" | "user" | "unit";

function ParticipantRow({
    participant, users, units, roles, canEdit, parallel, index, onChange, onRemove,
    onDragStartPart, onDragEndPart,
}: {
    participant: TemplateParticipant;
    users: PickableUser[];
    units: {id: number; titleRu: string}[];
    roles: RouteRoleOption[];
    canEdit: boolean;
    parallel: boolean;
    index: number;
    onChange: (patch: Partial<TemplateParticipant>) => void;
    onRemove: () => void;
    /** Начать/закончить перетаскивание этого согласующего на другой этап. */
    onDragStartPart: () => void;
    onDragEndPart: () => void;
}) {
    const mode: Mode =
        participant.userId != null ? "user" : participant.unitId != null ? "unit" : "role";

    /** Способ взаимоисключающий: выбрали человека — роль и подразделение снимаются. */
    const changeMode = (m: Mode) => {
        if (m === "role") onChange({userId: null, unitId: null, roleRef: roles[0]?.value ?? "author-head"});
        else onChange({userId: null, unitId: null, roleRef: null});
    };

    const icon = mode === "user" ? <UserIcon size={13}/>
        : mode === "unit" ? <Building2 size={13}/>
            : <Users size={13}/>;

    return (
        <div className="flex items-center gap-2 rounded-[9px] border border-[#eef2f7] bg-[#fbfcfe] px-2.5 py-2">
            {canEdit && (
                <span
                    draggable
                    onDragStart={onDragStartPart}
                    onDragEnd={onDragEndPart}
                    title="Перетащите согласующего на другой этап"
                    className="cursor-grab active:cursor-grabbing text-[#b7c0cf] hover:text-[#6b7688] flex-none"
                >
                    <GripVertical size={14}/>
                </span>
            )}
            <span
                className="grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-bold text-[#5b6b85]"
                style={{background: parallel ? "#e3edff" : "#eef2f7"}}
                title={parallel ? "Ветка развилки" : `Шаг ${index + 1}`}
            >
                {parallel ? "∥" : index + 1}
            </span>

            <span className="text-[#9aa6b6] flex-none">{icon}</span>

            <select
                className={`${input} w-[118px] flex-none`} value={mode} disabled={!canEdit}
                onChange={(e) => changeMode(e.target.value as Mode)}
            >
                <option value="role">Роль</option>
                <option value="user">Человек</option>
                <option value="unit">Подразделение</option>
            </select>

            <div className="flex-1 min-w-0">
                {mode === "role" && (
                    <select
                        className={`${input} w-full`} value={participant.roleRef ?? ""} disabled={!canEdit}
                        onChange={(e) => onChange({roleRef: e.target.value})}
                    >
                        {roles.map((r) => <option key={r.value} value={r.value}>{r.title}</option>)}
                    </select>
                )}

                {mode === "user" && (
                    <UserPicker
                        users={users} value={participant.userId} disabled={!canEdit} bySeniority
                        onChange={(u) => onChange({userId: u?.id ?? null})}
                    />
                )}

                {mode === "unit" && (() => {
                    // Рук. отдела кодируется unitId (движок разворачивает в руководителя);
                    // куратор — ролью unit-curator:{id}. unitId держим и для куратора — для показа.
                    const unitRole = participant.roleRef?.startsWith("unit-curator:") ? "curator" : "head";
                    const setUnit = (id: number | null) =>
                        onChange({unitId: id, roleRef: unitRole === "curator" && id ? `unit-curator:${id}` : null});
                    const setUnitRole = (r: "head" | "curator") =>
                        onChange({roleRef: r === "curator" && participant.unitId ? `unit-curator:${participant.unitId}` : null});
                    return (
                        <div className="flex gap-2 w-full">
                            <select
                                className={`${input} w-[104px] flex-none`} value={unitRole} disabled={!canEdit}
                                title="Кто из подразделения согласует"
                                onChange={(e) => setUnitRole(e.target.value as "head" | "curator")}
                            >
                                <option value="head">Руковод.</option>
                                <option value="curator">Куратор</option>
                            </select>
                            <select
                                className={`${input} flex-1 min-w-0`} value={participant.unitId ?? ""} disabled={!canEdit}
                                onChange={(e) => setUnit(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">— подразделение —</option>
                                {units.map((u) => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                            </select>
                        </div>
                    );
                })()}
            </div>

            <label className="flex items-center gap-1 text-[11.5px] text-[#55617a] whitespace-nowrap flex-none">
                <input
                    type="checkbox" checked={participant.required} disabled={!canEdit}
                    onChange={(e) => onChange({required: e.target.checked})}
                />
                Обяз.
            </label>

            {canEdit && (
                <button
                    type="button" onClick={onRemove}
                    className="grid h-6 w-6 flex-none place-items-center rounded-[6px] text-[#b5352f]
                               hover:bg-[#fdf5f5]"
                >
                    <Trash2 size={12}/>
                </button>
            )}
        </div>
    );
}
