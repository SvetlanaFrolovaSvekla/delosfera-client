// Расширенный поиск для реестра ВНД
import {AlertTriangle, ChevronDown, ChevronUp, Filter, SlidersHorizontal} from "lucide-react";
import {useState} from "react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {MultiSelectDropdown} from "@/components/componentsGeneral/MultiSelectDropdown.tsx";
import {
    RUBRICS,
    TYPE_VND,
    ORGANS_APPROVAL,
    ORG_UNITS,
    KEYWORDS,
    SECURITY_LEVELS,
    USER_GROUPS
} from "@/service/mockData/DictionaryData.tsx";
import type {ColDef} from "@/constants/vndColumns.ts";
import type {VndScope} from "@/service/mockData/BaseVndData";
import {SelectListField} from "@/components/componentsGeneral/SelectListField.tsx";
import {
    DateFilterGroup,
    type DateFilterValue,
    EMPTY_DATE_FILTER
} from "@/components/componentsGeneral/DateFilterGroup.tsx";

interface VndFiltersProps {
    scope: VndScope;
    isArchScope: boolean;

    search: string;
    onSearchChange: (v: string) => void;

    statusOptions: { key: string; label: string }[];
    statusFilters: string[];
    onToggleStatus: (key: string) => void;
    onSelectAllStatuses: () => void;
    onDeselectAllStatuses: () => void;

    advOpen: boolean;
    onToggleAdv: () => void;
    onCloseAdv: () => void;

    rubricFilters: string[];
    onRubricFiltersChange: (keys: string[]) => void;

    resultCount: number;
    totalCount: number;

    onResetFilters: () => void;

    // --- Колонки
    toggleableColumns: ColDef[];
    visibleCols: Record<string, boolean>;
    onToggleColumn: (key: string) => void;
    onSelectAllColumns: () => void;
    onDeselectAllColumns: () => void;

    docTypeFilters: string[];
    onDocTypeFiltersChange: (keys: string[]) => void;

    organFilters: string[];
    onOrganFiltersChange: (keys: string[]) => void;

    developerFilters: string[];
    onDeveloperFiltersChange: (keys: string[]) => void;

    keywordFilters: string[];
    onKeywordFiltersChange: (keys: string[]) => void;

    responsibleExecutorFilters: string[];
    onResponsibleExecutorFiltersChange: (keys: string[]) => void;

    advSearchName: string;
    onAdvSearchNameChange: (v: string) => void;

    advSearchCode: string;
    onAdvSearchCodeChange: (v: string) => void;

    advSearchRevisionText: string;
    onAdvSearchRevisionTextChange: (v: string) => void;

    // --- Даты
    adoptionDateFilter: DateFilterValue;
    onAdoptionDateFilterChange: (v: DateFilterValue) => void;
    adoptionCodeFilter: string;
    onAdoptionCodeFilterChange: (v: string) => void;

    effectiveDateFilter: DateFilterValue;
    onEffectiveDateFilterChange: (v: DateFilterValue) => void;

    requisitesChangedDateFilter: DateFilterValue;
    onRequisitesChangedDateFilterChange: (v: DateFilterValue) => void;

    revisionChangedDateFilter: DateFilterValue;
    onRevisionChangedDateFilterChange: (v: DateFilterValue) => void;

    cancelDateFilter: DateFilterValue;
    onCancelDateFilterChange: (v: DateFilterValue) => void;
    cancelCodeFilter: string;
    onCancelCodeFilterChange: (v: string) => void;

    dueActualizationDateFilter: DateFilterValue;
    onDueActualizationDateFilterChange: (v: DateFilterValue) => void;

    lastActualizationDateFilter: DateFilterValue;
    onLastActualizationDateFilterChange: (v: DateFilterValue) => void;

    archivedDateFilter: DateFilterValue;
    onArchivedDateFilterChange: (v: DateFilterValue) => void;

    userGroupFilters: string[];
    onUserGroupFiltersChange: (keys: string[]) => void;

    secrecyLevelFilters: string[];
    onSecrecyLevelFiltersChange: (keys: string[]) => void;
}

interface AdvancedDraft {
    docTypeFilters: string[];
    organFilters: string[];
    developerFilters: string[];
    responsibleExecutorFilters: string[];
    keywordFilters: string[];
    rubricFilters: string[];
    secrecyLevelFilters: string[];
    userGroupFilters: string[];
    advSearchName: string;
    advSearchCode: string;
    advSearchRevisionText: string;
    adoptionDateFilter: DateFilterValue;
    adoptionCodeFilter: string;
    effectiveDateFilter: DateFilterValue;
    requisitesChangedDateFilter: DateFilterValue;
    revisionChangedDateFilter: DateFilterValue;
    cancelDateFilter: DateFilterValue;
    cancelCodeFilter: string;
    dueActualizationDateFilter: DateFilterValue;
    lastActualizationDateFilter: DateFilterValue;
    archivedDateFilter: DateFilterValue;
}

const EMPTY_ADVANCED_DRAFT: AdvancedDraft = {
    docTypeFilters: [],
    organFilters: [],
    developerFilters: [],
    responsibleExecutorFilters: [],
    keywordFilters: [],
    rubricFilters: [],
    secrecyLevelFilters: [],
    userGroupFilters: [],
    advSearchName: "",
    advSearchCode: "",
    advSearchRevisionText: "",
    adoptionDateFilter: EMPTY_DATE_FILTER,
    adoptionCodeFilter: "",
    effectiveDateFilter: EMPTY_DATE_FILTER,
    requisitesChangedDateFilter: EMPTY_DATE_FILTER,
    revisionChangedDateFilter: EMPTY_DATE_FILTER,
    cancelDateFilter: EMPTY_DATE_FILTER,
    cancelCodeFilter: "",
    dueActualizationDateFilter: EMPTY_DATE_FILTER,
    lastActualizationDateFilter: EMPTY_DATE_FILTER,
    archivedDateFilter: EMPTY_DATE_FILTER,
};

export function VndFilters(props: VndFiltersProps) {
    const {
        scope,
        isArchScope,
        search,
        onSearchChange,
        statusOptions,
        statusFilters,
        onToggleStatus,
        onSelectAllStatuses,
        onDeselectAllStatuses,
        advOpen,
        onToggleAdv,
        onCloseAdv,
        rubricFilters,
        onRubricFiltersChange,
        resultCount,
        totalCount,
        onResetFilters,
        toggleableColumns,
        visibleCols,
        onToggleColumn,
        onSelectAllColumns,
        onDeselectAllColumns,
        onDocTypeFiltersChange,
        docTypeFilters,
        organFilters,
        onOrganFiltersChange,
        onDeveloperFiltersChange,
        developerFilters,
        keywordFilters,
        onKeywordFiltersChange,
        responsibleExecutorFilters,
        onResponsibleExecutorFiltersChange,
        advSearchName,
        onAdvSearchNameChange,
        advSearchCode,
        onAdvSearchCodeChange,
        advSearchRevisionText,
        onAdvSearchRevisionTextChange,
        adoptionDateFilter,
        onAdoptionDateFilterChange,
        adoptionCodeFilter,
        onAdoptionCodeFilterChange,
        effectiveDateFilter,
        onEffectiveDateFilterChange,
        requisitesChangedDateFilter,
        onRequisitesChangedDateFilterChange,
        revisionChangedDateFilter,
        onRevisionChangedDateFilterChange,
        cancelDateFilter,
        onCancelDateFilterChange,
        cancelCodeFilter,
        onCancelCodeFilterChange,
        dueActualizationDateFilter,
        onDueActualizationDateFilterChange,
        lastActualizationDateFilter,
        onLastActualizationDateFilterChange,
        archivedDateFilter,
        onArchivedDateFilterChange,
        userGroupFilters,
        onUserGroupFiltersChange,
        secrecyLevelFilters,
        onSecrecyLevelFiltersChange,
    } = props;

    const selectedColumnKeys = toggleableColumns
        .filter((c) => visibleCols[c.key] !== false)
        .map((c) => c.key);

    const isDateActive = (v: DateFilterValue) => Boolean(v.exact || v.from || v.to);

    const hasActiveFilters =
        search.trim() !== "" ||
        statusFilters.length > 0 ||
        rubricFilters.length > 0 ||
        docTypeFilters.length > 0 ||
        organFilters.length > 0 ||
        developerFilters.length > 0 ||
        keywordFilters.length > 0 ||
        responsibleExecutorFilters.length > 0 ||
        advSearchName.trim() !== "" ||
        advSearchCode.trim() !== "" ||
        advSearchRevisionText.trim() !== "" ||
        adoptionCodeFilter.trim() !== "" ||
        cancelCodeFilter.trim() !== "" ||
        secrecyLevelFilters.length > 0 ||
        userGroupFilters.length > 0 ||
        isDateActive(adoptionDateFilter) ||
        isDateActive(effectiveDateFilter) ||
        isDateActive(requisitesChangedDateFilter) ||
        isDateActive(revisionChangedDateFilter) ||
        isDateActive(cancelDateFilter) ||
        isDateActive(dueActualizationDateFilter) ||
        isDateActive(lastActualizationDateFilter) ||
        isDateActive(archivedDateFilter);

    const showTotalOnly = scope === "all" && !hasActiveFilters;

    // --- Черновик: инициализация и синхронизация из применённых пропов.
    const buildDraftFromProps = (): AdvancedDraft => ({
        docTypeFilters,
        organFilters,
        developerFilters,
        responsibleExecutorFilters,
        keywordFilters,
        rubricFilters,
        secrecyLevelFilters,
        userGroupFilters,
        advSearchName,
        advSearchCode,
        advSearchRevisionText,
        adoptionDateFilter,
        adoptionCodeFilter,
        effectiveDateFilter,
        requisitesChangedDateFilter,
        revisionChangedDateFilter,
        cancelDateFilter,
        cancelCodeFilter,
        dueActualizationDateFilter,
        lastActualizationDateFilter,
        archivedDateFilter,
    });

    const [draft, setDraft] = useState<AdvancedDraft>(buildDraftFromProps);

    // Синхронизация черновика с применёнными фильтрами в момент открытия панели
    const [prevAdvOpen, setPrevAdvOpen] = useState(advOpen);
    if (advOpen !== prevAdvOpen) {
        setPrevAdvOpen(advOpen);
        if (advOpen) {
            setDraft(buildDraftFromProps());
        }
    }

    const updateDraft = <K extends keyof AdvancedDraft>(key: K, value: AdvancedDraft[K]) =>
        setDraft((prev) => ({...prev, [key]: value}));

    // Применить черновик (один запрос)
    const handleApplyAdvanced = () => {
        onDocTypeFiltersChange(draft.docTypeFilters);
        onOrganFiltersChange(draft.organFilters);
        onDeveloperFiltersChange(draft.developerFilters);
        onResponsibleExecutorFiltersChange(draft.responsibleExecutorFilters);
        onKeywordFiltersChange(draft.keywordFilters);
        onRubricFiltersChange(draft.rubricFilters);
        onSecrecyLevelFiltersChange(draft.secrecyLevelFilters);
        onUserGroupFiltersChange(draft.userGroupFilters);
        onAdvSearchNameChange(draft.advSearchName);
        onAdvSearchCodeChange(draft.advSearchCode);
        onAdvSearchRevisionTextChange(draft.advSearchRevisionText);
        onAdoptionDateFilterChange(draft.adoptionDateFilter);
        onAdoptionCodeFilterChange(draft.adoptionCodeFilter);
        onEffectiveDateFilterChange(draft.effectiveDateFilter);
        onRequisitesChangedDateFilterChange(draft.requisitesChangedDateFilter);
        onRevisionChangedDateFilterChange(draft.revisionChangedDateFilter);
        onCancelDateFilterChange(draft.cancelDateFilter);
        onCancelCodeFilterChange(draft.cancelCodeFilter);
        onDueActualizationDateFilterChange(draft.dueActualizationDateFilter);
        onLastActualizationDateFilterChange(draft.lastActualizationDateFilter);
        onArchivedDateFilterChange(draft.archivedDateFilter);
        onCloseAdv();
    };

    // Свернуть без применения
    const handleCollapse = () => {
        onCloseAdv();
    };

    // Сбросить параметры в черновике
    const handleResetAdvancedDraft = () => {
        setDraft(EMPTY_ADVANCED_DRAFT);
    };

    return (
        <>
            {/* Поиск */}
            <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
                <SearchBar
                    variant="white"
                    value={search}
                    onChange={onSearchChange}
                    placeholder="Поиск по коду, наименованию, реквизитам и тексту редакций…"
                    className="min-w-[280px]"
                />
            </div>

            {isArchScope && (
                <div
                    className="flex items-center gap-[11px] px-4 py-3 bg-[#f6f8fb] border border-[#eef2f7] rounded-xl mb-4">
                    <AlertTriangle className="w-[18px] h-[18px] flex-none text-[#8b97ab]" strokeWidth={1.8}/>
                    <span className="text-[12.5px] text-[#55617a] leading-[1.5]">
                        Архивированные (недействующие) ВНД. Отмена оформляется служебной запиской
                        и не согласуется.
                    </span>
                </div>
            )}

            {/* Фильтр статуса (только "Все") + расширенный поиск + колонки */}
            <div className="flex items-center gap-2.5 flex-wrap mb-[15px]">
                <button
                    onClick={onToggleAdv}
                    className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                        advOpen
                            ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                            : "border-[#e5e9f0] bg-white"
                    }`}
                >
                    <SlidersHorizontal className="w-[15px] h-[15px]" strokeWidth={1.8}/>
                    Расширенный поиск
                    <ChevronDown
                        className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${advOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                    />
                </button>

                {/* Мультивыбор статусов - только на табе "Все" (применяется сразу, вне черновика) */}
                {scope === "all" && (
                    <MultiSelectDropdown
                        triggerLabel="Статус"
                        label="Статус документа"
                        options={statusOptions}
                        selectedKeys={statusFilters}
                        onToggle={onToggleStatus}
                        onSelectAll={onSelectAllStatuses}
                        onDeselectAll={onDeselectAllStatuses}
                        searchable={false}
                        searchThreshold={Infinity}
                    />
                )}

                <MultiSelectDropdown
                    icon={<Filter className="w-[15px] h-[15px]" strokeWidth={1.8}/>}
                    triggerLabel="Колонки"
                    label="Отображение колонок"
                    options={toggleableColumns.map((c) => ({key: c.key, label: c.label}))}
                    selectedKeys={selectedColumnKeys}
                    onToggle={onToggleColumn}
                    onSelectAll={onSelectAllColumns}
                    onDeselectAll={onDeselectAllColumns}
                    searchThreshold={8}
                    searchPlaceholder="Поиск колонки…"
                />

                <div className="flex-1"/>

                {hasActiveFilters && (
                    <button
                        onClick={onResetFilters}
                        className="inline-flex items-center h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        Сбросить фильтры
                    </button>
                )}

                <div className="text-[12.5px] text-[#8b97ab]">
                    {showTotalOnly ? (
                        <>
                            Всего документов:{" "}
                            <b className="text-[#3a4560] font-mono">{totalCount}</b>
                        </>
                    ) : (
                        <>
                            Найдено:{" "}
                            <b className="text-[#3a4560] font-mono">{resultCount}</b>{" "}документов из{" "}
                            {totalCount}
                        </>
                    )}
                </div>
            </div>

            {/* Панель расширенного поиска - значения черновика, применяются по кнопке "Найти" */}
            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-in-out ${
                    advOpen
                        ? "grid-rows-[1fr] opacity-100 mb-4"
                        : "grid-rows-[0fr] opacity-0 mb-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                        <div className="flex flex-col gap-3.5 mb-[18px]">

                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] gap-x-[18px] gap-y-3.5 mb-[18px]">

                                {/* Колонка 1 */}
                                <div className="flex flex-col gap-3.5">
                                    <label>
                                        <span
                                            className="block text-[11.5px] text-[#8b97ab] mb-[5px]">Код документа</span>
                                        <SearchBar
                                            variant="white"
                                            value={draft.advSearchCode}
                                            onChange={(v) => updateDraft("advSearchCode", v)}
                                            placeholder="Поиск по коду…"
                                        />
                                    </label>

                                    <label>
                                        <span
                                            className="block text-[11.5px] text-[#8b97ab] mb-[5px]">Наименование</span>
                                        <SearchBar
                                            variant="white"
                                            value={draft.advSearchName}
                                            onChange={(v) => updateDraft("advSearchName", v)}
                                            placeholder="Поиск по наименованию…"
                                        />
                                    </label>

                                    <label>
                                        <span
                                            className="block text-[11.5px] text-[#8b97ab] mb-[5px]">Текст редакции</span>
                                        <SearchBar
                                            variant="white"
                                            value={draft.advSearchRevisionText}
                                            onChange={(v) => updateDraft("advSearchRevisionText", v)}
                                            placeholder="Поиск по тексту редакции…"
                                        />
                                    </label>

                                    <SelectListField
                                        label="Вид документа"
                                        modalTitle="Вид документа"
                                        options={TYPE_VND.map((t) => ({key: t.id, label: t.name}))}
                                        selectedKeys={draft.docTypeFilters}
                                        onChange={(v) => updateDraft("docTypeFilters", v)}
                                        searchPlaceholder="Поиск вида документа…"
                                    />
                                </div>

                                {/* Колонка 2 */}
                                <div className="flex flex-col gap-3.5">
                                    <SelectListField
                                        label="Разработчик"
                                        modalTitle="Разработчик (СП)"
                                        options={ORG_UNITS.map((o) => ({
                                            key: o.id,
                                            label: o.name,
                                            parentId: o.parentId
                                        }))}
                                        selectedKeys={draft.developerFilters}
                                        onChange={(v) => updateDraft("developerFilters", v)}
                                        searchPlaceholder="Поиск подразделения…"
                                        hierarchical
                                    />
                                    <SelectListField
                                        label="Орган утверждения"
                                        modalTitle="Орган утверждения"
                                        options={ORGANS_APPROVAL.map((o) => ({
                                            key: o.id,
                                            label: o.name,
                                            parentId: o.parentId
                                        }))}
                                        selectedKeys={draft.organFilters}
                                        onChange={(v) => updateDraft("organFilters", v)}
                                        searchPlaceholder="Поиск органа утверждения…"
                                        hierarchical
                                    />
                                    <SelectListField
                                        label="Ответственные исполнители"
                                        modalTitle="Ответственные исполнители"
                                        options={ORG_UNITS.map((o) => ({
                                            key: o.id,
                                            label: o.name,
                                            parentId: o.parentId
                                        }))}
                                        selectedKeys={draft.responsibleExecutorFilters}
                                        onChange={(v) => updateDraft("responsibleExecutorFilters", v)}
                                        searchPlaceholder="Поиск подразделения…"
                                        hierarchical
                                    />
                                </div>

                            </div>

                            {/* Даты */}
                            <div className="flex flex-col gap-3">
                                <div className="border border-[#eef2f7] rounded-xl p-3.5">
                                    <div
                                        className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                        Принятие и вступление в силу
                                    </div>
                                    <DateFilterGroup
                                        rows={[
                                            {
                                                key: "adoption",
                                                label: "Дата принятия",
                                                value: draft.adoptionDateFilter,
                                                onChange: (v) => updateDraft("adoptionDateFilter", v),
                                                codeLabel: "№ принятия",
                                                codeValue: draft.adoptionCodeFilter,
                                                onCodeChange: (v) => updateDraft("adoptionCodeFilter", v),
                                            },
                                            {
                                                key: "effective",
                                                label: "Дата вступления в силу",
                                                value: draft.effectiveDateFilter,
                                                onChange: (v) => updateDraft("effectiveDateFilter", v),
                                            },
                                        ]}
                                    />
                                </div>

                                <div className="grid [grid-template-columns:repeat(auto-fit,minmax(560px,1fr))] gap-3">
                                    <div className="border border-[#eef2f7] rounded-xl p-3.5 min-w-0">
                                        <div
                                            className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                            Изменения
                                        </div>
                                        <DateFilterGroup
                                            rows={[
                                                {
                                                    key: "requisitesChanged",
                                                    label: "Изменение реквизитов",
                                                    value: draft.requisitesChangedDateFilter,
                                                    onChange: (v) => updateDraft("requisitesChangedDateFilter", v),
                                                },
                                                {
                                                    key: "revisionChanged",
                                                    label: "Изменение редакции",
                                                    value: draft.revisionChangedDateFilter,
                                                    onChange: (v) => updateDraft("revisionChangedDateFilter", v),
                                                },
                                            ]}
                                        />
                                    </div>

                                    <div className="border border-[#eef2f7] rounded-xl p-3.5 min-w-0">
                                        <div
                                            className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                            Актуализация
                                        </div>
                                        <DateFilterGroup
                                            rows={[
                                                {
                                                    key: "dueActualization",
                                                    label: "Срок актуализации",
                                                    value: draft.dueActualizationDateFilter,
                                                    onChange: (v) => updateDraft("dueActualizationDateFilter", v),
                                                },
                                                {
                                                    key: "lastActualization",
                                                    label: "Дата посл. актуализации",
                                                    value: draft.lastActualizationDateFilter,
                                                    onChange: (v) => updateDraft("lastActualizationDateFilter", v),
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>

                                {scope !== "active" && (
                                    <div className="border border-[#eef2f7] rounded-xl p-3.5">
                                        <div
                                            className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                            Отмена и архивация
                                        </div>
                                        <DateFilterGroup
                                            rows={[
                                                {
                                                    key: "cancel",
                                                    label: "Дата отмены",
                                                    value: draft.cancelDateFilter,
                                                    onChange: (v) => updateDraft("cancelDateFilter", v),
                                                    codeLabel: "№ отмены",
                                                    codeValue: draft.cancelCodeFilter,
                                                    onCodeChange: (v) => updateDraft("cancelCodeFilter", v),
                                                },
                                                {
                                                    key: "archived",
                                                    label: "Дата архивации",
                                                    value: draft.archivedDateFilter,
                                                    onChange: (v) => updateDraft("archivedDateFilter", v),
                                                },
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Ключевые слова, Рубрикатор */}
                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[18px] gap-y-3.5">
                                <SelectListField
                                    label="Ключевые слова"
                                    modalTitle="Ключевые слова"
                                    options={KEYWORDS.map((o) => ({key: o.id, label: o.name, parentId: o.parentId}))}
                                    selectedKeys={draft.keywordFilters}
                                    onChange={(v) => updateDraft("keywordFilters", v)}
                                    searchPlaceholder="Поиск ключевых слов…"
                                    hierarchical
                                />
                                <SelectListField
                                    label="Рубрикатор"
                                    modalTitle="Рубрикатор"
                                    options={RUBRICS.map((o) => ({key: o.id, label: o.name, parentId: o.parentId}))}
                                    selectedKeys={draft.rubricFilters}
                                    onChange={(v) => updateDraft("rubricFilters", v)}
                                    searchPlaceholder="Поиск рубрики…"
                                    hierarchical
                                />
                            </div>

                            {/* Уровень секретности, Группы доступа */}
                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[18px] gap-y-3.5">
                                <SelectListField
                                    label="Уровень секретности"
                                    modalTitle="Уровень секретности"
                                    options={SECURITY_LEVELS.map((s) => ({key: s.id, label: s.name}))}
                                    selectedKeys={draft.secrecyLevelFilters}
                                    onChange={(v) => updateDraft("secrecyLevelFilters", v)}
                                    searchPlaceholder="Поиск уровня…"
                                />
                                <SelectListField
                                    label="Группы доступа"
                                    modalTitle="Группы доступа"
                                    options={USER_GROUPS.map((g) => ({key: g.id, label: g.name}))}
                                    selectedKeys={draft.userGroupFilters}
                                    onChange={(v) => updateDraft("userGroupFilters", v)}
                                    searchPlaceholder="Поиск группы…"
                                />
                            </div>

                        </div>


                        <div className="flex justify-end gap-2.5">
                            <button
                                onClick={handleCollapse}
                                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                <ChevronUp className="w-[15px] h-[15px]" strokeWidth={2}/>
                                Свернуть
                            </button>
                            <button
                                onClick={handleResetAdvancedDraft}
                                className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                Сбросить
                            </button>
                            <button
                                onClick={handleApplyAdvanced}
                                className="h-10 px-5 rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                            >
                                Найти
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}