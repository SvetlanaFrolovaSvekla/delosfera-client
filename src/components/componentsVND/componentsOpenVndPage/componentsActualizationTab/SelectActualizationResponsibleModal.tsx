// Модалка "Выбор ответственного за актуализацию" — тот же паттерн поиска и иерархического
// фильтра по СП, что и в VndSelectApproverModal (см. componentsCoordination/
// CoordinationRouteConstructor/functionalComponents), но без ограничения по праву ActAsApprover:
// ответственным за актуализацию может быть любой активный сотрудник (используем тот же
// GET /users/lookup, что и UserPicker/PickableUser — краткий список для назначения человека
// на задачу, без лишних полей полного профиля).
import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {Loader2, Search, User as UserIcon, X} from "lucide-react";
import {axiosInstance} from "@/service/axiosInstance.ts";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import type {TreeSelectOption} from "@/components/componentsGeneral/selects/MultiSelects/TreeMultiSelectModal.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

export interface ActualizationResponsibleOption {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
    orgUnitId: number | null;
}

interface OrgUnitOption {
    id: number;
    name: string;
    parentId: number | null;
}

interface RawLookupUser {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
    orgUnitId: number | null;
}

interface RawOrgUnitResponse {
    id: number;
    name: string;
    parentId: number | null;
}

async function fetchUsers(): Promise<ActualizationResponsibleOption[]> {
    const {data} = await axiosInstance.get<RawLookupUser[]>("/users/lookup");
    return data.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        position: u.position,
        orgUnit: u.orgUnit,
        orgUnitId: u.orgUnitId,
    }));
}

async function fetchOrgUnits(): Promise<OrgUnitOption[]> {
    const {data} = await axiosInstance.get<RawOrgUnitResponse[]>("/dictionaries/organization-unit");
    return data.map((o) => ({id: o.id, name: o.name, parentId: o.parentId}));
}

interface SelectActualizationResponsibleModalProps {
    /** Текущий пользователь — только чтобы пометить его в списке "это вы", как и в
     * VndSelectApproverModal; выбрать себя ответственным можно. */
    currentUserId: number;
    selectedUserId: number | null;
    onClose: () => void;
    onSelect: (user: ActualizationResponsibleOption) => void;
}

export function SelectActualizationResponsibleModal({
                                                          currentUserId,
                                                          selectedUserId,
                                                          onClose,
                                                          onSelect,
                                                      }: SelectActualizationResponsibleModalProps) {
    const [users, setUsers] = useState<ActualizationResponsibleOption[]>([]);
    const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    // множественный выбор СП — ключи в виде строк, как того требует MultiSelectField/TreeMultiSelectModal
    const [selectedOrgUnitKeys, setSelectedOrgUnitKeys] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([fetchUsers(), fetchOrgUnits()])
            .then(([userData, orgUnitData]) => {
                if (cancelled) return;
                setUsers(userData);
                setOrgUnits(orgUnitData);
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить список пользователей");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const orgUnitTreeOptions: TreeSelectOption[] = useMemo(
        () =>
            orgUnits.map((ou) => ({
                key: String(ou.id),
                label: ou.name,
                parentId: ou.parentId !== null ? String(ou.parentId) : undefined,
            })),
        [orgUnits],
    );

    const selectedOrgUnitIds = useMemo(
        () => new Set(selectedOrgUnitKeys.map((k) => Number(k))),
        [selectedOrgUnitKeys],
    );

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();

        return users
            .filter((u) => selectedOrgUnitIds.size === 0
                || (u.orgUnitId !== null && selectedOrgUnitIds.has(u.orgUnitId)))
            .filter((u) => (term === "" ? true : u.fullName.toLowerCase().includes(term)))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
    }, [users, search, selectedOrgUnitIds]);

    const handlePick = (user: ActualizationResponsibleOption) => {
        onSelect(user);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div
                className="flex h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-6 py-4">
                    <h2 className="text-[15px] font-bold text-[#1c2740]">Выбор ответственного за актуализацию</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-none flex-col gap-2 border-b border-[#eef0f5] px-6 py-4">
                    <div className="relative">
                        <Search size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b97ab]"/>
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по ФИО…"
                            className="h-[38px] w-full rounded-[10px] border border-[#e5e9f0] bg-[#fbfcfe] pl-9 pr-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    <MultiSelectField
                        label="Структурные подразделения"
                        modalTitle="Фильтр по СП"
                        options={orgUnitTreeOptions}
                        selectedKeys={selectedOrgUnitKeys}
                        onChange={setSelectedOrgUnitKeys}
                        hierarchical
                        searchPlaceholder="Поиск СП…"
                        selectedCountLabel="Выбрано СП"
                        boldLabel={false}
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-[#8b97ab]">
                            <Loader2 size={20} className="animate-spin"/>
                        </div>
                    ) : error ? (
                        <EmptyState variant="error" title="Не удалось загрузить данные!" description={error}/>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-[12.5px] text-[#8b97ab]">
                            Никого не нашлось
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {filteredUsers.map((u) => {
                                const isSelected = u.id === selectedUserId;
                                const isSelf = u.id === currentUserId;

                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => handlePick(u)}
                                        className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors hover:bg-[#f6f8fb] ${
                                            isSelected ? "bg-[#f6f8fb]" : ""
                                        }`}
                                    >
                                        <div
                                            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f0f1fb] text-[#4e57d6]">
                                            <UserIcon size={16}/>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-[13px] font-semibold text-[#26324a]">
                                                    {u.fullName}
                                                </span>
                                                {isSelf && (
                                                    <span
                                                        className="flex-none rounded-full bg-[#f2faf5] px-2 py-[1px] text-[10px] font-medium text-[#2c7a4b]">
                                                        это вы
                                                    </span>
                                                )}
                                            </div>
                                            <div className="truncate text-[11px] text-[#a3adbd]">
                                                {[u.position, u.orgUnit].filter(Boolean).join(" · ")}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
