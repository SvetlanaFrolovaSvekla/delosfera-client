import type {IconName} from "@/components/icons/Icon.tsx";

interface NavItem {
    id: string;
    icon: IconName;
    labelKey: string;
    path?: string; // если задан - пункт становится ссылкой на реальный маршрут
    badge?: number; // Кол-во уведомлений
}

interface NavGroup {
    titleKey?: string;
    items: NavItem[];
}

export const navGroups: NavGroup[] = [
    { items: [{ id: "home", icon: "dash", labelKey: "sidebar.items.home", path: "/" }] },
    {
        titleKey: "sidebar.groups.normotvorchestvo",
        items: [
            {
                id: "vnd-rubric",
                labelKey: "sidebar.items.vndRubric", // например: "Рубрикатор ВНД"
                icon: "folder",
            },
            { id: "vnd", icon: "vnd", labelKey: "sidebar.items.vnd", path: "/basevnd" },
            { id: "pln", icon: "pln", labelKey: "sidebar.items.pln", badge: 3, path: "/actualization" },
            { id: "tid", icon: "tid", labelKey: "sidebar.items.tid", badge: 4, path: "/coordination" },
            { id: "rpt", icon: "rpt", labelKey: "sidebar.items.rpt", path: "/reportvnd" },
        ],
    },
    {
        titleKey: "sidebar.groups.admin",
        items: [
            { id: "adm-users", icon: "user", labelKey: "sidebar.items.admUsers" },
            { id: "adm-roles", icon: "shield", labelKey: "sidebar.items.admRoles", path: "/roles" },
            { id: "adm-log", icon: "clock", labelKey: "sidebar.items.admLog" },
            { id: "adm-auth", icon: "lock", labelKey: "sidebar.items.admAuth" },
            { id: "refs", icon: "refs", labelKey: "sidebar.items.refs", path: "/refs" },
        ],
    },
   /* {
        titleKey: "sidebar.groups.sz",
        items: [
            { id: "sz", icon: "sz", labelKey: "sidebar.items.sz" },
            { id: "sz-analytics", icon: "rpt", labelKey: "sidebar.items.szAnalytics" },
            { id: "notifs", icon: "bell", labelKey: "sidebar.items.notifs", badge: 4 },
        ],
    },
    {
        titleKey: "sidebar.groups.purchases",
        items: [
            { id: "prc", icon: "prc", labelKey: "sidebar.items.prc" },
            { id: "matrix", icon: "matrix", labelKey: "sidebar.items.matrix" },
            { id: "prc-plan", icon: "pln", labelKey: "sidebar.items.prcPlan" },
            { id: "prc-blacklist", icon: "flag", labelKey: "sidebar.items.prcBlacklist" },
            { id: "prc-appraisers", icon: "shield", labelKey: "sidebar.items.prcAppraisers" },
        ],
    },
    {
        titleKey: "sidebar.groups.meetings",
        items: [{ id: "kom", icon: "committee", labelKey: "sidebar.items.kom" }],
    },
    {
        titleKey: "sidebar.groups.hr",
        items: [
            { id: "hr", icon: "hr", labelKey: "sidebar.items.hr" },
            { id: "hr-ack", icon: "check", labelKey: "sidebar.items.hrAck" },
        ],
    },
    {
        titleKey: "sidebar.groups.system",
        items: [
            { id: "mobile", icon: "mobile", labelKey: "sidebar.items.mobile" },
            { id: "refs", icon: "refs", labelKey: "sidebar.items.refs" },
            { id: "kb", icon: "kb", labelKey: "sidebar.items.kb" },
            { id: "future", icon: "future", labelKey: "sidebar.items.future" },
        ],
    },
    {
        titleKey: "sidebar.groups.admin",
        items: [
            { id: "org", icon: "refs", labelKey: "sidebar.items.org" },
            { id: "adm-users", icon: "user", labelKey: "sidebar.items.admUsers" },
            { id: "adm-roles", icon: "shield", labelKey: "sidebar.items.admRoles" },
            { id: "adm-sub", icon: "user", labelKey: "sidebar.items.admSub" },
            { id: "adm-log", icon: "clock", labelKey: "sidebar.items.admLog" },
            { id: "adm-auth", icon: "lock", labelKey: "sidebar.items.admAuth" },
        ],
    },*/
];

/*
export const navGroups: NavGroup[] = [

    { items: [{ id: "home", icon: "dash", label: "Рабочий стол" }] },
    {
        title: "Нормотворчество",
        items: [
            { id: "vnd", icon: "vnd", label: "База ВНД" },
            { id: "pln", icon: "pln", label: "Планирование", badge: 3 },
            { id: "tid", icon: "tid", label: "Согласование ТИД", badge: 4 },
            { id: "rpt", icon: "rpt", label: "Отчётность" },
        ],
    },
    {
        title: "Служебные записки",
        items: [
            { id: "sz", icon: "sz", label: "Реестр СЗ" },
            { id: "sz-analytics", icon: "rpt", label: "Аналитика СЗ" },
            { id: "notifs", icon: "bell", label: "Уведомления", badge: 4 },
        ],
    },
    {
        title: "Закупки",
        items: [
            { id: "prc", icon: "prc", label: "Заявки и закупки" },
            { id: "matrix", icon: "matrix", label: "Матрица полномочий" },
            { id: "prc-plan", icon: "pln", label: "Планирование закупок" },
            { id: "prc-blacklist", icon: "flag", label: "Чёрный список" },
            { id: "prc-appraisers", icon: "shield", label: "Оценщики" },
        ],
    },
    {
        title: "Заседания",
        items: [{ id: "kom", icon: "committee", label: "Решение комитетов" }],
    },
    {
        title: "Кадровый документооборот",
        items: [
            { id: "hr", icon: "hr", label: "Кадровые документы" },
            { id: "hr-ack", icon: "check", label: "Ознакомление" },
        ],
    },
    {
        title: "Система",
        items: [
            { id: "mobile", icon: "mobile", label: "Мобильная подпись" },
            { id: "refs", icon: "refs", label: "Справочники" },
            { id: "kb", icon: "kb", label: "База знаний" },
            { id: "future", icon: "future", label: "Развитие" },
        ],
    },
    {
        title: "Администрирование",
        items: [
            { id: "org", icon: "refs", label: "Оргструктура" },
            { id: "adm-users", icon: "user", label: "Пользователи" },
            { id: "adm-roles", icon: "shield", label: "Роли и права" },
            { id: "adm-sub", icon: "user", label: "Замещения" },
            { id: "adm-log", icon: "clock", label: "Журнал действий" },
            { id: "adm-auth", icon: "lock", label: "Аутентификация" },
        ],
    },
];*/
