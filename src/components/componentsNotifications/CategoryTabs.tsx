import clsx from "clsx";
import React from "react";
import type {NotificationCategoryOption} from "@/service/notificationsService/notificationsServiceType";
import type {ActiveTab} from "@/hooks/notificationsHooks/useNotifications.ts";
import {Star, Bell, FileText, Shield, ListChecks, MoreHorizontal, Users} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    System: <Bell className="h-3.5 w-3.5"/>,
    Vnd: <FileText className="h-3.5 w-3.5"/>,
    Approval: <Shield className="h-3.5 w-3.5"/>,
    Task: <ListChecks className="h-3.5 w-3.5"/>,
    Hr: <Users className="h-3.5 w-3.5"/>,
    Other: <MoreHorizontal className="h-3.5 w-3.5"/>,
};

interface CategoryTabsProps {
    categories: NotificationCategoryOption[];
    active: ActiveTab;
    onChange: (tab: ActiveTab) => void;
    getBadge: (tab: ActiveTab) => number | undefined;
}

export function CategoryTabs({categories, active, onChange, getBadge}: CategoryTabsProps) {
    const tabs: { id: ActiveTab; label: string; icon?: React.ReactNode }[] = [
        {id: "all", label: "Все"},
        {id: "unread", label: "Непрочитанные"},
        {id: "favorites", label: "Избранное", icon: <Star className="h-3.5 w-3.5"/>},
        ...categories.map(c => ({
            id: c.key as ActiveTab,
            label: c.name,
            icon: CATEGORY_ICONS[c.key],
        })),
    ];

    return (
        <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map(tab => {
                const isActive = tab.id === active;
                const badge = getBadge(tab.id);
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={clsx(
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                            isActive
                                ? "border-[#d4d6f8] bg-[#ececfc] text-[#4e57d6]"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {!!badge && (
                            <span
                                className={clsx(
                                    "rounded-full px-1.5 py-0.5 font-mono text-[10.5px]",
                                    isActive ? "bg-white text-[#4e57d6]" : "bg-rose-100 text-rose-600"
                                )}
                            >
                {badge}
              </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}