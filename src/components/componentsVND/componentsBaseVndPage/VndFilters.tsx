// Расширенный поиск для реестра ВНД
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {useVndAdvancedFiltersDraft, type AdvancedDraft} from "@/hooks/vndHooks/useVndAdvancedFiltersDraft.ts";
import {useVndHasActiveFilters} from "@/hooks/vndHooks/useVndHasActiveFilters.ts";
import type {VndScope} from "@/constants/vndTabs.ts";
import type {ColDef} from "@/constants/columnsFilters/vndColumns.ts";
import {SCOPE_COUNT_LABELS} from "@/constants/vndStatus.ts";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {DateFilterGroup, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {MultiSelectDropdown} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectDropdown.tsx";
import {AlertTriangle, ChevronDown, ChevronUp, Filter, SlidersHorizontal} from "lucide-react";
import {useInitiatorOptions} from "@/hooks/useInitiatorOptions.ts";

interface VndFiltersProps {
    scope: VndScope;
    isArchScope: boolean;

    linkedToMeOnly: boolean;
    onLinkedToMeOnlyChange: (v: boolean) => void;

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

    /** Фильтр по инициатору (id пользователей, создавших документ) */
    initiatorFilters: string[];
    onInitiatorFiltersChange: (keys: string[]) => void;

    advSearchName: string;
    onAdvSearchNameChange: (v: string) => void;

    advSearchCode: string;
    onAdvSearchCodeChange: (v: string) => void;

    advSearchRevisionText: string;
    onAdvSearchRevisionTextChange: (v: string) => void;

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

export function VndFilters(props: VndFiltersProps) {
    const {
        scope, isArchScope, linkedToMeOnly, onLinkedToMeOnlyChange, search, onSearchChange,
        statusOptions, statusFilters, onToggleStatus, onSelectAllStatuses, onDeselectAllStatuses,
        advOpen, onToggleAdv, onCloseAdv,
        rubricFilters, onRubricFiltersChange,
        resultCount, totalCount, onResetFilters,
        toggleableColumns, visibleCols, onToggleColumn, onSelectAllColumns, onDeselectAllColumns,
        onDocTypeFiltersChange, docTypeFilters,
        organFilters, onOrganFiltersChange,
        onDeveloperFiltersChange, developerFilters,
        keywordFilters, onKeywordFiltersChange,
        responsibleExecutorFilters, onResponsibleExecutorFiltersChange,
        initiatorFilters, onInitiatorFiltersChange,
        advSearchName, onAdvSearchNameChange,
        advSearchCode, onAdvSearchCodeChange,
        advSearchRevisionText, onAdvSearchRevisionTextChange,
        adoptionDateFilter, onAdoptionDateFilterChange,
        adoptionCodeFilter, onAdoptionCodeFilterChange,
        effectiveDateFilter, onEffectiveDateFilterChange,
        requisitesChangedDateFilter, onRequisitesChangedDateFilterChange,
        revisionChangedDateFilter, onRevisionChangedDateFilterChange,
        cancelDateFilter, onCancelDateFilterChange,
        cancelCodeFilter, onCancelCodeFilterChange,
        dueActualizationDateFilter, onDueActualizationDateFilterChange,
        lastActualizationDateFilter, onLastActualizationDateFilterChange,
        archivedDateFilter, onArchivedDateFilterChange,
        userGroupFilters, onUserGroupFiltersChange,
        secrecyLevelFilters, onSecrecyLevelFiltersChange,
    } = props;

    // Справочники берём из общего контекста — грузятся один раз на всё приложение
    const dictionaries = useDictionaries();

    // Список пользователей для фильтра "Инициатор" — отдельный лёгкий хук (не часть
    // общего DictionariesContext, т.к. пользователи — не совсем справочник)
    const initiatorOptions = useInitiatorOptions();

    const selectedColumnKeys = toggleableColumns
        .filter((c) => visibleCols[c.key] !== false)
        .map((c) => c.key);

    const hasActiveFilters = useVndHasActiveFilters({
        search, linkedToMeOnly, statusFilters, rubricFilters, docTypeFilters, organFilters,
        developerFilters, keywordFilters, responsibleExecutorFilters, initiatorFilters,
        advSearchName, advSearchCode, advSearchRevisionText,
        adoptionCodeFilter, cancelCodeFilter, secrecyLevelFilters, userGroupFilters,
        adoptionDateFilter, effectiveDateFilter, requisitesChangedDateFilter,
        revisionChangedDateFilter, cancelDateFilter, dueActualizationDateFilter,
        lastActualizationDateFilter, archivedDateFilter,
    });

    const hasAdvancedActive = useVndHasActiveFilters({
        search: "", linkedToMeOnly: false, statusFilters: [],
        rubricFilters, docTypeFilters, organFilters,
        developerFilters, keywordFilters, responsibleExecutorFilters, initiatorFilters,
        advSearchName, advSearchCode, advSearchRevisionText,
        adoptionCodeFilter, cancelCodeFilter, secrecyLevelFilters, userGroupFilters,
        adoptionDateFilter, effectiveDateFilter, requisitesChangedDateFilter,
        revisionChangedDateFilter, cancelDateFilter, dueActualizationDateFilter,
        lastActualizationDateFilter, archivedDateFilter,
    });

    const applyDraft = (draft: AdvancedDraft) => {
        onDocTypeFiltersChange(draft.docTypeFilters);
        onOrganFiltersChange(draft.organFilters);
        onDeveloperFiltersChange(draft.developerFilters);
        onResponsibleExecutorFiltersChange(draft.responsibleExecutorFilters);
        onInitiatorFiltersChange(draft.initiatorFilters);
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
    };

    const {draft, updateDraft, handleApply, handleCollapse, handleResetDraft} = useVndAdvancedFiltersDraft({
        onCloseAdv,
        appliedValues: {
            docTypeFilters, organFilters, developerFilters, responsibleExecutorFilters, initiatorFilters,
            keywordFilters, rubricFilters, secrecyLevelFilters, userGroupFilters,
            advSearchName, advSearchCode, advSearchRevisionText,
            adoptionDateFilter, adoptionCodeFilter, effectiveDateFilter,
            requisitesChangedDateFilter, revisionChangedDateFilter,
            cancelDateFilter, cancelCodeFilter,
            dueActualizationDateFilter, lastActualizationDateFilter, archivedDateFilter,
        },
        onApply: applyDraft,
    });

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

            <div className="flex items-center gap-2.5 flex-wrap mb-[15px]">
                <button
                    onClick={onToggleAdv}
                    className={`relative inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
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
                    {hasAdvancedActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white" />
                    )}
                </button>

                {scope === "all" && (
                    <div className="relative">
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
                        {statusFilters.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white pointer-events-none" />
                        )}
                    </div>
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

                {scope !== "draft" && (
                    <label className="inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] select-none">
                        <input
                            type="checkbox"
                            checked={linkedToMeOnly}
                            onChange={(e) => onLinkedToMeOnlyChange(e.target.checked)}
                            className="h-4 w-4 accent-[#4e57d6]"
                        />
                        Только связанные со мной
                    </label>
                )}

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
                    {hasActiveFilters ? (
                        <>
                            {SCOPE_COUNT_LABELS[scope].found}:{" "}
                            <b className="text-[#3a4560] font-mono">{resultCount}</b>{" "}из{" "}
                            {totalCount}
                        </>
                    ) : (
                        <>
                            {SCOPE_COUNT_LABELS[scope].total}:{" "}
                            <b className="text-[#3a4560] font-mono">{totalCount}</b>
                        </>
                    )}
                </div>
            </div>

            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-in-out ${
                    advOpen ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0 mb-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                        <div className="flex flex-col gap-3.5 mb-[18px]">
                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] gap-x-[18px] gap-y-3.5 mb-[18px]">
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

                                    <MultiSelectField
                                        label="Вид документа"
                                        modalTitle="Вид документа"
                                        options={dictionaries.typeOptions}
                                        selectedKeys={draft.docTypeFilters}
                                        onChange={(v) => updateDraft("docTypeFilters", v)}
                                        searchPlaceholder="Поиск вида документа…"
                                    />
                                </div>

                                <div className="flex flex-col gap-3.5">
                                    <MultiSelectField
                                        label="Разработчик"
                                        modalTitle="Разработчик (СП)"
                                        options={dictionaries.orgUnitOptions}
                                        selectedKeys={draft.developerFilters}
                                        onChange={(v) => updateDraft("developerFilters", v)}
                                        searchPlaceholder="Поиск подразделения…"
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label="Орган утверждения"
                                        modalTitle="Орган утверждения"
                                        options={dictionaries.organOptions}
                                        selectedKeys={draft.organFilters}
                                        onChange={(v) => updateDraft("organFilters", v)}
                                        searchPlaceholder="Поиск органа утверждения…"
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label="Ответственные исполнители"
                                        modalTitle="Ответственные исполнители"
                                        options={dictionaries.orgUnitOptions}
                                        selectedKeys={draft.responsibleExecutorFilters}
                                        onChange={(v) => updateDraft("responsibleExecutorFilters", v)}
                                        searchPlaceholder="Поиск подразделения…"
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label="Инициатор"
                                        modalTitle="Инициатор"
                                        options={initiatorOptions.options}
                                        selectedKeys={draft.initiatorFilters}
                                        onChange={(v) => updateDraft("initiatorFilters", v)}
                                        searchPlaceholder="Поиск по ФИО…"
                                    />
                                </div>
                            </div>

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

                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[18px] gap-y-3.5">
                                <MultiSelectField
                                    label="Ключевые слова"
                                    modalTitle="Ключевые слова"
                                    options={dictionaries.keywordOptions}
                                    selectedKeys={draft.keywordFilters}
                                    onChange={(v) => updateDraft("keywordFilters", v)}
                                    searchPlaceholder="Поиск ключевых слов…"
                                    hierarchical
                                />
                                <MultiSelectField
                                    label="Рубрикатор"
                                    modalTitle="Рубрикатор"
                                    options={dictionaries.rubricOptions}
                                    selectedKeys={draft.rubricFilters}
                                    onChange={(v) => updateDraft("rubricFilters", v)}
                                    searchPlaceholder="Поиск рубрики…"
                                    hierarchical
                                />
                            </div>

                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[18px] gap-y-3.5">
                                <MultiSelectField
                                    label="Уровень секретности"
                                    modalTitle="Уровень секретности"
                                    options={dictionaries.secrecyOptions}
                                    selectedKeys={draft.secrecyLevelFilters}
                                    onChange={(v) => updateDraft("secrecyLevelFilters", v)}
                                    searchPlaceholder="Поиск уровня…"
                                />
                                <MultiSelectField
                                    label="Группы доступа"
                                    modalTitle="Группы доступа"
                                    options={dictionaries.userGroupOptions}
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
                                onClick={handleResetDraft}
                                className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                Сбросить
                            </button>
                            <button
                                onClick={handleApply}
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