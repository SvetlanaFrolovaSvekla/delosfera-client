// Фильтры списка пользователей как на странице "Пользователи": поиск, источник учётной записи,
// должность, СП, роли. Общие для окон выбора сотрудников (TidDeveloperPickerModal,
// NewRedactionRecipientsPickerModal) - состояние берётся прямо из useUsersList().
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import type {UserSource} from "@/service/userService/userServiceType.ts";
import type {useUsersList} from "@/hooks/userHooks/useUsersList.ts";
import {
    MultiSelectDropdown, type MultiSelectOption
} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectDropdown.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";

export type UserListFiltersState = Pick<ReturnType<typeof useUsersList>,
    | "search" | "setSearch"
    | "sourceFilters" | "toggleSourceFilter"
    | "orgUnitFilters" | "setOrgUnitFilters"
    | "positionFilters" | "setPositionFilters"
    | "roleFilters" | "setRoleFilters"
    | "roles">;

const ALL_SOURCES: UserSource[] = ["Local", "Ldap"];

interface UserListFiltersProps {
    filters: UserListFiltersState;
}

export function UserListFilters({filters}: UserListFiltersProps) {
    const {t} = useTranslation();
    const dictionaries = useDictionaries();
    const {
        search, setSearch,
        sourceFilters, toggleSourceFilter,
        orgUnitFilters, setOrgUnitFilters,
        positionFilters, setPositionFilters,
        roleFilters, setRoleFilters,
        roles,
    } = filters;

    // Те же подписи и цвета, что и у бейджа источника в столбце "Источник" на странице
    // "Пользователи" (см. SOURCE_LABEL/SOURCE_STYLE в UsersTable.tsx) - чтобы чипс выбора в
    // фильтре выглядел так же, как сам признак у пользователя.
    const sourceOptions: (MultiSelectOption & { key: UserSource })[] = [
        {key: "Local", label: t("tidDeveloperPickerModal.sourceLocal"), chipClassName: "text-[#7a4fd6] bg-[#f3edfd]"},
        {key: "Ldap", label: t("tidDeveloperPickerModal.sourceLdap"), chipClassName: "text-[#3b6fd6] bg-[#eaf1fd]"},
    ];

    const roleOptions = useMemo(() => roles.map((r) => ({key: String(r.id), label: r.titleRu})), [roles]);

    return (
        <div className="flex flex-none flex-col gap-2.5 border-b border-[#eef0f5] px-6 py-4">
            <SearchBar
                variant="white"
                value={search}
                onChange={setSearch}
                placeholder={t("tidDeveloperPickerModal.searchPlaceholder")}
                autoFocus
            />

            <MultiSelectDropdown
                triggerLabel={t("tidDeveloperPickerModal.sourceTriggerLabel")}
                label={t("tidDeveloperPickerModal.sourceFieldLabel")}
                showFieldLabel
                options={sourceOptions}
                selectedKeys={sourceFilters}
                onToggle={(key) => toggleSourceFilter(key as UserSource)}
                onSelectAll={() => {
                    ALL_SOURCES.forEach((s) => {
                        if (!sourceFilters.includes(s)) toggleSourceFilter(s);
                    });
                }}
                onDeselectAll={() => sourceFilters.forEach((s) => toggleSourceFilter(s))}
                searchable={false}
                searchThreshold={Infinity}
                className="self-start"
            />

            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-2.5">
                <MultiSelectField
                    label={t("tidDeveloperPickerModal.positionLabel")}
                    modalTitle={t("tidDeveloperPickerModal.positionLabel")}
                    options={dictionaries.positionOptions}
                    selectedKeys={positionFilters}
                    onChange={setPositionFilters}
                    searchPlaceholder={t("tidDeveloperPickerModal.positionSearchPlaceholder")}
                    boldLabel={false}
                />
                <MultiSelectField
                    label={t("tidDeveloperPickerModal.orgUnitLabel")}
                    modalTitle={t("tidDeveloperPickerModal.orgUnitModalTitle")}
                    options={dictionaries.orgUnitOptions}
                    selectedKeys={orgUnitFilters}
                    onChange={setOrgUnitFilters}
                    searchPlaceholder={t("tidDeveloperPickerModal.orgUnitSearchPlaceholder")}
                    hierarchical
                    boldLabel={false}
                />
                <MultiSelectField
                    label={t("tidDeveloperPickerModal.rolesLabel")}
                    modalTitle={t("tidDeveloperPickerModal.rolesLabel")}
                    options={roleOptions}
                    selectedKeys={roleFilters}
                    onChange={setRoleFilters}
                    searchPlaceholder={t("tidDeveloperPickerModal.rolesSearchPlaceholder")}
                    boldLabel={false}
                />
            </div>
        </div>
    );
}
