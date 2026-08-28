import type {IconName} from "@/components/icons/Icon.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

interface NavItem {
    id: string;
    icon: IconName;
    labelKey: string;
    path?: string; // если задан - пункт становится ссылкой на реальный маршрут
    badge?: number; // Кол-во уведомлений
    permission?: number; // Код права (PermissionCode), без которого пункт скрыт
}

interface NavGroup {
    titleKey?: string;
    items: NavItem[];
}

export const navGroups: NavGroup[] = [
    { items: [{ id: "home", icon: "dash", labelKey: "sidebar.items.home", path: "/" },
            { id: "notif", icon: "bell", labelKey: "sidebar.items.notif", path: "/notifications" },
            // Отчёты всех контуров в одном месте: раньше отчётность ВНД и аналитика
            // записок лежали каждая в своём разделе, и человек, которому нужны обе,
            // ходил за ними в разные концы меню.
            { id: "analytics", icon: "rpt", labelKey: "Аналитика", path: "/analytics", permission: PermissionCode.ViewFullStatistics },
        ] },
    {
        titleKey: "sidebar.groups.normotvorchestvo",
        items: [
            {
                id: "vnd-rubric",
                labelKey: "sidebar.items.vndRubric",
                icon: "folder",
            },
            { id: "vnd", icon: "vnd", labelKey: "sidebar.items.vnd", path: "/base-vnd" },
            { id: "pln", icon: "pln", labelKey: "sidebar.items.pln", badge: 3, path: "/actualization", permission: PermissionCode.ViewVndActualizationPage },
            // Годовой план актуализации: светофор сроков, импорт из Excel, отчёт (PLN-01..07)
            { id: "pln-plan", icon: "pln", labelKey: "План актуализации", path: "/actualization/plan", permission: PermissionCode.ViewVndActualizationPage },
        ],
    },
    {
        titleKey: "Задачи",
        items: [
            // Согласования по всем контурам в одном месте, включая задачи по замещению
            { id: "inbox", icon: "check", labelKey: "Мои задачи (все контуры)", path: "/inbox" },
        ],
    },
    {
        titleKey: "sidebar.groups.sz",
        items: [
            // Реестр служебных записок: карточка, согласование, исполнение, архив, закупка
            { id: "sz", icon: "sz", labelKey: "sidebar.items.sz", path: "/sz" },
        ],
    },
    {
        titleKey: "Заседания",
        items: [
            // Журнал заседаний Правления, КПА и комитетов: повестка, протоколы, исполнение решений
            { id: "meetings", icon: "committee", labelKey: "Решения комитетов", path: "/meetings", permission: PermissionCode.ViewMeetings },
            // Очередь записок с отметкой «вынести на орган» — отбирает секретарь
            { id: "meet-candidates", icon: "check", labelKey: "Вопросы на рассмотрение", path: "/meetings/candidates", permission: PermissionCode.ViewMeetings },
            // Периодичность, которой мыслит регулятор: «не реже раза в месяц»
            { id: "obligations", icon: "clock", labelKey: "Регулярные обязательства", path: "/obligations" },
        ],
    },
    {
        titleKey: "sidebar.groups.purchases",
        items: [
            { id: "prc", icon: "prc", labelKey: "sidebar.items.prc", path: "/prc" },
            // Годовой План закупок с отчётом об исполнении (PRC-22)
            { id: "prc-plan", icon: "pln", labelKey: "План закупок", path: "/prc/plan" },
            // Матрица определяет способ закупки, состав согласования и орган утверждения
            { id: "matrix", icon: "matrix", labelKey: "sidebar.items.matrix", path: "/prc/matrix" },
            // Благонадёжность и чёрный список недобросовестных (PRC-07/17)
            { id: "prc-suppliers", icon: "flag", labelKey: "Поставщики и чёрный список", path: "/prc/suppliers" },
        ],
    },
    {
        titleKey: "Канцелярия",
        items: [
            // Книга регистрации: входящие, исходящие, запросы НБКР, обращения клиентов
            { id: "correspondence", icon: "sz", labelKey: "Корреспонденция", path: "/correspondence", permission: PermissionCode.ViewCorrespondence },
            // «Вправе ли этот человек подписать вот это сегодня»
            { id: "poa", icon: "shield", labelKey: "Доверенности", path: "/poa", permission: PermissionCode.ViewPowersOfAttorney },
        ],
    },
    {
        titleKey: "Кадровый документооборот",
        items: [
            // Ознакомление с приказами и документами: роспись сотрудника простой
            // электронной подписью (Б-19)
            // Книга приказов по личному составу — нумерация своя, «12-лс»
            { id: "hr-orders", icon: "hr", labelKey: "Приказы по личному составу", path: "/hr/orders", permission: PermissionCode.ViewHrOrders },
            { id: "hr-ack", icon: "check", labelKey: "Ознакомление", path: "/hr-ack" },
        ],
    },
    {
        titleKey: "Управление",
        items: [
            // Инструкции и рабочее место подписи нужны всем — остаются в общем меню
            { id: "help", icon: "kb", labelKey: "Как работать в системе", path: "/help" },
            { id: "signing-workplace", icon: "check", labelKey: "Рабочее место подписи", path: "/signing-workplace" },
            // Настройки, справочники, доступы и наблюдение — одним входом со своим
            // подменю: пунктов полтора десятка, в общем меню они вытесняли бы работу
            { id: "management", icon: "refs", labelKey: "Настройки системы", path: "/management" },
        ],
    }
];

   /* {
        titleKey: "sidebar.groups.sz",
        items: [
            { id: "sz", icon: "sz", labelKey: "sidebar.items.sz" },
            { id: "sz-analytics", icon: "rpt", labelKey: "sidebar.items.szAnalytics" },
            { id: "notifs", icon: "bell", labelKey: "sidebar.items.notifs", badge: 4 },
        ],
    },
    {
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
