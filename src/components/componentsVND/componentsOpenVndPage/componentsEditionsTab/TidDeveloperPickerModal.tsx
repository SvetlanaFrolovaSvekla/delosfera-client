// Модал выбора разработчика сформированного ТИД (строка "Разработчик:" в TidChangesTable) —
// список пользователей с теми же фильтрами, что и на странице "Пользователи" (СП, должность,
// источник учётной записи, роль). Специально переиспользует useUsersList/useDictionaries вместо
// узкого списка согласующих (см. VndSelectApproverModal, который берёт GET /users/approvers) —
// разработчиком ТИД может быть любой активный сотрудник, а не только тот, у кого есть право
// ActAsApprover.
import {useMemo} from "react";
import {createPortal} from "react-dom";
import {Loader2, User as UserIcon, X} from "lucide-react";
import {useUsersList} from "@/hooks/userHooks/useUsersList.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {
    MultiSelectDropdown, type MultiSelectOption
} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectDropdown.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {HighlightText} from "@/utils/HighlightText.tsx";
import type {UserResponse, UserSource} from "@/service/userService/userServiceType.ts";

export interface TidDeveloperOption {
    id: number;
    fullName: string;
    positionName: string | null;
}

// Те же подписи и цвета, что и у бейджа источника в столбце "Источник" на странице
// "Пользователи" (см. SOURCE_LABEL/SOURCE_STYLE в UsersTable.tsx) - чтобы чипс выбора в фильтре
// выглядел так же, как сам признак у пользователя.
const SOURCE_OPTIONS: (MultiSelectOption & { key: UserSource })[] = [
    {key: "Local", label: "Локальный", chipClassName: "text-[#7a4fd6] bg-[#f3edfd]"},
    {key: "Ldap", label: "LDAP", chipClassName: "text-[#3b6fd6] bg-[#eaf1fd]"},
];

interface TidDeveloperPickerModalProps {
    onClose: () => void;
    onSelect: (user: TidDeveloperOption) => void;
}

export function TidDeveloperPickerModal({onClose, onSelect}: TidDeveloperPickerModalProps) {
    const {
        search, setSearch,
        sourceFilters, toggleSourceFilter,
        orgUnitFilters, setOrgUnitFilters,
        positionFilters, setPositionFilters,
        roleFilters, setRoleFilters,
        roles, users, loading, error,
    } = useUsersList();

    const dictionaries = useDictionaries();
    const roleOptions = useMemo(() => roles.map((r) => ({key: String(r.id), label: r.titleRu})), [roles]);

    // Заблокированных и отключённых (в т.ч. пришедших неактивными из LDAP) в выбор не пускаем —
    // назначать разработчиком отключённую учётную запись бессмысленно (тот же принцип, что и в
    // VndSelectApproverModal).
    const activeUsers = useMemo(
        () => users.filter((u) => u.isActive && !u.isBlocked),
        [users],
    );

    const handlePick = (user: UserResponse) => {
        onSelect({
            id: user.id,
            fullName: user.fullName,
            positionName: user.position?.titleRu ?? null,
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div
                className="flex h-[82vh] w-full max-w-[640px] flex-col rounded-[16px] bg-white shadow-2xl">
                {/* Header — не overflow-hidden, как в остальных модалках: выпадающее меню фильтра
                    "Источник" (MultiSelectDropdown) позиционируется абсолютно и не через портал,
                    поэтому overflow-hidden на этом контейнере обрезало бы его снизу. */}
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-6 py-4">
                    <h2 className="text-[15px] font-bold text-[#1c2740]">Выбор разработчика</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                {/* Filters — как на странице "Пользователи": поиск, источник, должность, СП, роли */}
                <div className="flex flex-none flex-col gap-2.5 border-b border-[#eef0f5] px-6 py-4">
                    <SearchBar
                        variant="white"
                        value={search}
                        onChange={setSearch}
                        placeholder="Поиск по ФИО или логину…"
                        autoFocus
                    />

                    <MultiSelectDropdown
                        triggerLabel="Источник"
                        label="Источник учётной записи"
                        showFieldLabel
                        options={SOURCE_OPTIONS}
                        selectedKeys={sourceFilters}
                        onToggle={(key) => toggleSourceFilter(key as UserSource)}
                        onSelectAll={() => {
                            (["Local", "Ldap"] as UserSource[]).forEach((s) => {
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
                            label="Должность"
                            modalTitle="Должность"
                            options={dictionaries.positionOptions}
                            selectedKeys={positionFilters}
                            onChange={setPositionFilters}
                            searchPlaceholder="Поиск должности…"
                            boldLabel={false}
                        />
                        <MultiSelectField
                            label="СП"
                            modalTitle="Структурное подразделение"
                            options={dictionaries.orgUnitOptions}
                            selectedKeys={orgUnitFilters}
                            onChange={setOrgUnitFilters}
                            searchPlaceholder="Поиск подразделения…"
                            hierarchical
                            boldLabel={false}
                        />
                        <MultiSelectField
                            label="Роли"
                            modalTitle="Роли"
                            options={roleOptions}
                            selectedKeys={roleFilters}
                            onChange={setRoleFilters}
                            searchPlaceholder="Поиск роли…"
                            boldLabel={false}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-[#8b97ab]">
                            <Loader2 size={20} className="animate-spin"/>
                        </div>
                    ) : error ? (
                        <EmptyState variant="error" title="Не удалось загрузить данные!" description={error}/>
                    ) : activeUsers.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-[12.5px] text-[#8b97ab]">
                            Никого не нашлось
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {activeUsers.map((u) => (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => handlePick(u)}
                                    className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors hover:bg-[#f6f8fb]"
                                >
                                    <div
                                        className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f0f1fb] text-[#4e57d6]">
                                        <UserIcon size={16}/>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <HighlightText
                                            text={u.fullName}
                                            query={search}
                                            className="block truncate text-[13px] font-semibold text-[#26324a]"
                                        />
                                        <HighlightText
                                            text={u.email}
                                            query={search}
                                            className="block truncate text-[11.5px] text-[#8b97ab]"
                                        />
                                        <div className="truncate text-[11px] text-[#a3adbd]">
                                            {[u.position?.titleRu, u.orgUnit?.titleRu].filter(Boolean).join(" · ")}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
