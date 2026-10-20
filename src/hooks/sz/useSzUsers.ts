// Справочник пользователей для карточки СЗ: словарь id -> ФИО и список для выбора человека.
import {useEffect, useState} from "react";
import {userService} from "@/service/userService/userService.ts";
import type {PickableUser} from "@/constants/pickableUser.ts";

export function useSzUsers() {
    const [users, setUsers] = useState<Record<number, string>>({});
    const [userList, setUserList] = useState<PickableUser[]>([]);

    useEffect(() => {
        userService.lookup()
            .then((list) => {
                setUsers(Object.fromEntries(list.map((u) => [u.id, u.fullName])));
                setUserList(list.map((u) => ({
                    id: u.id, fullName: u.fullName,
                    position: u.position ?? null, orgUnit: u.orgUnit ?? null,
                    orgUnitId: u.orgUnitId ?? null,
                    isBoardMember: u.isBoardMember ?? false,
                    isUnitHead: u.isUnitHead ?? false,
                })));
            })
            .catch(() => {});
    }, []);

    return {users, userList};
}
