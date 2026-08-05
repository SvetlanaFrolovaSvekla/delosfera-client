// Модал выбора согласующего: список пользователей с иерархическим фильтром по СП и поиском
import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {Loader2, Search, ShieldCheck, User as UserIcon, X} from "lucide-react";
import {axiosInstance} from "@/service/axiosInstance.ts";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import type {TreeSelectOption} from "@/components/componentsGeneral/selects/MultiSelects/TreeMultiSelectModal.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {useAuth} from "@/context/AuthContext.ts";

export interface ApproverOption {
    id: number;
    fullName: string;
    email: string;
    orgUnitId: number | null;
    orgUnitName: string | null;
    positionName: string | null;
    isActive: boolean;
}

interface OrgUnitOption {
    id: number;
    name: string;
    parentId: number | null;
}

interface RawUserResponse {
    id: number;
    fullName: string;
    email: string;
    isActive: boolean;
    position?: { name: string } | null;
    orgUnit?: { id: number; name: string } | null;
}

interface RawOrgUnitResponse {
    id: number;
    name: string;
    parentId: number | null;
}

async function fetchAllUsers(): Promise<ApproverOption[]> {
    const {data} = await axiosInstance.get<RawUserResponse[]>("api/users");
    return data.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        orgUnitId: u.orgUnit?.id ?? null,
        orgUnitName: u.orgUnit?.name ?? null,
        positionName: u.position?.name ?? null,
        isActive: u.isActive,
    }));
}

async function fetchOrgUnits(): Promise<OrgUnitOption[]> {
    const {data} = await axiosInstance.get<RawOrgUnitResponse[]>("/dictionaries/organization-unit");
    return data.map((o) => ({id: o.id, name: o.name, parentId: o.parentId}));
}

interface VndSelectApproverModalProps {
    /** Если задан - фильтр на это СП (для фиксированных этапов маршрута), выбор СП скрыт */
    lockedOrgUnitId?: number;
    /** Подпись СП (используем название этапа, а не запрос к справочнику) */
    lockedOrgUnitLabel?: string;
    /** id пользователей, уже занятых на других этапах — показываем как недоступные */
    excludedUserIds: Set<number>;
    onClose: () => void;
    onSelect: (user: ApproverOption) => void;
}

export function VndSelectApproverModal({
                                           lockedOrgUnitId,
                                           lockedOrgUnitLabel,
                                           excludedUserIds,
                                           onClose,
                                           onSelect,
                                       }: VndSelectApproverModalProps) {
    const {user: currentUser} = useAuth();

    const [users, setUsers] = useState<ApproverOption[]>([]);
    const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    // множественный выбор СП — ключи в виде строк, как того требует MultiSelectField/TreeMultiSelectModal
    const [selectedOrgUnitKeys, setSelectedOrgUnitKeys] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([fetchAllUsers(), fetchOrgUnits()])
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
            .filter((u) => {
                if (lockedOrgUnitId) return u.orgUnitId === lockedOrgUnitId;
                if (selectedOrgUnitIds.size === 0) return true;
                return u.orgUnitId !== null && selectedOrgUnitIds.has(u.orgUnitId);
            })
            .filter((u) =>
                term === ""
                    ? true
                    : u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
            )
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
    }, [users, search, selectedOrgUnitIds, lockedOrgUnitId]);

    const handlePick = (user: ApproverOption) => {
        if (excludedUserIds.has(user.id)) return;

        const isSelf = currentUser?.id === user.id;
        // На фиксированном этапе (lockedOrgUnitId задан) себя выбрать можно - согласование
        // на этом этапе засчитается автоматически. На дополнительном этапе - нельзя.
        if (isSelf && !lockedOrgUnitId) return;

        onSelect(user);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div
                className="flex h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-6 py-4">
                    <h2 className="text-[15px] font-bold text-[#1c2740]">Выбор согласующего</h2>
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
                            placeholder="Поиск по ФИО или email…"
                            className="h-[38px] w-full rounded-[10px] border border-[#e5e9f0] bg-[#fbfcfe] pl-9 pr-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    {lockedOrgUnitId ? (
                        <div
                            className="flex items-center gap-2 rounded-[10px] border border-[#d9ecdf] bg-[#f2faf5] px-3 py-2 text-[12px] text-[#2c7a4b]">
                            <ShieldCheck size={14} className="flex-none"/>
                            Фиксированное СП: <span className="font-semibold">{lockedOrgUnitLabel}</span>
                        </div>
                    ) : (
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
                    )}
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
                                const isSelf = currentUser?.id === u.id;
                                const selfAllowed = Boolean(lockedOrgUnitId) && isSelf;
                                const isExcluded = excludedUserIds.has(u.id) || (isSelf && !selfAllowed);

                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        disabled={isExcluded}
                                        onClick={() => handlePick(u)}
                                        className={`flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors ${
                                            isExcluded
                                                ? "cursor-not-allowed opacity-45"
                                                : "cursor-pointer hover:bg-[#f6f8fb]"
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
                                                {!u.isActive && (
                                                    <span
                                                        className="flex-none rounded-full bg-[#fdf1f1] px-2 py-[1px] text-[10px] font-medium text-[#c0392b]">
                            неактивен
                        </span>
                                                )}
                                                {isSelf ? (
                                                    <span
                                                        className={`flex-none rounded-full px-2 py-[1px] text-[10px] font-medium ${
                                                            selfAllowed
                                                                ? "bg-[#f2faf5] text-[#2c7a4b]"
                                                                : "bg-[#fdf3ea] text-[#b3701e]"
                                                        }`}
                                                    >
                            {selfAllowed ? "это вы · авто-согласование" : "это вы"}
                        </span>
                                                ) : excludedUserIds.has(u.id) && (
                                                    <span
                                                        className="flex-none rounded-full bg-[#f0f1f5] px-2 py-[1px] text-[10px] font-medium text-[#8b97ab]">
                            уже выбран
                        </span>
                                                )}
                                            </div>
                                            <div className="truncate text-[11.5px] text-[#8b97ab]">{u.email}</div>
                                            <div className="truncate text-[11px] text-[#a3adbd]">
                                                {[u.positionName, u.orgUnitName].filter(Boolean).join(" · ")}
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