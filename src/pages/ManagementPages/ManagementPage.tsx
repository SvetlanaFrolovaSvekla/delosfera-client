/**
 * Настройки системы/Управление — всё, что настраивают, а не заполняют.
 *
 * Собрано в один раздел с собственным подменю, а не рассыпано по-общему: пунктов
 * настройки полтора десятка, и в боковой панели они вытесняли бы работу, ради
 * которой в систему заходят. Настройки открывают редко, но целенаправленно —
 * им хватает одного входа.
 */
import {NavLink, Outlet, useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {getGroupsManagement} from "@/utils/management/getGroupsManagement.ts";
import {Users} from "lucide-react";

export interface Item {
    path: string;
    title: string;
    hint: string;
    icon: typeof Users;
    permission?: number;
}

export function ManagementPage() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const {pathname} = useLocation();

    const groups = getGroupsManagement(t)
        .map((g) => ({
            ...g,
            items: g.items.filter((i) => i.permission === undefined || hasPermission(i.permission)),
        }))
        .filter((g) => g.items.length > 0);

    // Корень раздела: показываем оглавление плитками
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
                                    end
                                    className={({isActive}) =>
                                        `flex items-start gap-2.5 rounded-[9px] px-2.5 py-2
                                        text-[13.5px] leading-[1.35] transition
                                        ${isActive
                                            ? "bg-[#eaf0ff] font-semibold text-[#2f68f5]"
                                            : "text-[#4d5a72] hover:bg-[#f2f5f9]"}`}
                                >
                                    <item.icon size={16} className="mt-0.5 flex-none"/>
                                    <span>{item.title}</span>
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
                            <h1 className="text-[23px] font-bold tracking-[-0.02em]">
                                {/* "Управление" */}
                                {t("management.title")}
                            </h1>
                            <p className="mt-[7px] text-[13px] text-[#8b97ab]">
                                {/* "Настройки системы, справочники, доступы и наблюдение" */}
                                {t("management.subtitle")}
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