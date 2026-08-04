import {
    Ban,
    Briefcase,
    Building2,
    ClipboardList,
    FileText,
    Folder,
    Landmark, type LucideIcon,
    Scale,
    ShieldCheck,
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
}


export const REF_SECTIONS: RefSection[] = [
    {
        key: "general",
        title: "Общее",
        items: [
            {
                key: "approval-body",
                code: "01",
                title: "Органы утверждения",
                subtitle: "Правление, Совет директоров и другие утверждающие органы",
                icon: Landmark,
                path: "/refs/approval-body",
            },
            {
                key: "organization-unit",
                code: "02",
                title: "Структурные подразделения",
                subtitle: "Оргструктура банка — управления, отделы, департаменты",
                icon: Building2,
                path: "/refs/organization-unit",
            },
            {
                key: "position",
                code: "03",
                title: "Должности",
                subtitle: "Список должностей сотрудников банка",
                icon: Briefcase,
                path: "/refs/position",
            },
        ],
    },
    {
        key: "vnd",
        title: "ВНД",
        items: [
            {
                key: "type-vnd",
                code: "01",
                title: "Виды ВНД",
                subtitle: "Регламент, Порядок, Положение и другие типы документов",
                icon: FileText,
                path: "/refs/type-vnd",
            },
            {
                key: "security-level",
                code: "02",
                title: "Уровни секретности",
                subtitle: "Открытый доступ, конфиденциально, секретно",
                icon: ShieldCheck,
                path: "/refs/security-level",
            },
            {
                key: "user-group",
                code: "03",
                title: "Группы пользователей",
                subtitle: "Группы доступа для просмотра и согласования документов",
                icon: Users,
                path: "/refs/user-group",
            },
            {
                key: "rubric",
                code: "04",
                title: "Рубрикатор",
                subtitle: "Тематическая классификация документов по направлениямя",
                icon: Folder,
                path: "/refs/rubric",
            },
            {
                key: "coordination-users",
                code: "01",
                title: "Обязательные участники процесса согласования",
                subtitle: "Определение обязательных участников согласования каждого ВНД",
                icon: FileText,
                path: "/refs/coordination-users",
            },
        ],
    },
    {
        key: "procurement",
        title: "Закупки",
        items: [
            {
                key: "counterparty-blacklist",
                code: "01",
                title: "Чёрный список контрагентов",
                subtitle: "Поставщики и подрядчики, с которыми запрещено сотрудничество",
                icon: Ban,
                path: "/refs/counterparty-blacklist",
            },
            {
                key: "procurement-threshold",
                code: "02",
                title: "Пороги закупок",
                subtitle: "Суммовые пороги, определяющие процедуру и уровень согласования",
                icon: Scale,
                path: "/refs/procurement-threshold",
            },
        ],
    },
    {
        key: "memos",
        title: "Служебные записки",
        items: [
            {
                key: "memo-category",
                code: "01",
                title: "Категории СЗ",
                subtitle: "Тематические категории служебных записок",
                icon: ClipboardList,
                path: "/refs/memo-category",
            },
        ],
    },
];