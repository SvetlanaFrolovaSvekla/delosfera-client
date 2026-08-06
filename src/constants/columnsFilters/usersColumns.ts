// Формирование колонок таблицы пользователей (реестр учётных записей)

export type UserColKey =
    | "user"
    | "email"
    | "orgUnit"
    | "roles"
    | "source"
    | "status"
    | "createdAt"
    | "lastLoginAt"
    | "actions";

export interface UserColDef {
    key: UserColKey;
    label: string;
    width: string;
    fixed?: boolean; // нельзя будет скрыть через меню "Колонки"
}

export const USER_COLUMNS: UserColDef[] = [
    {key: "user", label: "Пользователь", width: "200px", fixed: true},
    {key: "email", label: "Email / логин", width: "220px", fixed: true},
    {key: "orgUnit", label: "Стр. Подразделение", width: "minmax(180px,1fr)"},
    {key: "roles", label: "Роли", width: "180px"},
    {key: "createdAt", label: "Дата создания", width: "140px"},
    {key: "lastLoginAt", label: "Последний вход", width: "160px"},
    {key: "source", label: "Источник", width: "100px"},
    {key: "status", label: "Статус", width: "80px", fixed: true},
    {key: "actions", label: "Действия", width: "90px", fixed: true},
];

// Колонки, которые пользователь может скрывать/отображать через меню "Колонки"
export function getToggleableUserColumns(): UserColDef[] {
    return USER_COLUMNS.filter((c) => !c.fixed);
}