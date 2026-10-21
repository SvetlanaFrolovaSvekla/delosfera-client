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
import {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Plus, Users, CheckCircle2, AlertTriangle, GitBranch, ArrowLeft} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {type PickableUser} from "@/constants/pickableUser.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {userService} from "@/service/userService/userService.ts";
import {organizationUnitService}
    from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {
    workflowService, ROUTE_ROLES,
    type RouteRoleOption, type RouteConditionOption, type RolePreviewItem,
    type RouteTemplateDetails, type TemplateStep,
} from "@/service/workflowService/workflowService.ts";
import {RouteGraphBuilder} from "@/components/componentsWorkflow/RouteGraphBuilder.tsx";

/** Виды документов, для которых настраиваются маршруты; подписи — в локалях. */
const DOC_TYPES = ["Sz", "Procurement", "Vnd"];

const FIELD_LABEL = "text-[11.5px] text-[#8b97ab] mb-1.5";
const TEXT_INPUT = "h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none " +
    "focus:border-[#4e57d6] disabled:bg-[#f6f8fb] disabled:text-[#8b97ab]";
const CARD = "rounded-[14px] border border-[#e9edf3] bg-white p-[22px]";
const BTN_PRIMARY = "inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white " +
    "font-semibold text-[12.5px] cursor-pointer shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_SECONDARY = "inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white " +
    "text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_DANGER = "inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border border-[#f0d2d2] bg-white " +
    "text-[#c0392b] font-semibold text-[12.5px] cursor-pointer hover:bg-[#fdeceb] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

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
    const {t} = useTranslation();
    const navigate = useNavigate();
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

    /** Действие, ожидающее подтверждения ухода без сохранения. */
    const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

    /** Выполнить действие сразу или, если есть несохранённые правки, после подтверждения. */
    const guard = (action: () => void) => {
        if (!dirty) action();
        else setPendingLeave(() => action);
    };

    /** Предпросмотр ролей: в кого развернутся роли шаблона на выбранном подразделении. */
    const [preview, setPreview] = useState<RolePreviewItem[] | null>(null);
    const [previewBusy, setPreviewBusy] = useState(false);
    /** Пробное «подразделение из документа» для разворота target-ролей в предпросмотре. */
    const [previewTargetUnit, setPreviewTargetUnit] = useState<number | null>(null);
    /** Условия, включённые в предпросмотре эффективного маршрута. */
    const [activeConditions, setActiveConditions] = useState<Set<string>>(new Set());

    const docTitle = (value: string) => t(`routeTemplatesPage.docTypes.${value}`, {defaultValue: value});
    const docTypeOptions = DOC_TYPES.map((value) => ({value, label: docTitle(value)}));

    const loadList = useCallback(async () => {
        try {
            const raw = await workflowService.templates();
            setList(raw.map((tpl) => ({id: tpl.id, name: tpl.name, documentType: tpl.documentType})));
        } catch {
            setError(t("routeTemplatesPage.errorLoadList") /* Не удалось загрузить список маршрутов */);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            setError(t("routeTemplatesPage.errorOpen") /* Не удалось открыть маршрут */);
        }
    };

    /** Клон открытого шаблона: новый (id=0) с тем же наполнением — сохранение создаст копию. */
    const clone = () => {
        if (!selected) return;
        resetPreview();
        setError(null);
        setSelected({...selected, id: 0, name: t("routeTemplatesPage.copySuffix", {name: selected.name})});
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
    const validate = (tpl: RouteTemplateDetails): string[] => {
        const issues: string[] = [];
        if (!tpl.name.trim()) issues.push(t("routeTemplatesPage.validation.nameRequired") /* Укажите название маршрута */);
        if (tpl.steps.length === 0) issues.push(t("routeTemplatesPage.validation.noSteps") /* В маршруте нет ни одного этапа */);

        const empty = tpl.steps.filter((s) => s.participants.length === 0).map((s) => s.order);
        if (empty.length > 0)
            issues.push(t("routeTemplatesPage.validation.stepNoParticipants", {steps: empty.join(", ")})
                /* Этап N: нет согласующих — маршрут остановится на нём */);

        // Параллельный этап без обязательного участника закроется первым же решением —
        // почти всегда это ошибка настройки, а не замысел.
        const parallelNoRequired = tpl.steps
            .filter((s) => s.mode === "Parallel" && s.participants.length > 0
                && !s.participants.some((p) => p.required))
            .map((s) => s.order);
        if (parallelNoRequired.length > 0)
            issues.push(t("routeTemplatesPage.validation.parallelNoRequired", {steps: parallelNoRequired.join(", ")})
                /* Этап N: параллельная развилка без обязательного согласующего */);

        // Участник без выбранного значения (роль/человек/подразделение не заданы).
        const blank = tpl.steps.filter((s) => s.participants.some(
            (p) => p.userId == null && p.unitId == null && !p.roleRef)).map((s) => s.order);
        if (blank.length > 0)
            issues.push(t("routeTemplatesPage.validation.blankParticipant", {steps: blank.join(", ")})
                /* Этап N: у согласующего не выбрано значение */);

        // Финальный контроль методологии закрывает маршрут — обязан быть последним,
        // иначе движок не запустит маршрут (та же проверка на сервере).
        const finalIdx = tpl.steps.findIndex((s) => s.isFinalMethodology);
        if (finalIdx >= 0 && finalIdx !== tpl.steps.length - 1)
            issues.push(t("routeTemplatesPage.validation.finalNotLast")
                /* Этап финального контроля методологии должен быть последним в маршруте */);

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
            setError(t("routeTemplatesPage.errorPreviewRoles") /* Не удалось проверить роли */);
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
            setError(extractError(e) ?? t("routeTemplatesPage.errorSave") /* Не удалось сохранить маршрут */);
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
            setError(extractError(e) ?? t("routeTemplatesPage.errorDelete") /* Не удалось удалить маршрут */);
        } finally {
            setBusy(false);
        }
    };

    const q = query.trim().toLowerCase();
    const shownList = list.filter((tpl) =>
        (!typeFilter || tpl.documentType === typeFilter) &&
        (!q || tpl.name.toLowerCase().includes(q)));

    const unitOptions = [
        {value: "", label: t("routeTemplatesPage.allUnits") /* Все подразделения (правило типа) */},
        ...units.map((u) => ({value: String(u.id), label: u.titleRu})),
    ];

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => guard(() => navigate("/management/refs"))}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateGeneral") /* Справочники · Общее */}
            </button>

            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                    <span
                        className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                        <GitBranch className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                    </span>
                    <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                        {t("routeTemplatesPage.title") /* Маршруты согласования */}
                    </h1>
                </div>

                {canEdit && (
                    <button type="button" onClick={() => guard(create)} className={BTN_PRIMARY}>
                        <Plus className="w-[15px] h-[15px]" strokeWidth={2.2}/>
                        {t("routeTemplatesPage.create") /* Создать маршрут */}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
                <aside className="flex flex-col gap-[9px]">
                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder={t("routeTemplatesPage.searchPlaceholder") /* Поиск по названию… */}
                    />
                    <SelectDropdown
                        options={[
                            {value: "", label: t("routeTemplatesPage.allDocTypes") /* Все виды документов */},
                            ...docTypeOptions,
                        ]}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        minWidth="100%"
                    />

                    <div className="flex flex-col gap-[9px] mt-1">
                        {shownList.map((tpl) => {
                            const isActive = selected?.id === tpl.id;
                            return (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => guard(() => void open(tpl.id))}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[11px] border text-left cursor-pointer transition-colors ${
                                        isActive
                                            ? "border-[#4e57d6] bg-[#f5f6ff]"
                                            : "border-[#e9edf3] bg-white hover:bg-[#fbfcfe]"
                                    }`}
                                >
                                    <span
                                        className="w-[34px] h-[34px] flex-none rounded-[9px] bg-[#ececfc] text-[#4e57d6] grid place-items-center">
                                        <GitBranch className="w-[18px] h-[18px]" strokeWidth={1.8}/>
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-semibold text-[13px] text-[#1c2740] truncate">
                                            <HighlightText text={tpl.name} query={query}/>
                                        </span>
                                        <span className="block text-[11px] text-[#8b97ab] truncate">
                                            {docTitle(tpl.documentType)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        {shownList.length === 0 && (
                            <div className="px-1 py-2 text-[13px] text-[#8b97ab]">
                                {list.length === 0
                                    ? t("routeTemplatesPage.listEmpty") /* Маршрутов пока нет. */
                                    : t("general.notFound") /* Ничего не найдено */}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="min-w-0">
                    {error && (
                        <div
                            className="mb-4 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                            {error}
                        </div>
                    )}

                    {!selected && (
                        <EmptyState
                            variant="empty"
                            icon={GitBranch}
                            title={t("routeTemplatesPage.selectHint") /* Выберите маршрут слева или создайте новый. */}
                            actionLabel={canEdit ? t("routeTemplatesPage.create") : undefined}
                            onAction={canEdit ? () => guard(create) : undefined}
                        />
                    )}

                    {selected && (
                        <div className="flex flex-col gap-4">
                            <div className={CARD}>
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex-1 min-w-[280px]">
                                        <div className={FIELD_LABEL}>
                                            {t("routeTemplatesPage.fieldName") /* Название */}
                                        </div>
                                        <input
                                            className={TEXT_INPUT}
                                            value={selected.name}
                                            disabled={!canEdit}
                                            placeholder={t("routeTemplatesPage.namePlaceholder") /* Например: Кадровая записка — приём */}
                                            onChange={(e) => setSelected({...selected, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="w-[220px]">
                                        <div className={FIELD_LABEL}>
                                            {t("routeTemplatesPage.fieldDocType") /* Тип документа */}
                                        </div>
                                        <div className={canEdit ? "" : "pointer-events-none opacity-60"}>
                                            <SelectDropdown
                                                options={docTypeOptions}
                                                value={selected.documentType}
                                                onChange={(v) => setSelected({...selected, documentType: v})}
                                                minWidth="100%"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-[300px]">
                                        <div className={FIELD_LABEL}>
                                            {t("routeTemplatesPage.fieldOrgUnit") /* Подразделение-инициатор */}
                                        </div>
                                        <div className={canEdit ? "" : "pointer-events-none opacity-60"}>
                                            <SelectDropdown
                                                options={unitOptions}
                                                value={selected.orgUnitId != null ? String(selected.orgUnitId) : ""}
                                                onChange={(v) => setSelected({
                                                    ...selected,
                                                    orgUnitId: v ? Number(v) : null,
                                                })}
                                                searchable
                                                minWidth="100%"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <Tooltip content={t("routeTemplatesPage.globalRuleHint")} side="top" className="w-fit">
                                        <PlainCheckbox
                                            checked={selected.isGlobalRule}
                                            disabled={!canEdit}
                                            onChange={(checked) => setSelected({...selected, isGlobalRule: checked})}
                                        >
                                            {t("routeTemplatesPage.globalRule") /* Глобальное правило — авто-включение обязательных согласующих */}
                                        </PlainCheckbox>
                                    </Tooltip>
                                </div>
                            </div>

                            {/* Сам конструктор маршрута — без изменений. */}
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
                                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                    <button onClick={() => void save()} disabled={busy} className={BTN_PRIMARY}>
                                        {t("routeTemplatesPage.save") /* Сохранить */}
                                    </button>
                                    {selected.id !== 0 && (
                                        <button onClick={clone} disabled={busy} className={BTN_SECONDARY}>
                                            {t("routeTemplatesPage.clone") /* Создать копию */}
                                        </button>
                                    )}
                                    <button onClick={() => void remove()} disabled={busy} className={BTN_DANGER}>
                                        {selected.id === 0
                                            ? t("routeTemplatesPage.cancelNew") /* Отменить */
                                            : t("routeTemplatesPage.delete") /* Удалить маршрут */}
                                    </button>
                                    {saved && (
                                        <span
                                            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1c7a4d]">
                                            <CheckCircle2 size={15}/>
                                            {t("routeTemplatesPage.saved") /* Сохранено */}
                                        </span>
                                    )}
                                    {!saved && dirty && (
                                        <span className="text-[12.5px] text-[#c8891f]">
                                            {t("routeTemplatesPage.unsaved") /* Есть несохранённые изменения */}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <ConfirmActionModal
                open={pendingLeave !== null}
                onClose={() => setPendingLeave(null)}
                onConfirm={() => {
                    const action = pendingLeave;
                    setPendingLeave(null);
                    action?.();
                }}
                variant="warning"
                title={t("routeTemplatesPage.leaveTitle") /* Уйти без сохранения? */}
                message={t("routeTemplatesPage.leaveMessage") /* Есть несохранённые изменения. Продолжить без сохранения? */}
                confirmLabel={t("routeTemplatesPage.leaveConfirm") /* Продолжить */}
            />
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
    const {t} = useTranslation();
    const included = steps.filter((s) => !s.condition || active.has(s.condition));

    return (
        <div className={CARD}>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1c2740]">
                <GitBranch size={16} className="text-[#4e57d6]"/>
                {t("routeTemplatesPage.effective.title") /* Маршрут по условиям */}
            </div>
            <div className="mt-1 text-[12px] text-[#8b97ab]">
                {t("routeTemplatesPage.effective.hint") /* Включите условия документа — этапы с этим условием попадут в маршрут. */}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {conditions.map((c) => {
                    const on = active.has(c.value);
                    return (
                        <button key={c.value} type="button" onClick={() => onToggle(c.value)}
                                className={`h-8 px-3 rounded-full border text-[12.5px] font-medium cursor-pointer transition ${
                                    on
                                        ? "border-[#4e57d6] bg-[#ececfc] text-[#4e57d6]"
                                        : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                                }`}>
                            {on ? "✓ " : ""}{c.title}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
                {included.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-[9px] border border-[#eef2f7] px-3 py-2">
                        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#4e57d6]
                                         text-[11px] font-bold text-white">{i + 1}</span>
                        <span className="text-[13px] text-[#1c2740]">
                            {t(`routeTemplatesPage.stepKinds.${s.kind}`)}
                        </span>
                        {s.mode === "Parallel" && (
                            <span className="text-[11.5px] text-[#4e57d6]">
                                {s.quorum
                                    ? t("routeTemplatesPage.effective.forkQuorum",
                                        {quorum: s.quorum, total: s.participants.length}) /* развилка · кворум N/M */
                                    : t("routeTemplatesPage.effective.fork") /* развилка */}
                            </span>
                        )}
                        {s.condition && (
                            <span className="text-[11px] text-[#8a6d1f]">
                                {t("routeTemplatesPage.effective.conditional", {
                                    title: conditions.find((c) => c.value === s.condition)?.title ?? s.condition,
                                }) /* условный: … */}
                            </span>
                        )}
                        <span className="ml-auto text-[11.5px] text-[#8b97ab]">
                            {t("routeTemplatesPage.effective.approvers", {count: s.participants.length}) /* согласующих: N */}
                        </span>
                    </div>
                ))}
                {included.length === 0 && (
                    <div className="text-[13px] text-[#8b97ab]">
                        {t("routeTemplatesPage.effective.empty") /* При этих условиях маршрут пуст. */}
                    </div>
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
    const {t} = useTranslation();

    const targetOptions = [
        {value: "", label: t("routeTemplatesPage.preview.targetUnitNone") /* Подразд. из документа — не задано */},
        ...units.map((u) => ({value: String(u.id), label: u.titleRu})),
    ];

    return (
        <div className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1c2740]">
                        <Users size={16} className="text-[#4e57d6]"/>
                        {t("routeTemplatesPage.preview.title") /* Проверка ролей */}
                    </div>
                    <div className="mt-1 text-[12px] text-[#8b97ab]">
                        {hasOrgUnit
                            ? t("routeTemplatesPage.preview.withUnit") /* Развернём роли на выбранном подразделении-инициаторе. */
                            : t("routeTemplatesPage.preview.withoutUnit") /* Подразделение-инициатор не задано … */}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                    <Tooltip content={t("routeTemplatesPage.preview.targetUnitHint")} side="top">
                        <div>
                            <SelectDropdown
                                options={targetOptions}
                                value={targetUnit != null ? String(targetUnit) : ""}
                                onChange={(v) => onTargetUnitChange(v ? Number(v) : null)}
                                searchable
                                minWidth="240px"
                            />
                        </div>
                    </Tooltip>
                    <button onClick={onRun} disabled={busy}
                            className="inline-flex items-center h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white
                                       text-[#4e57d6] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]
                                       disabled:opacity-60 disabled:cursor-not-allowed">
                        {busy
                            ? t("routeTemplatesPage.preview.running") /* Проверяем… */
                            : t("routeTemplatesPage.preview.run") /* Проверить роли */}
                    </button>
                </div>
            </div>

            {preview && preview.length === 0 && (
                <div className="mt-3 text-[13px] text-[#8b97ab]">
                    {t("routeTemplatesPage.preview.noRoles") /* В маршруте нет ролей — только люди или подразделения. */}
                </div>
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

function extractError(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        const r = (e as {response?: {data?: {message?: string}}}).response;
        return r?.data?.message ?? null;
    }
    return null;
}
