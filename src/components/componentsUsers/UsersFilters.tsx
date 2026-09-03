// Поиск и фильтры для страницы пользователей
import React, {type ReactNode, useRef, useState} from "react";
import type {RoleResponse, UserSortBy, UserSource} from "@/service/userService/userServiceType.ts";
import type {UserColDef} from "@/constants/columnsFilters/usersColumns.ts";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {
    useUsersAdvancedFiltersDraft,
    type UserAdvancedDraft,
} from "@/hooks/userHooks/useUsersAdvancedFiltersDraft.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {MultiSelectDropdown} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectDropdown.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {
    ChevronDown, ChevronUp, SlidersHorizontal, Filter, Check,
    ArrowDownAZ, ArrowUpAZ, ArrowDown10, ArrowUp10,
} from "lucide-react";

const SORT_OPTIONS: { value: UserSortBy; label: string; icon: React.ReactNode }[] = [
    {value: "NameAsc", label: "ФИО (А–Я)", icon: <ArrowDownAZ className="w-[15px] h-[15px]" strokeWidth={1.8}/>},
    {value: "NameDesc", label: "ФИО (Я–А)", icon: <ArrowUpAZ className="w-[15px] h-[15px]" strokeWidth={1.8}/>},
    {
        value: "CreatedAtDesc",
        label: "Сначала новые",
        icon: <ArrowDown10 className="w-[15px] h-[15px]" strokeWidth={1.8}/>
    },
    {
        value: "CreatedAtAsc",
        label: "Сначала старые",
        icon: <ArrowUp10 className="w-[15px] h-[15px]" strokeWidth={1.8}/>
    },
];

const SOURCE_OPTIONS: { key: UserSource; label: string }[] = [
    {key: "Local", label: "Локальный"},
    {key: "Ldap", label: "LDAP"},
];

// Триггер сортировки в стиле MultiSelectDropdown, но одиночный выбор —
// поэтому не переиспользую сам MultiSelectDropdown, а собираю рядом в том же визуальном языке
function SortDropdown({value, onChange}: { value: UserSortBy; onChange: (v: UserSortBy) => void }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    useClickOutside(rootRef, open, () => setOpen(false));

    const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                    open
                        ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                        : "border-[#e5e9f0] bg-white"
                }`}
            >
                {current.icon}
                {current.label}
                <ChevronDown
                    className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`}
                    strokeWidth={2}
                />
            </button>

            {open && (
                <div
                    className="absolute top-[42px] left-0 z-30 w-[200px] bg-white border border-[#e5e9f0] rounded-xl shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)] overflow-hidden p-1">
                    {SORT_OPTIONS.map((o) => {
                        const active = o.value === value;
                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-[9px] rounded-lg text-left text-[13px] cursor-pointer transition-colors ${
                                    active ? "text-[#4e57d6] bg-[#f6f8fb] font-semibold" : "text-[#26324a] hover:bg-[#f6f8fb]"
                                }`}
                            >
                                {o.icon}
                                {o.label}
                                {active && <Check className="w-[14px] h-[14px] ml-auto" strokeWidth={2.5}/>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface UsersFiltersProps {
    search: string;
    onSearchChange: (v: string) => void;

    sortBy: UserSortBy;
    onSortByChange: (v: UserSortBy) => void;

    advOpen: boolean;
    onToggleAdv: () => void;
    onCloseAdv: () => void;

    sourceFilters: UserSource[];
    onToggleSourceFilter: (key: UserSource) => void;
    onSelectAllSources: () => void;
    onDeselectAllSources: () => void;

    /** Выбор представления журнала. Стоит рядом с «Колонки» — им и распоряжается. */
    viewPicker?: ReactNode;

    toggleableColumns: UserColDef[];
    visibleCols: Record<string, boolean>;
    onToggleColumn: (key: string) => void;
    onSelectAllColumns: () => void;
    onDeselectAllColumns: () => void;

    // Расширенный поиск: Должность / СП / Роли
    roles: RoleResponse[];
    positionFilters: string[];
    onPositionFiltersChange: (keys: string[]) => void;
    orgUnitFilters: string[];
    onOrgUnitFiltersChange: (keys: string[]) => void;
    roleFilters: string[];
    onRoleFiltersChange: (keys: string[]) => void;

    hasActiveFilters: boolean;
    onResetFilters: () => void;

    countLabel: string;
}

export function UsersFilters({
                                 search, onSearchChange,
                                 sortBy, onSortByChange,
                                 advOpen, onToggleAdv, onCloseAdv,
                                 sourceFilters, onToggleSourceFilter, onSelectAllSources, onDeselectAllSources,
                                 viewPicker,
                                 toggleableColumns, visibleCols, onToggleColumn, onSelectAllColumns, onDeselectAllColumns,
                                 roles, positionFilters, onPositionFiltersChange,
                                 orgUnitFilters, onOrgUnitFiltersChange,
                                 roleFilters, onRoleFiltersChange,
                                 hasActiveFilters, onResetFilters,
                                 countLabel,
                             }: UsersFiltersProps) {
    const selectedColumnKeys = toggleableColumns
        .filter((c) => visibleCols[c.key] !== false)
        .map((c) => c.key);

    // Справочники "Должность" и "СП" — из общего контекста, как и на странице ВНД
    const dictionaries = useDictionaries();

    const roleOptions = roles.map((r) => ({key: String(r.id), label: r.titleRu}));

    const applyDraft = (draft: UserAdvancedDraft) => {
        onPositionFiltersChange(draft.positionFilters);
        onOrgUnitFiltersChange(draft.orgUnitFilters);
        onRoleFiltersChange(draft.roleFilters);
    };

    const {draft, updateDraft, handleApply, handleCollapse, handleResetDraft} = useUsersAdvancedFiltersDraft({
        advOpen,
        onCloseAdv,
        appliedValues: {positionFilters, orgUnitFilters, roleFilters},
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
                    placeholder="Поиск по ФИО или логину…"
                    className="min-w-[280px]"
                />
            </div>

            {/* Фильтры + счётчик */}
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

                <SortDropdown value={sortBy} onChange={onSortByChange}/>

                <MultiSelectDropdown
                    triggerLabel="Источник"
                    label="Источник учётной записи"
                    options={SOURCE_OPTIONS.map((s) => ({key: s.key, label: s.label}))}
                    selectedKeys={sourceFilters}
                    onToggle={(key) => onToggleSourceFilter(key as UserSource)}
                    onSelectAll={onSelectAllSources}
                    onDeselectAll={onDeselectAllSources}
                    searchable={false}
                    searchThreshold={Infinity}
                />

                <MultiSelectDropdown
                    icon={<Filter className="w-[15px] h-[15px]" strokeWidth={1.8}/>}
                    triggerLabel="Колонки"
                    label="Отображение колонок"
                    options={toggleableColumns.map((c) => ({key: c.key, label: c.label}))}
                    selectedKeys={selectedColumnKeys}
                    onToggle={onToggleColumn}
                    onSelectAll={onSelectAllColumns}
                    onDeselectAll={onDeselectAllColumns}
                    searchable={false}
                    searchThreshold={Infinity}
                />

                {viewPicker}

                <div className="flex-1"/>

                {hasActiveFilters && (
                    <button
                        onClick={onResetFilters}
                        className="inline-flex items-center h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        Сбросить фильтры
                    </button>
                )}

                <div className="text-[12.5px] text-[#8b97ab] whitespace-nowrap">
                    {countLabel}
                </div>
            </div>

            {/* Панель расширенного поиска: Должность / СП / Роли */}
            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-in-out ${
                    advOpen ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0 mb-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                        <div
                            className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-x-[18px] gap-y-3.5 mb-[18px]">
                            <MultiSelectField
                                label="Должность"
                                modalTitle="Должность"
                                options={dictionaries.positionOptions}
                                selectedKeys={draft.positionFilters}
                                onChange={(v) => updateDraft("positionFilters", v)}
                                searchPlaceholder="Поиск должности…"
                            />
                            <MultiSelectField
                                label="СП"
                                modalTitle="Структурное подразделение"
                                options={dictionaries.orgUnitOptions}
                                selectedKeys={draft.orgUnitFilters}
                                onChange={(v) => updateDraft("orgUnitFilters", v)}
                                searchPlaceholder="Поиск подразделения…"
                                hierarchical
                            />
                            <MultiSelectField
                                label="Роли"
                                modalTitle="Роли"
                                options={roleOptions}
                                selectedKeys={draft.roleFilters}
                                onChange={(v) => updateDraft("roleFilters", v)}
                                searchPlaceholder="Поиск роли…"
                            />
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