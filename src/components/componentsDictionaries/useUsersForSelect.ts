// Список пользователей банка - для мультиселекта в формах (группы пользователей и т.п.)
import {useEffect, useState} from "react";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";

export function useUsersForSelect() {
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        userService.getAll({sortBy: "NameAsc"})
            .then((res) => {
                if (!cancelled) setUsers(res);
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

    return {users, loading, error};
}