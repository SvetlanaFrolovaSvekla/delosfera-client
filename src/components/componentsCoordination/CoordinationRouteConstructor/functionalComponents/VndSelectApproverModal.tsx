// Модал выбора согласующего: список пользователей с иерархическим фильтром по СП и поиском
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next"
import {useAuth} from "@/context/AuthContext.ts";
import {axiosInstance} from "@/service/axiosInstance.ts";
import {useOrgUnitFilter} from "@/hooks/vndHooks/useOrgUnitFilter.ts";
import {OrgUnitMultiSelectFilter} from "@/components/componentsGeneral/selects/OrgUnitMultiSelectFilter.tsx";
import {collectSubtreeKeys} from "@/utils/treeSelectUtils.ts";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {
    UserPickerModalShell,
    UserPickerSearchInput,
    UserPickerListStatus,
} from "@/components/componentsGeneral/userPicker/UserPickerModalShell.tsx";
import {Info, ShieldCheck, User as UserIcon} from "lucide-react";

export interface ApproverOption {
    id: number;
    fullName: string;
    email: string;
    orgUnitId: number | null;
    orgUnitName: string | null;
    positionName: string | null;
    isActive: boolean;
}

// Отдаётся GET /api/users/approvers - уже отфильтрован по праву ActAsApprover,
// активности и отсутствию блокировки (см. UserController.Approvers на бэкенде).
interface RawApproverResponse {
    id: number;
    fullName: string;
    email: string;
    orgUnitId: number | null;
    orgUnitName: string | null;
    positionName: string | null;
}

async function fetchAllUsers(): Promise<ApproverOption[]> {
    // Важно: не /users (все пользователи), а /users/approvers - иначе в списке согласующих
    // окажется вообще каждый сотрудник, включая тех, у кого нет права ActAsApprover.
    const {data} = await axiosInstance.get<RawApproverResponse[]>("/users/approvers");
    return data.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        orgUnitId: u.orgUnitId,
        orgUnitName: u.orgUnitName,
        positionName: u.positionName,
        // Эндпоинт уже отдаёт только активных пользователей.
        isActive: true,
    }));
}

interface VndSelectApproverModalProps {
    /** Если задан - фильтр на это СП (для фиксированных этапов маршрута), выбор СП скрыт */
    lockedOrgUnitId?: number;
    /** Подпись СП (используем название этапа, а не запрос к справочнику) */
    lockedOrgUnitLabel?: string;
    /** id пользователей, уже занятых на других этапах — показываем как недоступные */
    excludedUserIds: Set<number>;
    /** Станет ли текущий (авторизованный) пользователь инициатором ЭТОГО запуска согласования -
     * см. VndStartApprovalModal.actingOnSomeoneElsesDraft/initiator. По умолчанию true (как и
     * было раньше, когда выбора инициатора не существовало вовсе - запускающий и инициатор
     * всегда совпадали). Влияет только на подпись "авто-согласование" ниже: выбор себя самого
     * на фиксированном этапе остаётся возможным независимо от этого флага, но фактически
     * автосогласуется (см. VndApprovalService.StartAsync) только когда согласующий совпадает
     * с ИНИЦИАТОРОМ, а не просто с тем, кто нажал кнопку "Запустить согласование" - когда
     * главный редактор запускает согласование чужого черновика, оставляя инициатором автора,
     * его собственное участие в фиксированном этапе больше не автосогласуется. */
    currentUserIsInitiator?: boolean;
    onClose: () => void;
    onSelect: (user: ApproverOption) => void;
}

export function VndSelectApproverModal({
                                           lockedOrgUnitId,
                                           lockedOrgUnitLabel,
                                           excludedUserIds,
                                           currentUserIsInitiator = true,
                                           onClose,
                                           onSelect,
                                       }: VndSelectApproverModalProps) {
    const {t} = useTranslation();
    const {user: currentUser} = useAuth();

    const [users, setUsers] = useState<ApproverOption[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState(false);
    const [search, setSearch] = useState("");

    // Справочник СП нужен в обоих режимах: при свободном выборе - для фильтра, при
    // фиксированном этапе (lockedOrgUnitId) - чтобы захватить вложенные подразделения.
    const {treeOptions, selectedKeys, setSelectedKeys, selectedIds, loading: orgLoading, error: orgError} =
        useOrgUnitFilter();

    // Все активные сотрудники (без фильтра по праву) - только чтобы подсказать, сколько людей
    // из выбранного СП не попало в список из-за отсутствия права ActAsApprover. После
    // синхронизации с AD новые учётки получают роль по умолчанию, и если в ней нет этого права,
    // список выглядит пустым без объяснения причин. Ошибка загрузки здесь не критична.
    const [allActive, setAllActive] = useState<UserLookupItem[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        userService.lookup()
            .then((data) => { if (!cancelled) setAllActive(data); })
            .catch(() => { if (!cancelled) setAllActive(null); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchAllUsers()
            .then((data) => {
                if (!cancelled) setUsers(data);
            })
            .catch(() => {
                if (!cancelled) setUsersError(true);
            })
            .finally(() => {
                if (!cancelled) setUsersLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loading = usersLoading || orgLoading;
    // Не удалось загрузить список пользователей
    const error = usersError || (!lockedOrgUnitId && orgError) ? t("selectApproverModal.loadUsersError") : null;

    // Множество СП, сотрудники которых попадают в список; null - без ограничения по СП.
    // Фиксированный этап: само СП этапа и все вложенные в него (сотрудники после синхронизации
    // оргструктуры числятся в отделах/секторах, а этап заведён на департамент/управление).
    // Если справочник СП не загрузился - откатываемся к точному совпадению.
    const scopeIds = useMemo<Set<number> | null>(() => {
        if (lockedOrgUnitId) {
            if (treeOptions.length === 0) return new Set([lockedOrgUnitId]);
            return new Set(Array.from(collectSubtreeKeys(treeOptions, [String(lockedOrgUnitId)]), Number));
        }
        // Фильтр-дерево уже каскадно отмечает потомков выбранного узла.
        return selectedIds.size === 0 ? null : selectedIds;
    }, [lockedOrgUnitId, treeOptions, selectedIds]);

    const inScope = useCallback(
        (orgUnitId: number | null | undefined) =>
            scopeIds === null || (orgUnitId !== null && orgUnitId !== undefined && scopeIds.has(orgUnitId)),
        [scopeIds],
    );

    // Сколько сотрудников выбранного СП не показано из-за отсутствия права быть согласующим.
    const hiddenWithoutRight = useMemo(() => {
        if (scopeIds === null || allActive === null) return 0;
        const approverIds = new Set(users.map((u) => u.id));
        return allActive.filter((u) => !approverIds.has(u.id) && inScope(u.orgUnitId)).length;
    }, [scopeIds, allActive, users, inScope]);

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();

        return users
            .filter((u) => inScope(u.orgUnitId))
            .filter((u) =>
                term === ""
                    ? true
                    : u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
            )
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
    }, [users, search, inScope]);

    const handlePick = (user: ApproverOption) => {
        if (excludedUserIds.has(user.id)) return;

        const isSelf = currentUser?.id === user.id;
        // На фиксированном этапе (lockedOrgUnitId задан) себя выбрать можно - согласование
        // на этом этапе засчитается автоматически. На дополнительном этапе - нельзя.
        if (isSelf && !lockedOrgUnitId) return;

        onSelect(user);
        onClose();
    };

    return (
        <UserPickerModalShell
            // Выбор согласующего
            title={t("selectApproverModal.title")}
            onClose={onClose}
            filters={
                <>
                    <UserPickerSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder={t("selectApproverModal.searchPlaceholder")}
                    />

                    {lockedOrgUnitId ? (
                        <div
                            className="flex items-center gap-2 rounded-[10px] border border-[#d9ecdf] bg-[#f2faf5] px-3 py-2 text-[12px] text-[#2c7a4b]">
                            <ShieldCheck size={14} className="flex-none"/>
                            {/* Фиксированное СП: */}
                            {t("selectApproverModal.lockedOrgUnitPrefix")}
                            <span className="font-semibold">{lockedOrgUnitLabel}</span>
                        </div>
                    ) : (
                        <OrgUnitMultiSelectFilter
                            options={treeOptions}
                            selectedKeys={selectedKeys}
                            onChange={setSelectedKeys}
                        />
                    )}
                </>
            }
        >
            <UserPickerListStatus loading={loading} error={error} isEmpty={filteredUsers.length === 0}/>

            {!loading && !error && hiddenWithoutRight > 0 && (
                <div className="mb-2 flex items-start gap-2 rounded-[10px] border border-[#f1e3c8] bg-[#fdf8ee] px-3 py-2 text-[11.5px] leading-[1.45] text-[#8a6418]">
                    <Info size={14} className="mt-[1px] flex-none"/>
                    <span>
                        {t("selectApproverModal.hiddenWithoutRight", {
                            count: hiddenWithoutRight,
                            defaultValue: "Ещё сотрудников этого СП: {{count}} — их нет в списке, потому что у их ролей нет права «Выступать согласующим». Выдать право можно в «Роли и права».",
                        })}
                    </span>
                </div>
            )}

            {!loading && !error && filteredUsers.length > 0 && (
                <div className="flex flex-col gap-1">
                    {filteredUsers.map((u) => {
                        const isSelf = currentUser?.id === u.id;
                        const selfAllowed = Boolean(lockedOrgUnitId) && isSelf;
                        // Автосогласование засчитывается только когда сам себе выбранный
                        // согласующий (selfAllowed) ещё и окажется инициатором этого
                        // запуска - см. comment у currentUserIsInitiator выше.
                        const selfAutoApproved = selfAllowed && currentUserIsInitiator;
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
                                                {/* неактивен */}
                                                {t("selectApproverModal.inactiveBadge")}
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
                                                {/* "это вы · авто-согласование" / "это вы" */}
                                                {selfAutoApproved
                                                    ? t("selectApproverModal.selfBadgeAutoApproved")
                                                    : t("selectApproverModal.selfBadge")}
                                            </span>
                                        ) : excludedUserIds.has(u.id) && (
                                            <span
                                                className="flex-none rounded-full bg-[#f0f1f5] px-2 py-[1px] text-[10px] font-medium text-[#8b97ab]">
                                                {/* уже выбран */}
                                                {t("selectApproverModal.alreadySelectedBadge")}
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
        </UserPickerModalShell>
    );
}