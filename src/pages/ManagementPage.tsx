import {NavLink, Outlet, useLocation} from "react-router-dom";
import {
    Building2, Eye, FileCog, FileStack, History, KeyRound,
    MessageSquareWarning, ScrollText, Settings2, ShieldCheck, UserCog, Users,
} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/**
 * Управление — всё, что настраивают, а не заполняют.
 *
 * Собрано в один раздел с собственным подменю, а не рассыпано по общему: пунктов
 * настройки полтора десятка, и в боковой панели они вытесняли бы работу, ради
 * которой в систему заходят. Настройки открывают редко, но целенаправленно —
 * им хватает одного входа.
 */

interface Item {
    path: string;
    title: string;
    hint: string;
    icon: typeof Users;
    permission?: number;
}

const GROUPS: {title: string; items: Item[]}[] = [
    {
        title: "Люди и доступ",
        items: [
            {
                path: "/management/users",
                title: "Пользователи",
                hint: "Учётные записи, блокировка, подразделения",
                icon: Users,
                permission: PermissionCode.ManageUsers,
            },
            {
                path: "/management/roles",
                title: "Доступы и роли",
                hint: "Кому что можно",
                icon: KeyRound,
                permission: PermissionCode.ManageRoles,
            },
            {
                path: "/management/substitutions",
                title: "Замещения",
                hint: "Задачи на период отсутствия",
                icon: UserCog,
                permission: PermissionCode.ManageUsers,
            },
        ],
    },
    {
        title: "Справочники",
        items: [
            {
                path: "/management/refs",
                title: "Справочники",
                hint: "Подразделения, должности, виды документов",
                icon: Building2,
            },
            {
                path: "/management/document-types",
                title: "Типы документов",
                hint: "Свои виды документов: поля карточки и маршрут",
                icon: FileStack,
                permission: PermissionCode.ManageSystemSettings,
            },
        ],
    },
    {
        title: "Подписание",
        items: [
            {
                path: "/management/signing",
                title: "Настройки подписания",
                hint: "Удостоверяющие центры, метки времени",
                icon: ShieldCheck,
                permission: PermissionCode.ManageSystemSettings,
            },
        ],
    },
    {
        title: "Наблюдение",
        items: [
            {
                path: "/management/usage",
                title: "Посещения портала",
                hint: "Кто заходит и в какие разделы",
                icon: Eye,
                permission: PermissionCode.ViewFullStatistics,
            },
            {
                path: "/management/feedback",
                title: "Пожелания и замечания",
                hint: "Что пишут сотрудники с экранов",
                icon: MessageSquareWarning,
                permission: PermissionCode.ManageSystemSettings,
            },
            {
                path: "/management/audit",
                title: "Журнал действий",
                hint: "След документов и решений",
                icon: ScrollText,
                permission: PermissionCode.ManageUsers,
            },
            {
                path: "/management/changes",
                title: "Журнал изменений",
                hint: "Кто и когда правил справочники",
                icon: History,
                permission: PermissionCode.ManageSystemSettings,
            },
        ],
    },
    {
        title: "Система",
        items: [
            {
                path: "/management/integrations",
                title: "Интеграции",
                hint: "Служба каталогов, расписание синхронизации",
                icon: Settings2,
                permission: PermissionCode.ManageSystemSettings,
            },
            {
                path: "/management/help",
                title: "Инструкции",
                hint: "Статьи со снимками экрана",
                icon: FileCog,
                permission: PermissionCode.ManageSystemSettings,
            },
        ],
    },
];

export function ManagementPage() {
    const {hasPermission} = useAuth();
    const {pathname} = useLocation();

    const groups = GROUPS
        .map((g) => ({
            ...g,
            items: g.items.filter((i) => i.permission === undefined || hasPermission(i.permission)),
        }))
        .filter((g) => g.items.length > 0);

    // Корень раздела: показываем оглавление плитками. Пустой экран рядом с
    // подменю выглядел бы поломкой, а не «выберите слева».
    const atRoot = pathname === "/management" || pathname === "/management/";

    return (
        <div className="flex gap-5 p-6">
            <nav className="w-[248px] flex-none">
                <div className="sticky top-4 flex flex-col gap-4 rounded-[14px] border
                                border-[#e1e7ef] bg-white p-3">
                    {groups.map((group) => (
                        <div key={group.title}>
                            <div className="mb-1 px-2 text-[10.5px] font-bold uppercase
                                            tracking-wider text-[#a3adbd]">
                                {group.title}
                            </div>
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({isActive}) =>
                                        `flex items-center gap-2.5 rounded-[9px] px-2.5 py-2
                                         text-[13.5px] transition
                                         ${isActive
                                            ? "bg-[#eaf0ff] font-semibold text-[#2f68f5]"
                                            : "text-[#4d5a72] hover:bg-[#f2f5f9]"}`}
                                >
                                    <item.icon size={16} className="flex-none"/>
                                    <span className="truncate">{item.title}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </div>
            </nav>

            <div className="min-w-0 flex-1">
                {atRoot ? (
                    <div className="flex flex-col gap-5">
                        <div>
                            <h1 className="text-[23px] font-bold tracking-[-0.02em]">Управление</h1>
                            <p className="mt-[7px] text-[13px] text-[#8b97ab]">
                                Настройки системы, справочники, доступы и наблюдение
                            </p>
                        </div>

                        {groups.map((group) => (
                            <section key={group.title} className="flex flex-col gap-2">
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#a3adbd]">
                                    {group.title}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {group.items.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className="flex items-start gap-3 rounded-[12px] border
                                                       border-[#e1e7ef] bg-white p-4 transition
                                                       hover:border-[#2f68f5]"
                                        >
                                            <item.icon size={18} className="mt-0.5 flex-none text-[#2f68f5]"/>
                                            <span className="min-w-0">
                                                <span className="block text-[14px] font-semibold text-[#101a2c]">
                                                    {item.title}
                                                </span>
                                                <span className="block text-[12.5px] leading-[1.5] text-[#8593a8]">
                                                    {item.hint}
                                                </span>
                                            </span>
                                        </NavLink>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <Outlet/>
                )}
            </div>
        </div>
    );
}
