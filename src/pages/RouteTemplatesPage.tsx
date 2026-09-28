import {useCallback, useEffect, useRef, useState} from "react";
import {Plus, Users, CheckCircle2, AlertTriangle, GitBranch} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {type PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {userService} from "@/service/userService/userService.ts";
import {organizationUnitService}
    from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {
    workflowService, ROUTE_ROLES, STEP_KIND_TITLE,
    type RouteRoleOption, type RouteConditionOption, type RolePreviewItem,
    type RouteTemplateDetails, type TemplateStep,
} from "@/service/workflowService/workflowService.ts";
import {RouteGraphBuilder} from "@/components/workflow/RouteGraphBuilder.tsx";

/**
 * Графический конструктор маршрутов согласования (BPMN-1).
 *
 * Слева — список маршрутов, справа — визуальный редактор потока: этапы идут узлами
 * сверху вниз, внутри узла согласующие (человек, подразделение или роль), развилки
 * (все согласуют сразу) и условные этапы. Узлы переставляются перетаскиванием.
 * Граф — прямое отображение модели RouteTemplate: узел ↔ RouteTemplateStep
 * (Order/Mode/Kind/Condition + Participants). Линейные шаблоны открываются здесь без
 * изменений — это та же цепочка узлов, просто без развилок.
 */

const DOC_TYPES: {value: string; title: string}[] = [
    {value: "Sz", title: "Служебная записка"},
    {value: "Procurement", title: "Заявка на закупку"},
    {value: "Vnd", title: "ВНД"},
];

const input = "h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none " +
    "focus:border-[#2f68f5]";

/** Пустой этап нового маршрута: согласование по очереди, согласующего добавят в узле. */
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

interface Brief {
    id: number;
    name: string;
    documentType: string;
}

export function RouteTemplatesPage() {
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.ManageSystemSettings);

    const [list, setList] = useState<Brief[]>([]);
    const [selected, setSelected] = useState<RouteTemplateDetails | null>(null);
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [units, setUnits] = useState<{id: number; titleRu: string}[]>([]);
    const [roles, setRoles] = useState<RouteRoleOption[]>(ROUTE_ROLES);
    const [conditions, setConditions] = useState<RouteConditionOption[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    /** Поиск и фильтр списка маршрутов слева — когда их становится много. */
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    /** Флеш «Сохранено» после успешной записи. */
    const [saved, setSaved] = useState(false);
    /** Снимок открытого шаблона — чтобы поймать несохранённые правки перед уходом. */
    const originalRef = useRef<string>("");
    const dirty = selected != null && JSON.stringify(selected) !== originalRef.current;

    /** Подтвердить уход, если есть несохранённые правки. */
    const confirmLeave = () =>
        !dirty || window.confirm("Есть несохранённые изменения. Продолжить без сохранения?");

    /** Предпросмотр ролей: в кого развернутся роли шаблона на выбранном подразделении. */
    const [preview, setPreview] = useState<RolePreviewItem[] | null>(null);
    const [previewBusy, setPreviewBusy] = useState(false);
    /** Пробное «подразделение из документа» для разворота target-ролей в предпросмотре. */
    const [previewTargetUnit, setPreviewTargetUnit] = useState<number | null>(null);
    /** Условия, включённые в предпросмотре эффективного маршрута. */
    const [activeConditions, setActiveConditions] = useState<Set<string>>(new Set());

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
    useEffect(() => { workflowService.routeRoles().then(setRoles).catch(() => setRoles(ROUTE_ROLES)); }, []);
    useEffect(() => {
        organizationUnitService.getAll()
            .then((rows) => setUnits(rows.map((u) => ({id: u.id, titleRu: u.titleRu}))))
            .catch(() => setUnits([]));
    }, []);

    // Каталог условий зависит от вида документа: у закупки свои, у СЗ/ВНД условий нет.
    const docType = selected?.documentType;
    useEffect(() => {
        if (!docType) { setConditions([]); return; }
        workflowService.routeConditions(docType).then(setConditions).catch(() => setConditions([]));
    }, [docType]);

    const open = async (id: number) => {
        try {
            const tpl = await workflowService.template(id);
            setSelected(tpl);
            originalRef.current = JSON.stringify(tpl);   // снимок для отслеживания правок
            resetPreview();
            setError(null);
        } catch {
            setError("Не удалось открыть маршрут");
        }
    };

    /** Клон открытого шаблона: новый (id=0) с тем же наполнением — сохранение создаст копию. */
    const clone = () => {
        if (!selected) return;
        resetPreview();
        setError(null);
        setSelected({...selected, id: 0, name: `${selected.name} (копия)`});
        originalRef.current = "";   // копию нужно сохранить — считаем изменённой
    };

    const resetPreview = () => {
        setPreview(null);
        setPreviewTargetUnit(null);
        setActiveConditions(new Set());
    };

    const create = () => {
        resetPreview();
        setError(null);
        const blank: RouteTemplateDetails = {
            id: 0,
            name: "",
            documentType: "Sz",
            isGlobalRule: false,
            orgUnitId: null,
            orgUnitTitle: null,
            steps: [emptyStep(1)],
        };
        setSelected(blank);
        originalRef.current = JSON.stringify(blank);   // пустой черновик — правок ещё нет
    };

    /**
     * Клиентская проверка перед отправкой — те же правила, что и на сервере. Возвращает
     * все найденные проблемы, чтобы настройщик увидел их разом, а не по одной за сохранение.
     */
    const validate = (t: RouteTemplateDetails): string[] => {
        const issues: string[] = [];
        if (!t.name.trim()) issues.push("Укажите название маршрута");
        if (t.steps.length === 0) issues.push("В маршруте нет ни одного этапа");

        const empty = t.steps.filter((s) => s.participants.length === 0).map((s) => s.order);
        if (empty.length > 0)
            issues.push(`Этап ${empty.join(", ")}: нет согласующих — маршрут остановится на нём`);

        // Параллельный этап без обязательного участника закроется первым же решением —
        // почти всегда это ошибка настройки, а не замысел.
        const parallelNoRequired = t.steps
            .filter((s) => s.mode === "Parallel" && s.participants.length > 0
                && !s.participants.some((p) => p.required))
            .map((s) => s.order);
        if (parallelNoRequired.length > 0)
            issues.push(`Этап ${parallelNoRequired.join(", ")}: параллельная развилка без обязательного согласующего`);

        // Участник без выбранного значения (роль/человек/подразделение не заданы).
        const blank = t.steps.filter((s) => s.participants.some(
            (p) => p.userId == null && p.unitId == null && !p.roleRef)).map((s) => s.order);
        if (blank.length > 0)
            issues.push(`Этап ${blank.join(", ")}: у согласующего не выбрано значение`);

        // Финальный контроль методологии закрывает маршрут — обязан быть последним,
        // иначе движок не запустит маршрут (та же проверка на сервере).
        const finalIdx = t.steps.findIndex((s) => s.isFinalMethodology);
        if (finalIdx >= 0 && finalIdx !== t.steps.length - 1)
            issues.push("Этап финального контроля методологии должен быть последним в маршруте");

        return issues;
    };

    /** Предпросмотр: разворачиваем роли шаблона на подразделении-инициаторе. */
    const runPreview = async () => {
        if (!selected) return;
        const roleRefs = Array.from(new Set(
            selected.steps.flatMap((s) => s.participants).map((p) => p.roleRef).filter((r): r is string => !!r)));
        if (roleRefs.length === 0) {
            setPreview([]);
            return;
        }
        setPreviewBusy(true);
        try {
            setPreview(await workflowService.previewRoles({
                orgUnitId: selected.orgUnitId,
                targetUnitId: previewTargetUnit,
                roles: roleRefs,
            }));
        } catch {
            setError("Не удалось проверить роли");
        } finally {
            setPreviewBusy(false);
        }
    };

    const save = async () => {
        if (!selected) return;
        const problems = validate(selected);
        if (problems.length > 0) { setError(problems.join(" • ")); return; }

        setBusy(true);
        try {
            const request = {
                name: selected.name.trim(),
                documentType: selected.documentType,
                isGlobalRule: selected.isGlobalRule,
                orgUnitId: selected.orgUnitId,
                steps: selected.steps,
            };
            if (selected.id === 0) {
                const id = await workflowService.createTemplate(request);
                await open(id);   // перечитает шаблон и обновит снимок
            } else {
                await workflowService.updateTemplate(selected.id, request);
                originalRef.current = JSON.stringify(selected);   // правки записаны — снимок актуален
            }
            await loadList();
            setError(null);
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setError(extractError(e) ?? "Не удалось сохранить маршрут");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!selected || selected.id === 0) { setSelected(null); return; }
        setBusy(true);
        try {
            await workflowService.deleteTemplate(selected.id);
            setSelected(null);
            await loadList();
            setError(null);
        } catch (e) {
            setError(extractError(e) ?? "Не удалось удалить маршрут");
        } finally {
            setBusy(false);
        }
    };

    const q = query.trim().toLowerCase();
    const shownList = list.filter((t) =>
        (!typeFilter || t.documentType === typeFilter) &&
        (!q || t.name.toLowerCase().includes(q)));

    return (
        <div className="flex gap-5 p-[22px_26px]" style={{minHeight: "calc(100vh - 120px)"}}>
            <aside className="w-[280px] flex-none">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="m-0 text-[16px] font-semibold text-[#0f1b2d]">Маршруты согласования</h1>
                    {canEdit && (
                        <button onClick={() => { if (confirmLeave()) create(); }}
                                className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#e5e9f0]
                                           bg-white text-[#2f68f5] hover:bg-[#f6f8fb]">
                            <Plus size={16}/>
                        </button>
                    )}
                </div>

                <input
                    className={`${input} w-full mb-2`} value={query} placeholder="Поиск по названию…"
                    onChange={(e) => setQuery(e.target.value)}
                />
                <select
                    className={`${input} w-full mb-3`} value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">Все виды документов</option>
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.title}</option>)}
                </select>

                <div className="flex flex-col gap-1">
                    {shownList.map((t) => (
                        <button key={t.id} onClick={() => { if (confirmLeave()) void open(t.id); }}
                                className="flex flex-col items-start rounded-[9px] border px-3 py-2 text-left transition"
                                style={{
                                    borderColor: selected?.id === t.id ? "#2f68f5" : "#eef2f7",
                                    background: selected?.id === t.id ? "#f5f8ff" : "#fff",
                                }}>
                            <span className="text-[13px] font-medium text-[#1c2740]">{t.name}</span>
                            <span className="text-[11.5px] text-[#8b97ab]">{docTitle(t.documentType)}</span>
                        </button>
                    ))}
                    {shownList.length === 0 && (
                        <div className="text-[13px] text-[#8b97ab]">
                            {list.length === 0 ? "Маршрутов пока нет." : "Ничего не найдено."}
                        </div>
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
                    <div className="flex flex-col gap-4">
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
                                <label className="w-[280px]">
                                    <span className="block text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd] mb-1">
                                        Подразделение-инициатор
                                    </span>
                                    <select className={`${input} w-full`} value={selected.orgUnitId ?? ""} disabled={!canEdit}
                                            onChange={(e) => setSelected({
                                                ...selected,
                                                orgUnitId: e.target.value ? Number(e.target.value) : null,
                                            })}>
                                        <option value="">Все подразделения (правило типа)</option>
                                        {units.map((u) => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                                    </select>
                                </label>
                            </div>

                            <label className="mt-3 flex items-center gap-2 text-[12.5px] text-[#55617a]"
                                   title="Глобальное правило: обязательные согласующие добавляются в маршрут автоматически (TID-03)">
                                <input type="checkbox" checked={selected.isGlobalRule} disabled={!canEdit}
                                       onChange={(e) => setSelected({...selected, isGlobalRule: e.target.checked})}/>
                                Глобальное правило — авто-включение обязательных согласующих
                            </label>
                        </div>

                        <div className="rounded-[12px] border border-[#e5e9f0] bg-[#f7f9fc] p-5 overflow-x-auto">
                            <RouteGraphBuilder
                                steps={selected.steps}
                                users={users}
                                units={units}
                                roles={roles}
                                conditions={conditions}
                                canEdit={canEdit}
                                onChange={(steps) => setSelected({...selected, steps})}
                            />
                        </div>

                        {conditions.length > 0 && (
                            <EffectiveRoutePanel
                                steps={selected.steps}
                                conditions={conditions}
                                active={activeConditions}
                                onToggle={(value) => setActiveConditions((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(value)) next.delete(value); else next.add(value);
                                    return next;
                                })}
                            />
                        )}

                        <RolePreviewPanel
                            preview={preview}
                            busy={previewBusy}
                            hasOrgUnit={selected.orgUnitId != null}
                            units={units}
                            targetUnit={previewTargetUnit}
                            onTargetUnitChange={setPreviewTargetUnit}
                            onRun={() => void runPreview()}
                        />

                        {canEdit && (
                            <div className="flex items-center gap-2 pt-1">
                                <button onClick={() => void save()} disabled={busy}
                                        className="h-9 px-5 rounded-[9px] bg-[#2f68f5] text-white text-[13px] font-semibold
                                                   hover:brightness-[1.06] disabled:opacity-50">
                                    Сохранить
                                </button>
                                {selected.id !== 0 && (
                                    <button onClick={clone} disabled={busy}
                                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#2b3852]
                                                       text-[13px] font-medium hover:bg-[#f6f8fb] disabled:opacity-50">
                                        Создать копию
                                    </button>
                                )}
                                <button onClick={() => void remove()} disabled={busy}
                                        className="h-9 px-4 rounded-[9px] border border-[#f0d2d2] bg-white text-[#b5352f]
                                                   text-[13px] font-medium hover:bg-[#fdf5f5]">
                                    {selected.id === 0 ? "Отменить" : "Удалить маршрут"}
                                </button>
                                {saved && (
                                    <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#1c7a4d]">
                                        <CheckCircle2 size={15}/> Сохранено
                                    </span>
                                )}
                                {!saved && dirty && (
                                    <span className="text-[12.5px] text-[#c8891f]">Есть несохранённые изменения</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

/**
 * Предпросмотр эффективного маршрута: условные этапы включаются в маршрут только когда
 * контур сообщает их условие. Настройщик переключает условия и видит, какие этапы
 * реально попадут в маршрут для такого документа. Безусловные этапы есть всегда.
 */
function EffectiveRoutePanel({
    steps, conditions, active, onToggle,
}: {
    steps: TemplateStep[];
    conditions: RouteConditionOption[];
    active: Set<string>;
    onToggle: (value: string) => void;
}) {
    const included = steps.filter((s) => !s.condition || active.has(s.condition));

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0f1b2d]">
                <GitBranch size={16} className="text-[#2f68f5]"/> Маршрут по условиям
            </div>
            <div className="mt-1 text-[12px] text-[#8b97ab]">
                Включите условия документа — этапы с этим условием попадут в маршрут.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {conditions.map((c) => {
                    const on = active.has(c.value);
                    return (
                        <button key={c.value} type="button" onClick={() => onToggle(c.value)}
                                className="h-8 px-3 rounded-full border text-[12.5px] font-medium transition"
                                style={{
                                    borderColor: on ? "#2f68f5" : "#e5e9f0",
                                    background: on ? "#eef5ff" : "#fff",
                                    color: on ? "#2f68f5" : "#55617a",
                                }}>
                            {on ? "✓ " : ""}{c.title}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
                {included.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-[9px] border border-[#eef2f7] px-3 py-2">
                        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#2f68f5]
                                         text-[11px] font-bold text-white">{i + 1}</span>
                        <span className="text-[13px] text-[#1c2740]">{STEP_KIND_TITLE[s.kind]}</span>
                        {s.mode === "Parallel" && (
                            <span className="text-[11.5px] text-[#2f68f5]">
                                развилка{s.quorum ? ` · кворум ${s.quorum}/${s.participants.length}` : ""}
                            </span>
                        )}
                        {s.condition && (
                            <span className="text-[11px] text-[#8a6d1f]">
                                условный: {conditions.find((c) => c.value === s.condition)?.title ?? s.condition}
                            </span>
                        )}
                        <span className="ml-auto text-[11.5px] text-[#8b97ab]">
                            согласующих: {s.participants.length}
                        </span>
                    </div>
                ))}
                {included.length === 0 && (
                    <div className="text-[13px] text-[#8b97ab]">При этих условиях маршрут пуст.</div>
                )}
            </div>
        </div>
    );
}

/**
 * Предпросмотр разрешения ролей: в кого развернутся роли шаблона на подразделении-
 * инициаторе. Настройщик видит, что «руководитель подразделения автора» — конкретный
 * человек, а не пустая роль, ещё до запуска маршрута. Роли «из документа» разрешатся
 * только при запуске — подразделение берётся из карточки.
 */
function RolePreviewPanel({
    preview, busy, hasOrgUnit, units, targetUnit, onTargetUnitChange, onRun,
}: {
    preview: RolePreviewItem[] | null;
    busy: boolean;
    hasOrgUnit: boolean;
    units: {id: number; titleRu: string}[];
    targetUnit: number | null;
    onTargetUnitChange: (id: number | null) => void;
    onRun: () => void;
}) {
    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0f1b2d]">
                        <Users size={16} className="text-[#2f68f5]"/> Проверка ролей
                    </div>
                    <div className="mt-1 text-[12px] text-[#8b97ab]">
                        {hasOrgUnit
                            ? "Развернём роли на выбранном подразделении-инициаторе."
                            : "Подразделение-инициатор не задано — роли автора развернутся, только когда он известен."}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                    <select
                        className="h-9 px-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] outline-none
                                   focus:border-[#2f68f5] w-[210px]"
                        value={targetUnit ?? ""}
                        title="Пробное «подразделение из документа» — чтобы развернуть роли target-*"
                        onChange={(e) => onTargetUnitChange(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Подразд. из документа — не задано</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                    </select>
                    <button onClick={onRun} disabled={busy}
                            className="h-9 px-4 rounded-[9px] border border-[#cfe0ff] bg-[#f5f8ff] text-[#2f68f5]
                                       text-[13px] font-medium hover:bg-[#eaf1ff] disabled:opacity-50">
                        {busy ? "Проверяем…" : "Проверить роли"}
                    </button>
                </div>
            </div>

            {preview && preview.length === 0 && (
                <div className="mt-3 text-[13px] text-[#8b97ab]">В маршруте нет ролей — только люди или подразделения.</div>
            )}

            {preview && preview.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                    {preview.map((r) => (
                        <div key={r.roleRef}
                             className="flex items-center gap-2.5 rounded-[9px] border border-[#eef2f7] px-3 py-2">
                            {r.resolved
                                ? <CheckCircle2 size={15} className="text-[#1c7a4d] flex-none"/>
                                : <AlertTriangle size={15} className="text-[#c8891f] flex-none"/>}
                            <span className="text-[12.5px] font-medium text-[#1c2740] w-[240px] flex-none">{r.title}</span>
                            {r.resolved
                                ? <span className="text-[13px] text-[#2b3852]">{r.fullName ?? `#${r.userId}`}</span>
                                : <span className="text-[12.5px] text-[#8a6d1f]">{r.note}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const docTitle = (t: string) => DOC_TYPES.find((d) => d.value === t)?.title ?? t;

function extractError(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        const r = (e as {response?: {data?: {message?: string}}}).response;
        return r?.data?.message ?? null;
    }
    return null;
}
