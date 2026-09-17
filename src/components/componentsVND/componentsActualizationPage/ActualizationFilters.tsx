// Расширенный поиск для страницы актуализации ВНД
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {
    useVndActualizationFiltersDraft,
    type ActualizationDraft,
} from "@/hooks/actualizationHooks/useVndActualizationFiltersDraft";
import {DateFilterGroup, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {MultiSelectDropdown} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectDropdown.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {ChevronDown, ChevronUp, Filter, SlidersHorizontal} from "lucide-react";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";

interface ColDefLike {
    key: string;
    labelKey: string;
}

function isDateFilterActive(v: DateFilterValue): boolean {
    return v.mode === "exact" ? Boolean(v.exact) : Boolean(v.from || v.to);
}

interface ActualizationFiltersProps {
    search: string;
    onSearchChange: (v: string) => void;

    advOpen: boolean;
    onToggleAdv: () => void;
    onCloseAdv: () => void;

    typeFilters: string[];
    onTypeFiltersChange: (keys: string[]) => void;

    developerFilters: string[];
    onDeveloperFiltersChange: (keys: string[]) => void;

    organFilters: string[];
    onOrganFiltersChange: (keys: string[]) => void;

    dueDateFilter: DateFilterValue;
    onDueDateFilterChange: (v: DateFilterValue) => void;

    resultCount: number;

    /** Показывать кнопку "Сбросить фильтры" (учитывает и поиск, и bucket-пилюли на странице) */
    showResetButton: boolean;
    onResetFilters: () => void;

    toggleableColumns: ColDefLike[];
    visibleCols: Record<string, boolean>;
    onToggleColumn: (key: string) => void;
    onSelectAllColumns: () => void;
    onDeselectAllColumns: () => void;

    /** Чекбокс "Только ни разу не актуализированные" — работает вместе с табами Все/В норме/... */
    neverActualizedOnly: boolean;
    onNeverActualizedOnlyChange: (v: boolean) => void;
}

export function ActualizationFilters(props: ActualizationFiltersProps) {
    const {t} = useTranslation();
    const {
        search, onSearchChange,
        advOpen, onToggleAdv, onCloseAdv,
        typeFilters, onTypeFiltersChange,
        developerFilters, onDeveloperFiltersChange,
        organFilters, onOrganFiltersChange,
        dueDateFilter, onDueDateFilterChange,
        resultCount, showResetButton, onResetFilters,
        toggleableColumns, visibleCols, onToggleColumn, onSelectAllColumns, onDeselectAllColumns,
        neverActualizedOnly, onNeverActualizedOnlyChange,
    } = props;

    // Справочники берём из общего контекста — грузятся один раз на всё приложение
    const {typeOptions, organOptions, orgUnitOptions} = useDictionaries();

    const selectedColumnKeys = toggleableColumns
        .filter((c) => visibleCols[c.key] !== false)
        .map((c) => c.key);

    // Индикатор для точки на кнопке "Расширенный поиск" — считаем от применённых значений
    const hasAdvancedActive =
        typeFilters.length > 0 || developerFilters.length > 0 || organFilters.length > 0 ||
        isDateFilterActive(dueDateFilter);

    const applyDraft = (draft: ActualizationDraft) => {
        onTypeFiltersChange(draft.typeFilters);
        onDeveloperFiltersChange(draft.developerFilters);
        onOrganFiltersChange(draft.organFilters);
        onDueDateFilterChange(draft.dueDateFilter);
    };

    const {draft, updateDraft, handleApply, handleCollapse, handleResetDraft} = useVndActualizationFiltersDraft({
        onCloseAdv,
        appliedValues: {typeFilters, developerFilters, organFilters, dueDateFilter},
        onApply: applyDraft,
    });

    return (
        <>
            <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
                <SearchBar
                    variant="white"
                    value={search}
                    onChange={onSearchChange}
                    placeholder={t("actualizationPage.filters.searchPlaceholder")}
                    className="min-w-[280px]"
                />
            </div>

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
                    {/* Расширенный поиск */}
                    {t("actualizationPage.filters.advancedSearch")}
                    <ChevronDown
                        className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${advOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                    />
                    {hasAdvancedActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white"/>
                    )}
                </button>

                <MultiSelectDropdown
                    icon={<Filter className="w-[15px] h-[15px]" strokeWidth={1.8}/>}
                    triggerLabel={t("actualizationPage.filters.columnsTrigger")}
                    label={t("actualizationPage.filters.columnsLabel")}
                    options={toggleableColumns.map((c) => ({key: c.key, label: t(c.labelKey)}))}
                    selectedKeys={selectedColumnKeys}
                    onToggle={onToggleColumn}
                    onSelectAll={onSelectAllColumns}
                    onDeselectAll={onDeselectAllColumns}
                    searchThreshold={8}
                    searchPlaceholder={t("actualizationPage.filters.columnsSearchPlaceholder")}
                    plain
                />

                <CheckBoxOne
                    checked={neverActualizedOnly}
                    onChange={onNeverActualizedOnlyChange}
                >
                    {/* Только ни разу не актуализированные */}
                    {t("actualizationPage.filters.neverActualizedOnly")}
                    <HelpTooltip content={t("actualizationPage.filters.neverActualizedOnlyHint")}/>
                </CheckBoxOne>

                <div className="flex-1"/>

                {showResetButton && (
                    <button
                        onClick={onResetFilters}
                        className="inline-flex items-center h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        {/* Сбросить фильтры */}
                        {t("actualizationPage.filters.resetFilters")}
                    </button>
                )}

                <div className="text-[12.5px] text-[#8b97ab]">
                    {/* Найдено: */}
                    {t("actualizationPage.filters.foundCount")} <b className="text-[#3a4560] font-mono">{resultCount}</b>
                </div>
            </div>

            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-in-out ${
                    advOpen ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0 mb-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-x-[18px] gap-y-3.5 mb-[18px]">
                            <MultiSelectField
                                label={t("actualizationPage.filters.typeLabel")}
                                modalTitle={t("actualizationPage.filters.typeModalTitle")}
                                options={typeOptions}
                                selectedKeys={draft.typeFilters}
                                onChange={(v) => updateDraft("typeFilters", v)}
                                searchPlaceholder={t("actualizationPage.filters.typeSearchPlaceholder")}
                            />
                            <MultiSelectField
                                label={t("actualizationPage.filters.developerLabel")}
                                modalTitle={t("actualizationPage.filters.developerModalTitle")}
                                options={orgUnitOptions}
                                selectedKeys={draft.developerFilters}
                                onChange={(v) => updateDraft("developerFilters", v)}
                                searchPlaceholder={t("actualizationPage.filters.developerSearchPlaceholder")}
                                hierarchical
                            />
                            <MultiSelectField
                                label={t("actualizationPage.filters.organLabel")}
                                modalTitle={t("actualizationPage.filters.organModalTitle")}
                                options={organOptions}
                                selectedKeys={draft.organFilters}
                                onChange={(v) => updateDraft("organFilters", v)}
                                searchPlaceholder={t("actualizationPage.filters.organSearchPlaceholder")}
                                hierarchical
                            />
                        </div>

                        <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-[18px]">
                            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                {/* Срок актуализации */}
                                {t("actualizationPage.filters.dueDate")}
                            </div>
                            <DateFilterGroup
                                rows={[
                                    {
                                        key: "dueActualization",
                                        label: t("actualizationPage.filters.dueDate"),
                                        value: draft.dueDateFilter,
                                        onChange: (v) => updateDraft("dueDateFilter", v),
                                    },
                                ]}
                            />
                        </div>

                        <div className="flex justify-end gap-2.5">
                            <button
                                onClick={handleCollapse}
                                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                <ChevronUp className="w-[15px] h-[15px]" strokeWidth={2}/>
                                {/* Свернуть */}
                                {t("actualizationPage.filters.collapse")}
                            </button>
                            <button
                                onClick={handleResetDraft}
                                className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                {/* Сбросить */}
                                {t("actualizationPage.filters.reset")}
                            </button>
                            <button
                                onClick={handleApply}
                                className="h-10 px-5 rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                            >
                                {/* Найти */}
                                {t("actualizationPage.filters.apply")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}