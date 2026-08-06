import {useCallback, useEffect, useMemo, useState} from "react";
import type {RoleResponse, UserResponse, UserSortBy, UserSource} from "@/service/userService/userServiceType.ts";
import {roleService} from "@/service/userService/roleService.ts";
import {userService} from "@/service/userService/userService.ts";

export type UserStatusScope = "all" | "active" | "blocked";

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
            const data = await userService.getAll({
                sortBy,
                search: debouncedSearch || undefined,
                orgUnitIds: orgUnitFilters.length ? orgUnitFilters.map(Number) : undefined,
                positionIds: positionFilters.length ? positionFilters.map(Number) : undefined,
                roleIds: roleFilters.length ? roleFilters.map(Number) : undefined,
                source: sourceFilters.length === 1 ? sourceFilters[0] : undefined,
                isBlocked: statusScope === "all" ? undefined : statusScope === "blocked",
            });
            setUsers(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось загрузить пользователей");
        } finally {
            setLoading(false);
        }
    }, [sortBy, debouncedSearch, orgUnitFilters, positionFilters, roleFilters, sourceFilters, statusScope]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchUsers();
    }, [fetchUsers]);

    // источник фильтруем на клиенте, если выбрано и Local, и Ldap одновременно
    const filteredUsers = useMemo(() => {
        if (sourceFilters.length < 2) return users;
        return users.filter((u) => sourceFilters.includes(u.source));
    }, [users, sourceFilters]);

    const counts = useMemo(
        () => ({
            all: users.length,
            active: users.filter((u) => !u.isBlocked).length,
            blocked: users.filter((u) => u.isBlocked).length,
        }),
        [users]
    );

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
        loading,
        error,
        refetch: fetchUsers,
        blockUser,
        unblockUser,
    };
}