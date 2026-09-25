import type {TFunction} from "i18next";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import type {Item} from "@/pages/ManagementPages/ManagementPage.tsx";
import {
    Bell,
    Building2,
    Eye, FileCog,
    FileStack, History,
    KeyRound, Mail,
    MessageSquareWarning, ScrollText,
    Settings2,
    ShieldCheck,
    UserCog,
    Users
} from "lucide-react";

export function getGroupsManagement(t: TFunction): { title: string; items: Item[] }[] {
    return [
        {
            // "Люди и доступ"
            title: t("management.groups.peopleAccess"),
            items: [
                {
                    path: "/management/users",
                    // "Пользователи"
                    title: t("management.items.users.title"),
                    // "Учётные записи, блокировка, подразделения"
                    hint: t("management.items.users.hint"),
                    icon: Users,
                    permission: PermissionCode.ManageUsers,
                },
                {
                    path: "/management/roles",
                    // "Доступы и роли"
                    title: t("management.items.roles.title"),
                    // "Кому что можно"
                    hint: t("management.items.roles.hint"),
                    icon: KeyRound,
                    permission: PermissionCode.ManageRoles,
                },
                {
                    path: "/management/substitutions",
                    // "Замещения"
                    title: t("management.items.substitutions.title"),
                    // "Задачи на период отсутствия"
                    hint: t("management.items.substitutions.hint"),
                    icon: UserCog,
                    permission: PermissionCode.ManageUsers,
                },
                {
                    path: "/management/hr-routing",
                    // "Маршрутизация кадровых СЗ"
                    title: t("management.items.hrRouting.title"),
                    // "Кадровик УЧР по областям: ГО и филиалы"
                    hint: t("management.items.hrRouting.hint"),
                    icon: Settings2,
                    permission: PermissionCode.ManageSystemSettings,
                },
            ],
        },
        {
            // "Справочники"
            title: t("management.groups.dictionaries"),
            items: [
                {
                    path: "/management/refs",
                    // "Справочники"
                    title: t("management.items.refs.title"),
                    // "Подразделения, должности, виды документов"
                    hint: t("management.items.refs.hint"),
                    icon: Building2,
                },
                {
                    path: "/management/refs/unit-curators",
                    // "Кураторство подразделений"
                    title: t("management.items.unitCurators.title"),
                    // "Начальник и куратор у каждого подразделения — для маршрутов кадровых СЗ"
                    hint: t("management.items.unitCurators.hint"),
                    icon: UserCog,
                    permission: PermissionCode.ManageGeneralDictionaries,
                },
                {
                    path: "/management/document-types",
                    // "Типы документов"
                    title: t("management.items.documentTypes.title"),
                    // "Свои виды документов: поля карточки и маршрут"
                    hint: t("management.items.documentTypes.hint"),
                    icon: FileStack,
                    permission: PermissionCode.ManageSystemSettings,
                },
            ],
        },
        {
            // "Подписание"
            title: t("management.groups.signing"),
            items: [
                {
                    path: "/management/signing",
                    // "Настройки подписания"
                    title: t("management.items.signingSettings.title"),
                    // "Удостоверяющие центры, метки времени"
                    hint: t("management.items.signingSettings.hint"),
                    icon: ShieldCheck,
                    permission: PermissionCode.ManageSystemSettings,
                },
            ],
        },
        {
            // "Наблюдение"
            title: t("management.groups.monitoring"),
            items: [
                {
                    path: "/management/usage",
                    // "Посещения системы"
                    title: t("management.items.usage.title"),
                    // "Кто заходит и в какие разделы"
                    hint: t("management.items.usage.hint"),
                    icon: Eye,
                    permission: PermissionCode.ViewFullStatistics,
                },
                {
                    path: "/management/feedback",
                    // "Пожелания и замечания"
                    title: t("management.items.feedback.title"),
                    // "Что пишут сотрудники с экранов"
                    hint: t("management.items.feedback.hint"),
                    icon: MessageSquareWarning,
                    permission: PermissionCode.ManageSystemSettings,
                },
                {
                    path: "/management/audit",
                    // "Журнал действий"
                    title: t("management.items.audit.title"),
                    // "След документов и решений"
                    hint: t("management.items.audit.hint"),
                    icon: ScrollText,
                    permission: PermissionCode.ManageUsers,
                },
                {
                    path: "/management/changes",
                    // "Журнал изменений настроек"
                    title: t("management.items.changes.title"),
                    // "Кто и когда правил справочники"
                    hint: t("management.items.changes.hint"),
                    icon: History,
                    permission: PermissionCode.ManageSystemSettings,
                },
            ],
        },
        {
            // "Уведомления"
            title: t("management.groups.notifications"),
            items: [
                {
                    path: "/management/notification-settings",
                    // "Настройки уведомлений"
                    title: t("management.items.notificationSettings.title"),
                    // "Утренний email-дайджест и другие личные оповещения"
                    hint: t("management.items.notificationSettings.hint"),
                    icon: Bell,
                },
                {
                    path: "/management/mailing-settings",
                    // "Настройки рассылок по актуализации ВНД"
                    title: t("management.items.mailingSettings.title"),
                    // "Ответственные сотрудники и ежемесячная сводка по СП"
                    hint: t("management.items.mailingSettings.hint"),
                    icon: Mail,
                    permission: PermissionCode.ManageVndDictionaries,
                },
            ],
        },
        {
            // "Система"
            title: t("management.groups.system"),
            items: [
                {
                    path: "/management/integrations",
                    // "Интеграции"
                    title: t("management.items.integrations.title"),
                    // "Служба каталогов, расписание синхронизации"
                    hint: t("management.items.integrations.hint"),
                    icon: Settings2,
                    permission: PermissionCode.ManageSystemSettings,
                },
                {
                    path: "/management/help",
                    // "Инструкции"
                    title: t("management.items.help.title"),
                    // "Статьи со снимками экрана"
                    hint: t("management.items.help.hint"),
                    icon: FileCog,
                    permission: PermissionCode.ManageSystemSettings,
                },
            ],
        },
    ];
}