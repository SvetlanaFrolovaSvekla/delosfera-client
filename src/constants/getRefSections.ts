// Разделы и карточки для страницы "Справочники"
import type {TFunction} from "i18next";
import {
    Ban,
    Briefcase,
    Building2,
    ClipboardList,
    FileText,
    Folder,
    Gauge,
    Landmark, type LucideIcon,
    Scale,
    ShieldCheck,
    Tag,
    Users
} from "lucide-react";

interface RefItem {
    key: string;
    code: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    path?: string;
}

interface RefSection {
    key: string;
    title: string;
    items: RefItem[];
    disabled?: boolean;
}

export const getRefSections = (t: TFunction): RefSection[] => [
    {
        key: "general",
        title: t("refSections.general.title"),
        items: [
            {
                key: "approval-body",
                code: "01",
                title: t("refSections.general.approvalBody.title"),
                subtitle: t("refSections.general.approvalBody.subtitle"),
                icon: Landmark,
                path: "/management/refs/approval-body",
            },
            {
                key: "organization-unit",
                code: "02",
                title: t("refSections.general.organizationUnit.title"),
                subtitle: t("refSections.general.organizationUnit.subtitle"),
                icon: Building2,
                path: "/management/refs/organization-unit",
            },
            {
                key: "position",
                code: "03",
                title: t("refSections.general.position.title"),
                subtitle: t("refSections.general.position.subtitle"),
                icon: Briefcase,
                path: "/management/refs/position",
            },
            {
                key: "keyword",
                code: "04",
                // Ключевые слова
                title: t("refSections.general.keyword.title"),
                // Теги для тематического поиска и классификации документов
                subtitle: t("refSections.general.keyword.subtitle"),
                icon: Tag,
                path: "/management/refs/keyword",
            },
        ],
    },
    {
        key: "vnd",
        // ВНД
        title: t("refSections.vnd.title"),
        items: [
            {
                key: "type-vnd",
                code: "01",
                // Виды ВНД
                title: t("refSections.vnd.typeVnd.title"),
                // Регламент, Порядок, Положение и другие типы документов
                subtitle: t("refSections.vnd.typeVnd.subtitle"),
                icon: FileText,
                path: "/management/refs/type-vnd",
            },
            {
                key: "security-level",
                code: "02",
                // Уровни секретности
                title: t("refSections.vnd.securityLevel.title"),
                // Открытый доступ, конфиденциально, секретно
                subtitle: t("refSections.vnd.securityLevel.subtitle"),
                icon: ShieldCheck,
                path: "/management/refs/security-level",
            },
            {
                key: "user-group",
                code: "03",
                // Группы пользователей
                title: t("refSections.vnd.userGroup.title"),
                // Группы доступа для просмотра и согласования документов
                subtitle: t("refSections.vnd.userGroup.subtitle"),
                icon: Users,
                path: "/management/refs/user-group",
            },
            {
                key: "rubric",
                code: "04",
                // Рубрикатор
                title: t("refSections.vnd.rubric.title"),
                // Тематическая классификация документов по направлениям
                subtitle: t("refSections.vnd.rubric.subtitle"),
                icon: Folder,
                path: "/management/refs/rubric",
            },
            {
                key: "coordination-users",
                code: "05",
                // Обязательные участники процесса согласования
                title: t("refSections.vnd.coordinationUsers.title"),
                // Определение обязательных участников согласования каждого ВНД
                subtitle: t("refSections.vnd.coordinationUsers.subtitle"),
                icon: FileText,
                path: "/management/refs/coordination-users",
            },
            {
                key: "actualization-thresholds",
                code: "06",
                // Пороги индикации сроков актуализации
                title: t("refSections.vnd.actualizationThresholds.title"),
                // Через сколько дней срок актуализации становится "приближается" и "критично"
                subtitle: t("refSections.vnd.actualizationThresholds.subtitle"),
                icon: Gauge,
                path: "/management/refs/actualization-thresholds",
            },
        ],
    },
    {
        key: "procurement",
        // Закупки
        title: t("refSections.procurement.title"),
        disabled: true,
        items: [
            {
                key: "counterparty-blacklist",
                code: "01",
                // Чёрный список контрагентов
                title: t("refSections.procurement.counterpartyBlacklist.title"),
                // Поставщики и подрядчики, с которыми запрещено сотрудничество
                subtitle: t("refSections.procurement.counterpartyBlacklist.subtitle"),
                icon: Ban,
                path: "/management/refs/counterparty-blacklist",
            },
            {
                key: "procurement-threshold",
                code: "02",
                // Пороги закупок
                title: t("refSections.procurement.procurementThreshold.title"),
                // Суммовые пороги, определяющие процедуру и уровень согласования
                subtitle: t("refSections.procurement.procurementThreshold.subtitle"),
                icon: Scale,
                path: "/management/refs/procurement-threshold",
            },
        ],
    },
    {
        key: "memos",
        // Служебные записки
        title: t("refSections.memos.title"),
        disabled: true,
        items: [
            {
                key: "memo-category",
                code: "01",
                // Категории СЗ
                title: t("refSections.memos.memoCategory.title"),
                // Тематические категории служебных записок
                subtitle: t("refSections.memos.memoCategory.subtitle"),
                icon: ClipboardList,
                path: "/management/refs/memo-category",
            },
        ],
    },
];