import {useEffect, useState} from "react";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";

export type {UserLookupItem};

/**
 * Краткий список сотрудников для выбора: только идентификатор, ФИО, должность и
 * подразделение, без заблокированных.
 *
 * Отдельно от useUserOptions намеренно: тот тянет карточки целиком, и на пятистах
 * сотрудниках это полмегабайта на каждый выпадающий список. Здесь — восемь
 * килобайт, потому что выбирают человека по имени и должности, а не по карточке.
 */

let cache: UserLookupItem[] | null = null;
let inflight: Promise<UserLookupItem[]> | null = null;

/**
 * Список общий на вкладку: он одинаков для всех, кто его спрашивает, и меняется
 * не чаще, чем принимают на работу. Второй запрос за ту же сессию — лишний.
 */
async function fetchOnce(): Promise<UserLookupItem[]> {
    if (cache) return cache;

    inflight ??= userService
        .lookup()
        .then((data) => {
            cache = data;
            return data;
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
}

export function useUserLookup() {
    const [users, setUsers] = useState<UserLookupItem[]>(cache ?? []);
    const [loading, setLoading] = useState(cache === null);

    useEffect(() => {
        if (cache) return;

        let cancelled = false;

        fetchOnce()
            .then((data) => {
                if (!cancelled) setUsers(data);
            })
            .catch(() => {
                // Молча: выпадающий список останется пустым, и это видно само.
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {users, loading};
}

/** Подпись человека для списка: ФИО и то, что помогает отличить однофамильцев. */
export function userLabel(user: UserLookupItem): string {
    const detail = [user.position, user.orgUnit].filter(Boolean).join(", ");
    return detail ? `${user.fullName} — ${detail}` : user.fullName;
}
