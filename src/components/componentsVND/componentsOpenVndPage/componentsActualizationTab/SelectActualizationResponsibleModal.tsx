// Модалка "Выбор ответственного за актуализацию" — тот же паттерн поиска и иерархического
// фильтра по СП, что и в VndSelectApproverModal (см. componentsCoordination/
// CoordinationRouteConstructor/functionalComponents), но без ограничения по праву ActAsApprover:
// ответственным за актуализацию может быть любой активный сотрудник (используем тот же
// GET /users/lookup, что и UserPicker/PickableUser — краткий список для назначения человека
// на задачу, без лишних полей полного профиля).
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {axiosInstance} from "@/service/axiosInstance.ts";
import {useOrgUnitFilter} from "@/hooks/vndHooks/useOrgUnitFilter.ts";
import {
    UserPickerListStatus,
    UserPickerModalShell,
    UserPickerSearchInput
} from "@/components/componentsGeneral/userPicker/UserPickerModalShell.tsx";
import {OrgUnitMultiSelectFilter} from "@/components/componentsGeneral/selects/OrgUnitMultiSelectFilter.tsx";
import {UserIcon} from "lucide-react";

export interface ActualizationResponsibleOption {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
    orgUnitId: number | null;
}

interface RawLookupUser {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
    orgUnitId: number | null;
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

interface SelectActualizationResponsibleModalProps {
    /** Текущий пользователь — только чтобы пометить его в списке "это вы", как и в
     * VndSelectApproverModal; выбрать себя ответственным можно. */
    currentUserId: number;
    selectedUserId: number | null;
    onClose: () => void;
    onSelect: (user: ActualizationResponsibleOption) => void;
}

export function SelectActualizationResponsibleModal({currentUserId, selectedUserId, onClose, onSelect}: SelectActualizationResponsibleModalProps) {
    const {t} = useTranslation();
    const [users, setUsers] = useState<ActualizationResponsibleOption[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState(false);
    const [search, setSearch] = useState("");

    const {treeOptions, selectedKeys, setSelectedKeys, selectedIds, loading: orgLoading, error: orgError} = useOrgUnitFilter();

    useEffect(() => {
        let cancelled = false;
        fetchUsers()
            .then((data) => { if (!cancelled) setUsers(data); })
            .catch(() => { if (!cancelled) setUsersError(true); })
            .finally(() => { if (!cancelled) setUsersLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const loading = usersLoading || orgLoading;
    // Не удалось загрузить список пользователей
    const error = usersError || orgError ? t("selectApproverModal.loadUsersError") : null;

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        return users
            .filter((u) => selectedIds.size === 0 || (u.orgUnitId !== null && selectedIds.has(u.orgUnitId)))
            .filter((u) => term === "" || u.fullName.toLowerCase().includes(term))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
    }, [users, search, selectedIds]);

    const handlePick = (user: ActualizationResponsibleOption) => {
        onSelect(user);
        onClose();
    };

    return (
        <UserPickerModalShell
            title={t("selectResponsibleModal.title")}
            onClose={onClose}
            filters={
                <>
                    <UserPickerSearchInput value={search} onChange={setSearch} placeholder={t("selectResponsibleModal.searchPlaceholder")}/>
                    <OrgUnitMultiSelectFilter options={treeOptions} selectedKeys={selectedKeys} onChange={setSelectedKeys}/>
                </>
            }
        >
            <UserPickerListStatus loading={loading} error={error} isEmpty={filteredUsers.length === 0}/>
            {!loading && !error && filteredUsers.length > 0 && (
                <div className="flex flex-col gap-1">
                    {filteredUsers.map((u) => {
                        const isSelected = u.id === selectedUserId;
                        const isSelf = u.id === currentUserId;
                        return (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => handlePick(u)}
                                className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors hover:bg-[#f6f8fb] ${isSelected ? "bg-[#f6f8fb]" : ""}`}
                            >
                                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f0f1fb] text-[#4e57d6]">
                                    <UserIcon size={16}/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-[13px] font-semibold text-[#26324a]">{u.fullName}</span>
                                        {isSelf && (
                                            <span className="flex-none rounded-full bg-[#f2faf5] px-2 py-[1px] text-[10px] font-medium text-[#2c7a4b]">
                                                {/* это вы */}
                                                {t("selectApproverModal.selfBadge")}
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
        </UserPickerModalShell>
    );
}