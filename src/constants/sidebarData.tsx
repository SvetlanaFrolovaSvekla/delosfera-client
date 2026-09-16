import type {IconName} from "@/assets/icons/Icon.tsx";
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
            // Согласования по всем контурам в одном месте, включая задачи по замещению
            { id: "inbox", icon: "tasks", labelKey: "Мои задачи", path: "/tasks" },
            // Персональный дайджест (УВ-14) и календарь сроков (ЗС-13)
            { id: "digest", icon: "rpt", labelKey: "Дайджест", path: "/digest" },
            { id: "calendar", icon: "clock", labelKey: "Календарь сроков", path: "/calendar" },
            { id: "notif", icon: "bell", labelKey: "sidebar.items.notif", path: "/notifications" },
            // Настройки уведомлений переехали в "Настройки системы" → "Уведомления",
            // рядом с настройками рассылок по актуализации ВНД.
            // Отчёты всех контуров в одном месте: раньше отчётность ВНД и аналитика
            // записок лежали каждая в своём разделе, и человек, которому нужны обе,
            // ходил за ними в разные концы меню.
            { id: "analytics", icon: "rpt", labelKey: "Аналитика", path: "/analytics", permission: PermissionCode.ViewFullStatistics },
            // Раньше жила внутри "Нормотворчество" под именем "vnd-rubric" и открывала
            // только Рубрикатор ВНД. Теперь общая для всех контуров: сама модалка даёт
            // выбор "Рубрикатор ВНД" / "Рубрикатор СЗ" — см. Sidebar.tsx.
            {
                id: "rubric",
                labelKey: "sidebar.items.rubric",
                icon: "folder",
            },
        ] },
    {
        titleKey: "sidebar.groups.normotvorchestvo",
        items: [
            { id: "vnd", icon: "vnd", labelKey: "sidebar.items.vnd", path: "/base-vnd" },
            { id: "pln", icon: "pln", labelKey: "sidebar.items.pln", badge: 3, path: "/actualization", permission: PermissionCode.ViewVndActualizationPage },
          /*  // Годовой план актуализации: светофор сроков, импорт из Excel, отчёт (PLN-01..07)
            { id: "pln-plan", icon: "pln", labelKey: "План актуализации", path: "/actualization/plan", permission: PermissionCode.ViewVndActualizationPage },*/
        ],
    },
    {
        titleKey: "sidebar.groups.sz",
        items: [
            // Реестр служебных записок: карточка, согласование, исполнение, архив, закупка
            { id: "sz", icon: "sz", labelKey: "sidebar.items.sz", path: "/sz" },
            // Доска записок по стадиям (РС-4)
            { id: "sz-tracker", icon: "sz", labelKey: "Доска записок", path: "/sz/tracker" },
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
            // Доска обязательств по стадиям (ПР-1)
            { id: "obligations-board", icon: "clock", labelKey: "Доска обязательств", path: "/obligations/board" },
        ],
    },
    {
        titleKey: "sidebar.groups.purchases",
        items: [
            { id: "prc", icon: "prc", labelKey: "sidebar.items.prc", path: "/prc" },
            // Доска закупок по стадиям (ЗК-11): где какая заявка и что зависло
            { id: "prc-tracker", icon: "prc", labelKey: "Доска закупок", path: "/prc/tracker" },
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
