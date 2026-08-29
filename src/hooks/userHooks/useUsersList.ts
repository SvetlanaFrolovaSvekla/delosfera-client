import {useCallback, useEffect, useState} from "react";
import type {RoleResponse, UserCounts, UserResponse, UserSortBy, UserSource} from "@/service/userService/userServiceType.ts";
import {roleService} from "@/service/userService/roleService.ts";
import {userService} from "@/service/userService/userService.ts";

export type UserStatusScope = "all" | "active" | "blocked";

/** Сколько строк показываем за раз. Полный список тянуть незачем: он растёт вместе со штатом. */
const PAGE_SIZE = 25;

export function useUsersList() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState<UserSortBy>("NameAsc");
    const [statusScope, setStatusScope] = useState<UserStatusScope>("all");

    const [sourceFilters, setSourceFilters] = useState<UserSource[]>([]);
    // Храним id как строки — тот же формат, что и у ключей MultiSelectField/DictOption в остальном приложении
    const [orgUnitFilters, setOrgUnitFilters] = useState<string[]>([]);
    const [positionFilters, setPositionFilters] = useState<string[]>([]);
    const [roleFilters, setRoleFilters] = useState<string[]>([]);

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    // Счётчики вкладок приходят с сервера: по одной странице их не посчитать.
    const [counts, setCounts] = useState<UserCounts>({all: 0, active: 0, blocked: 0});
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        roleService.getAll().then(setRoles).catch(() => setRoles([]));
    }, []);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await userService.getPage({
                page,
                pageSize: PAGE_SIZE,
                sortBy,
                search: debouncedSearch || undefined,
                orgUnitIds: orgUnitFilters.length ? orgUnitFilters.map(Number) : undefined,
                positionIds: positionFilters.length ? positionFilters.map(Number) : undefined,
                roleIds: roleFilters.length ? roleFilters.map(Number) : undefined,
                sources: sourceFilters.length ? sourceFilters : undefined,
                isBlocked: statusScope === "all" ? undefined : statusScope === "blocked",
            });
            setUsers(data.items);
            setTotal(data.total);
            setCounts(data.counts);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось загрузить пользователей");
        } finally {
            setLoading(false);
        }
    }, [page, sortBy, debouncedSearch, orgUnitFilters, positionFilters, roleFilters, sourceFilters, statusScope]);

    // Смена отбора начинает список заново: третьей страницы результата, которого
    // всего одна страница, не существует, и человек увидел бы пустой список.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [debouncedSearch, sortBy, statusScope, orgUnitFilters, positionFilters, roleFilters, sourceFilters]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchUsers();
    }, [fetchUsers]);

    // Отбор по источнику целиком на сервере: по загруженной странице он находил
    // бы совпадения только в ней и врал бы обо всём остальном списке.
    const filteredUsers = users;

    // Учётная запись работает, только если она и не заблокирована администратором,
    // и активна сама по себе. Отключённые в службе каталогов приходят неактивными,
    // и раньше они попадали в «Активные» — после первой же синхронизации домена
    // счётчик показывал бы работающими сотни уволенных.


    const toggleSourceFilter = (s: UserSource) => {
        setSourceFilters((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    };

    const resetFilters = () => {
        setSourceFilters([]);
        setOrgUnitFilters([]);
        setPositionFilters([]);
        setRoleFilters([]);
        setSearch("");
    };

    const blockUser = useCallback(async (user: UserResponse, reason?: string) => {
        const prev = users;
        setUsers((p) => p.map((u) => (u.id === user.id ? {...u, isBlocked: true, blockedAt: new Date().toISOString()} : u)));
        try {
            const updated = await userService.block(user.id, {reason});
            setUsers((p) => p.map((u) => (u.id === user.id ? updated : u)));
        } catch (e) {
            setUsers(prev);
            setError(e instanceof Error ? e.message : "Не удалось заблокировать пользователя");
        }
    }, [users]);

    const unblockUser = useCallback(async (user: UserResponse) => {
        const prev = users;
        setUsers((p) => p.map((u) => (u.id === user.id ? {...u, isBlocked: false, blockedAt: null} : u)));
        try {
            const updated = await userService.unblock(user.id);
            setUsers((p) => p.map((u) => (u.id === user.id ? updated : u)));
        } catch (e) {
            setUsers(prev);
            setError(e instanceof Error ? e.message : "Не удалось разблокировать пользователя");
        }
    }, [users]);

    return {
        search, setSearch,
        sortBy, setSortBy,
        statusScope, setStatusScope,
        sourceFilters, toggleSourceFilter,
        orgUnitFilters, setOrgUnitFilters,
        positionFilters, setPositionFilters,
        roleFilters, setRoleFilters,
        roles,
        resetFilters,
        users: filteredUsers,
        counts,
        page, setPage,
        total,
        pageSize: PAGE_SIZE,
        loading,
        error,
        refetch: fetchUsers,
        blockUser,
        unblockUser,
    };
}