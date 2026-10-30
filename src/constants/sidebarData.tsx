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
            { id: "inbox", icon: "tasks", labelKey: "sidebar.items.tasks", path: "/tasks" },
            // Персональный дайджест (УВ-14) и календарь сроков (ЗС-13)
            { id: "digest", icon: "rpt", labelKey: "sidebar.items.digest", path: "/digest" },
            { id: "calendar", icon: "clock", labelKey: "sidebar.items.calendar", path: "/calendar" },
            { id: "notif", icon: "bell", labelKey: "sidebar.items.notif", path: "/notifications" },
            // Настройки уведомлений переехали в "Настройки системы" → "Уведомления",
            // рядом с настройками рассылок по актуализации ВНД.
            // Отчёты всех контуров в одном месте: раньше отчётность ВНД и аналитика
            // записок лежали каждая в своём разделе, и человек, которому нужны обе,
            // ходил за ними в разные концы меню.
            { id: "analytics", icon: "chart", labelKey: "sidebar.items.analytics", path: "/analytics", permission: PermissionCode.ViewFullStatistics },
            // Лента событий по всем контурам с поиском и фильтрами (раньше открывалась только
            // кнопкой "Смотреть всю активность" из виджета на рабочем столе)
            { id: "activity", icon: "activity", labelKey: "sidebar.items.activity", path: "/activity" },
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
            // Доска ВНД: документы, связанные с СП пользователя (+ добавленные вручную), по статусам
            { id: "vnd-board", icon: "board", labelKey: "sidebar.items.vndBoard", path: "/vnd-board", permission: PermissionCode.ViewVnd },
            { id: "pln", icon: "pln", labelKey: "sidebar.items.pln", badge: 3, path: "/actualization", permission: PermissionCode.ViewVndActualizationPage },
            // Предложения сотрудников по ВНД — получает главный редактор ВНД (бейдж — непрочитанные)
            { id: "vnd-proposals", icon: "idea", labelKey: "sidebar.items.vndProposals", path: "/vnd-proposals", permission: PermissionCode.ManageVndProposals },
            // Проверка подлинности согласования: загрузить файл редакции → кто и когда подписал ЭЦП этот текст
            { id: "vnd-authenticity", icon: "shield", labelKey: "sidebar.items.vndAuthenticity", path: "/vnd-authenticity", permission: PermissionCode.ViewVnd },
          /*  // Годовой план актуализации: светофор сроков, импорт из Excel, отчёт (PLN-01..07)
            { id: "pln-plan", icon: "pln", labelKey: "План актуализации", path: "/actualization/plan", permission: PermissionCode.ViewVndActualizationPage },*/
        ],
    },
    {
        titleKey: "sidebar.groups.sz",
        items: [
            // Реестр служебных записок: карточка, согласование, исполнение, архив, закупка
            { id: "sz", icon: "sz", labelKey: "sidebar.items.sz", path: "/sz" },
            // Доска записок по стадиям
            { id: "sz-tracker", icon: "board", labelKey: "sidebar.items.szTracker", path: "/sz/tracker" },
            // Заявки на замещение (КСЗ-В9)
            { id: "substitutions", icon: "user", labelKey: "sidebar.items.substitution", path: "/substitutions"},
        ],
    },
    {
        titleKey: "sidebar.groups.statements",
        items: [
            // Реестр заявлений
            { id: "statements", icon: "sz", labelKey: "sidebar.items.statements", path: "/base-statements" },
        ],
    },
    {
        titleKey: "sidebar.groups.meetings",
        items: [
            // Журнал заседаний Правления, КПА и комитетов: повестка, протоколы, исполнение решений
            { id: "meetings", icon: "committee", labelKey: "sidebar.items.meetings", path: "/meetings", permission: PermissionCode.ViewMeetings },
            // Очередь записок с отметкой «вынести на орган» — отбирает секретарь
            { id: "meet-candidates", icon: "check", labelKey: "sidebar.items.meetCandidates", path: "/meetings/candidates", permission: PermissionCode.ViewMeetings },
            // Периодичность, которой мыслит регулятор: «не реже раза в месяц»
            { id: "obligations", icon: "clock", labelKey: "sidebar.items.obligations", path: "/obligations" },
            // Доска обязательств по стадиям (ПР-1)
            { id: "obligations-board", icon: "board", labelKey: "sidebar.items.obligationsBoard", path: "/obligations/board" },
            // События операционного риска из componentsWorkflow (RISK-1, 716-П / НБКР)
            { id: "risk-events", icon: "shield", labelKey: "События оп-риска", path: "/risk-events", permission: PermissionCode.ViewRiskEvents },
        ],
    },
    {
        titleKey: "sidebar.groups.purchases",
        items: [
            { id: "prc", icon: "prc", labelKey: "sidebar.items.prc", path: "/prc" },
            // Доска закупок по стадиям (ЗК-11): где какая заявка и что зависло
            { id: "prc-tracker", icon: "board", labelKey: "sidebar.items.prcTracker", path: "/prc/tracker" },
            // Годовой План закупок с отчётом об исполнении (PRC-22)
            { id: "prc-plan", icon: "pln", labelKey: "sidebar.items.prcAnnualPlan", path: "/prc/plan" },
            // Матрица определяет способ закупки, состав согласования и орган утверждения
            { id: "matrix", icon: "authmatrix", labelKey: "sidebar.items.matrix", path: "/prc/matrix" },
            // Благонадёжность и чёрный список недобросовестных (PRC-07/17)
            { id: "prc-suppliers", icon: "flag", labelKey: "sidebar.items.prcSuppliers", path: "/prc/suppliers" },
        ],
    },
    {
        titleKey: "sidebar.groups.office",
        items: [
            // Книга регистрации: входящие, исходящие, запросы НБКР, обращения клиентов
            { id: "componentsCorrespondence", icon: "sz", labelKey: "sidebar.items.correspondence", path: "/correspondence", permission: PermissionCode.ViewCorrespondence },
            // «Вправе ли этот человек подписать вот это сегодня»
            { id: "poa", icon: "shield", labelKey: "sidebar.items.poa", path: "/poa", permission: PermissionCode.ViewPowersOfAttorney },
        ],
    },
    {
        titleKey: "sidebar.groups.hr",
        items: [
            // Ознакомление с приказами и документами: роспись сотрудника простой
            // электронной подписью (Б-19)
            // Книга приказов по личному составу — нумерация своя, «12-лс»
            { id: "hr-orders", icon: "hr", labelKey: "sidebar.items.hrOrders", path: "/hr/orders", permission: PermissionCode.ViewHrOrders },
            { id: "hr-ack", icon: "check", labelKey: "sidebar.items.hrAck", path: "/hr-ack" },
        ],
    },
    {
        titleKey: "sidebar.groups.management",
        items: [
            // Инструкции и рабочее место подписи нужны всем — остаются в общем меню
            { id: "help", icon: "help", labelKey: "sidebar.items.help", path: "/help" },
            { id: "signing-workplace", icon: "check", labelKey: "sidebar.items.signingWorkplace", path: "/signing-workplace" },
            // Настройки, справочники, доступы и наблюдение — одним входом со своим
            // подменю: пунктов полтора десятка, в общем меню они вытесняли бы работу
            { id: "management", icon: "refs", labelKey: "sidebar.items.management", path: "/management" },
        ],
    }
];
