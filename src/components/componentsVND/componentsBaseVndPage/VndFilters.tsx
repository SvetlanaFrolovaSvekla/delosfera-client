// Расширенный поиск для реестра ВНД
import type {ReactNode} from "react";
import {Trans, useTranslation} from "react-i18next";
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
import {AlertTriangle, Check, ChevronDown, ChevronUp, Filter, SlidersHorizontal} from "lucide-react";
import {useInitiatorOptions} from "@/hooks/useInitiatorOptions.ts";
import {LinkedToMeRelationDropdown} from "@/components/componentsVND/componentsBaseVndPage/LinkedToMeRelationDropdown.tsx";
import {LINKED_TO_ME_RELATION_OPTIONS} from "@/constants/linkedToMeRelations.ts";

interface VndFiltersProps {
    scope: VndScope;
    isArchScope: boolean;

    /** Право ViewVndRegistryExtended: колонки/фильтры "Статус последней редакции" и "Актуализация" */
    canViewExtended: boolean;

    /** Согласование/создание/актуализация/консолидация — виден ли чекбокс "Только связанные со мной" */
    canFilterLinkedToMe: boolean;

    linkedToMeOnly: boolean;
    onLinkedToMeOnlyChange: (v: boolean) => void;

    linkedToMeRelations: string[];
    onToggleLinkedToMeRelation: (key: string) => void;
    onSelectAllLinkedToMeRelations: () => void;
    onDeselectAllLinkedToMeRelations: () => void;

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

    /** Выбор представления журнала. Стоит рядом с «Колонки» — им и распоряжается. */
    viewPicker?: ReactNode;

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
        scope, isArchScope, canViewExtended, canFilterLinkedToMe,
        linkedToMeOnly, onLinkedToMeOnlyChange,
        linkedToMeRelations, onToggleLinkedToMeRelation,
        onSelectAllLinkedToMeRelations, onDeselectAllLinkedToMeRelations,
        search, onSearchChange,
        statusOptions, statusFilters, onToggleStatus, onSelectAllStatuses, onDeselectAllStatuses,
        advOpen, onToggleAdv, onCloseAdv,
        rubricFilters, onRubricFiltersChange,
        resultCount, totalCount, onResetFilters,
        viewPicker,
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

    const {t} = useTranslation();

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
                    placeholder={t("registry.filters.searchPlaceholder")}
                    className="min-w-[280px]"
                />
            </div>

            {isArchScope && (
                <div
                    className="flex items-center gap-[11px] px-4 py-3 bg-[#f6f8fb] border border-[#eef2f7] rounded-xl mb-4">
                    <AlertTriangle className="w-[18px] h-[18px] flex-none text-[#8b97ab]" strokeWidth={1.8}/>
                    <span className="text-[12.5px] text-[#55617a] leading-[1.5]">
                        {t("registry.filters.archiveNotice")}
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
                    {t("registry.filters.advancedSearch")}
                    <ChevronDown
                        className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${advOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                    />
                    {hasAdvancedActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white" />
                    )}
                </button>

                <div className="relative">
                    {/* "Колонки" — это настройка отображения, а не фильтр данных (скрытые колонки не
                        меняют состав строк реестра), поэтому зелёная точка "есть активный фильтр",
                        в отличие от остальных выпадающих списков на этой панели, здесь никогда не
                        показывается — даже когда часть колонок скрыта. */}
                    <MultiSelectDropdown
                        icon={<Filter className="w-[15px] h-[15px]" strokeWidth={1.8}/>}
                        triggerLabel={t("registry.filters.columns.trigger")}
                        label={t("registry.filters.columns.label")}
                        options={toggleableColumns.map((c) => ({key: c.key, label: t(c.labelKey)}))}
                        selectedKeys={selectedColumnKeys}
                        onToggle={onToggleColumn}
                        onSelectAll={onSelectAllColumns}
                        onDeselectAll={onDeselectAllColumns}
                        searchThreshold={8}
                        searchPlaceholder={t("registry.filters.columns.searchPlaceholder")}
                        plain
                    />
                </div>

                {(scope === "all" || scope === "active" || scope === "notYetActive") && canViewExtended && (
                    <div className="relative">
                        <MultiSelectDropdown
                            triggerLabel={t("registry.filters.statusLabel")}
                            label={t("registry.filters.statusLabel")}
                            options={statusOptions}
                            selectedKeys={statusFilters}
                            onToggle={onToggleStatus}
                            onSelectAll={onSelectAllStatuses}
                            onDeselectAll={onDeselectAllStatuses}
                            searchable={false}
                            searchThreshold={Infinity}
                            plain
                        />
                        {statusFilters.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white pointer-events-none" />
                        )}
                    </div>
                )}

                {scope !== "draft" && canFilterLinkedToMe && (
                    <>
                        <button
                            type="button"
                            onClick={() => onLinkedToMeOnlyChange(!linkedToMeOnly)}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] select-none"
                        >
                            <span
                                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                                style={{
                                    borderColor: linkedToMeOnly ? "#4e57d6" : "#cbd3df",
                                    background: linkedToMeOnly ? "#4e57d6" : "white",
                                }}
                            >
                                <Check
                                    className="w-[13px] h-[13px] text-white"
                                    strokeWidth={3}
                                    style={{opacity: linkedToMeOnly ? 1 : 0}}
                                />
                            </span>
                            {t("registry.filters.linkedToMeOnly")}
                        </button>

                        {linkedToMeOnly && (
                            <div className="relative">
                                <LinkedToMeRelationDropdown
                                    triggerLabel={t("registry.filters.linkedToMe.trigger")}
                                    selectedKeys={linkedToMeRelations}
                                    onToggle={onToggleLinkedToMeRelation}
                                    onSelectAll={onSelectAllLinkedToMeRelations}
                                    onDeselectAll={onDeselectAllLinkedToMeRelations}
                                />
                                {linkedToMeRelations.length < LINKED_TO_ME_RELATION_OPTIONS.length && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white pointer-events-none" />
                                )}
                            </div>
                        )}
                    </>
                )}

                {viewPicker}

                <div className="flex-1"/>

                <div className="text-[12.5px] text-[#8b97ab]">
                    {hasActiveFilters ? (
                        <>
                            {t(SCOPE_COUNT_LABELS[scope].found)}:{" "}
                            <Trans
                                i18nKey="registry.filters.resultOfTotal"
                                values={{result: resultCount, total: totalCount}}
                                components={{b: <b className="text-[#3a4560] font-mono"/>}}
                            />
                        </>
                    ) : (
                        <>
                            {t(SCOPE_COUNT_LABELS[scope].total)}:{" "}
                            <b className="text-[#3a4560] font-mono">{totalCount}</b>
                        </>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={onResetFilters}
                        className="inline-flex items-center h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        {t("vnd.emptyState.resetFilters")}
                    </button>
                )}
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
                                            className="block text-[11.5px] text-[#8b97ab] mb-[5px]">{t("codeCard.label")}</span>
                                        <SearchBar
                                            variant="white"
                                            value={draft.advSearchCode}
                                            onChange={(v) => updateDraft("advSearchCode", v)}
                                            placeholder={t("registry.filters.advanced.codePlaceholder")}
                                        />
                                    </label>

                                    <label>
                                        <span
                                            className="block text-[11.5px] text-[#8b97ab] mb-[5px]">{t("registry.filters.advanced.name")}</span>
                                        <SearchBar
                                            variant="white"
                                            value={draft.advSearchName}
                                            onChange={(v) => updateDraft("advSearchName", v)}
                                            placeholder={t("registry.filters.advanced.namePlaceholder")}
                                        />
                                    </label>

                                    <label>
                                        <span
                                            className="block text-[11.5px] text-[#8b97ab] mb-[5px]">{t("registry.filters.advanced.revisionText")}</span>
                                        <SearchBar
                                            variant="white"
                                            value={draft.advSearchRevisionText}
                                            onChange={(v) => updateDraft("advSearchRevisionText", v)}
                                            placeholder={t("registry.filters.advanced.revisionTextPlaceholder")}
                                        />
                                    </label>

                                    <MultiSelectField
                                        label={t("createVnd.fields.docType")}
                                        modalTitle={t("createVnd.fields.docType")}
                                        options={dictionaries.typeOptions}
                                        selectedKeys={draft.docTypeFilters}
                                        onChange={(v) => updateDraft("docTypeFilters", v)}
                                        searchPlaceholder={t("createVnd.fields.docTypeSearchPlaceholder")}
                                    />
                                </div>

                                <div className="flex flex-col gap-3.5">
                                    <MultiSelectField
                                        label={t("openVndPage.historyTab.developerLabel")}
                                        modalTitle={t("createVnd.fields.developer")}
                                        options={dictionaries.orgUnitOptions}
                                        selectedKeys={draft.developerFilters}
                                        onChange={(v) => updateDraft("developerFilters", v)}
                                        searchPlaceholder={t("registry.filters.advanced.orgUnitSearchPlaceholder")}
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label={t("createVnd.fields.approvalBody")}
                                        modalTitle={t("createVnd.fields.approvalBody")}
                                        options={dictionaries.organOptions}
                                        selectedKeys={draft.organFilters}
                                        onChange={(v) => updateDraft("organFilters", v)}
                                        searchPlaceholder={t("createVnd.fields.approvalBodySearchPlaceholder")}
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label={t("createVnd.fields.responsibleExecutors")}
                                        modalTitle={t("createVnd.fields.responsibleExecutors")}
                                        options={dictionaries.orgUnitOptions}
                                        selectedKeys={draft.responsibleExecutorFilters}
                                        onChange={(v) => updateDraft("responsibleExecutorFilters", v)}
                                        searchPlaceholder={t("registry.filters.advanced.orgUnitSearchPlaceholder")}
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label={t("openVndPage.passportTab.initiatorLabel")}
                                        modalTitle={t("openVndPage.passportTab.initiatorLabel")}
                                        options={initiatorOptions.options}
                                        selectedKeys={draft.initiatorFilters}
                                        onChange={(v) => updateDraft("initiatorFilters", v)}
                                        searchPlaceholder={t("registry.filters.advanced.initiatorSearchPlaceholder")}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="border border-[#eef2f7] rounded-xl p-3.5">
                                    <div
                                        className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                        {t("openVndPage.passportTab.sections.adoption")}
                                    </div>
                                    <DateFilterGroup
                                        rows={[
                                            {
                                                key: "adoption",
                                                label: t("openVndPage.passportTab.adoptionDateLabel"),
                                                value: draft.adoptionDateFilter,
                                                onChange: (v) => updateDraft("adoptionDateFilter", v),
                                                codeLabel: t("openVndPage.passportTab.adoptionCodeLabel"),
                                                codeValue: draft.adoptionCodeFilter,
                                                onCodeChange: (v) => updateDraft("adoptionCodeFilter", v),
                                            },
                                            {
                                                key: "effective",
                                                label: t("openVndPage.passportTab.effectiveDateLabel"),
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
                                            {t("openVndPage.passportTab.sections.changes")}
                                        </div>
                                        <DateFilterGroup
                                            rows={[
                                                {
                                                    key: "requisitesChanged",
                                                    label: t("openVndPage.passportTab.requisitesChangedLabel"),
                                                    value: draft.requisitesChangedDateFilter,
                                                    onChange: (v) => updateDraft("requisitesChangedDateFilter", v),
                                                },
                                                {
                                                    key: "revisionChanged",
                                                    label: t("openVndPage.passportTab.revisionChangedLabel"),
                                                    value: draft.revisionChangedDateFilter,
                                                    onChange: (v) => updateDraft("revisionChangedDateFilter", v),
                                                },
                                            ]}
                                        />
                                    </div>

                                    {canViewExtended && (
                                        <div className="border border-[#eef2f7] rounded-xl p-3.5 min-w-0">
                                            <div
                                                className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                                {t("openVndPage.passportTab.sections.actualization")}
                                            </div>
                                            <DateFilterGroup
                                                rows={[
                                                    {
                                                        key: "dueActualization",
                                                        label: t("openVndPage.passportTab.dueActualizationDateLabel"),
                                                        value: draft.dueActualizationDateFilter,
                                                        onChange: (v) => updateDraft("dueActualizationDateFilter", v),
                                                    },
                                                    {
                                                        key: "lastActualization",
                                                        label: t("openVndPage.passportTab.lastActualizationDateLabel"),
                                                        value: draft.lastActualizationDateFilter,
                                                        onChange: (v) => updateDraft("lastActualizationDateFilter", v),
                                                    },
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>

                                {scope !== "active" && (
                                    <div className="border border-[#eef2f7] rounded-xl p-3.5">
                                        <div
                                            className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                            {t("openVndPage.passportTab.sections.cancelArchive")}
                                        </div>
                                        <DateFilterGroup
                                            rows={[
                                                {
                                                    key: "cancel",
                                                    label: t("openVndPage.passportTab.cancelDateLabel"),
                                                    value: draft.cancelDateFilter,
                                                    onChange: (v) => updateDraft("cancelDateFilter", v),
                                                    codeLabel: t("openVndPage.passportTab.cancelCodeLabel"),
                                                    codeValue: draft.cancelCodeFilter,
                                                    onCodeChange: (v) => updateDraft("cancelCodeFilter", v),
                                                },
                                                {
                                                    key: "archived",
                                                    label: t("openVndPage.passportTab.archivedDateLabel"),
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
                                    label={t("createVnd.classifiers.keywords")}
                                    modalTitle={t("createVnd.classifiers.keywords")}
                                    options={dictionaries.keywordOptions}
                                    selectedKeys={draft.keywordFilters}
                                    onChange={(v) => updateDraft("keywordFilters", v)}
                                    searchPlaceholder={t("createVnd.classifiers.keywordsSearchPlaceholder")}
                                    hierarchical
                                />
                            </div>

                            <div
                                className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[18px] gap-y-3.5">
                                <MultiSelectField
                                    label={t("createVnd.classifiers.secrecyLevel")}
                                    modalTitle={t("createVnd.classifiers.secrecyLevel")}
                                    options={dictionaries.secrecyOptions}
                                    selectedKeys={draft.secrecyLevelFilters}
                                    onChange={(v) => updateDraft("secrecyLevelFilters", v)}
                                    searchPlaceholder={t("createVnd.classifiers.secrecyLevelSearchPlaceholder")}
                                />
                                <MultiSelectField
                                    label={t("createVnd.classifiers.userGroups")}
                                    modalTitle={t("createVnd.classifiers.userGroups")}
                                    options={dictionaries.userGroupOptions}
                                    selectedKeys={draft.userGroupFilters}
                                    onChange={(v) => updateDraft("userGroupFilters", v)}
                                    searchPlaceholder={t("createVnd.classifiers.userGroupsSearchPlaceholder")}
                                />
                                <MultiSelectField
                                    label={t("createVnd.classifiers.rubric")}
                                    modalTitle={t("createVnd.classifiers.rubric")}
                                    options={dictionaries.rubricOptions}
                                    selectedKeys={draft.rubricFilters}
                                    onChange={(v) => updateDraft("rubricFilters", v)}
                                    searchPlaceholder={t("createVnd.classifiers.rubricSearchPlaceholder")}
                                    hierarchical
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5">
                            <button
                                onClick={handleCollapse}
                                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                <ChevronUp className="w-[15px] h-[15px]" strokeWidth={2}/>
                                {t("registry.filters.advanced.collapse")}
                            </button>
                            <button
                                onClick={handleResetDraft}
                                className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                {t("registry.filters.advanced.reset")}
                            </button>
                            <button
                                onClick={handleApply}
                                className="h-10 px-5 rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                            >
                                {t("registry.filters.advanced.apply")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}