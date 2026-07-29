export interface NotificationItem {
    id: number;
    textKey: string;
    timeKey: string;
    dot: string;
}

export interface RoleItem {
    id: string;
    abbr: string;
    name: string;
    deptKey: string;
    active: boolean;
}

export const notifs: NotificationItem[] = [
    { id: 1, textKey: "notifications.n1", timeKey: "notificationsTime.n1", dot: "#1c7a4d" },
    { id: 2, textKey: "notifications.n2", timeKey: "notificationsTime.n2", dot: "#b3730a" },
    { id: 3, textKey: "notifications.n3", timeKey: "notificationsTime.n3", dot: "#2f68f5" },
];

export const roleList: RoleItem[] = [
    { id: "methodist", abbr: "ОМ", name: "Бермет Токтосунова", deptKey: "roles.methodist", active: true },
    { id: "initiator", abbr: "ИН", name: "А. Пупурик", deptKey: "roles.initiator", active: false },
    { id: "clerk", abbr: "ДЛ", name: "Делопроизводитель", deptKey: "roles.clerk", active: false },
];