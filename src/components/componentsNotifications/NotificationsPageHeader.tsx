import {Check} from "lucide-react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";

interface NotificationsPageHeaderProps {
    unreadCount: number;
    onMarkAllRead: () => void;
    markAllDisabled: boolean;
    search: string;
    onSearchChange: (value: string) => void;
}

export function NotificationsPageHeader({
                                            unreadCount,
                                            onMarkAllRead,
                                            markAllDisabled,
                                            search,
                                            onSearchChange,
                                        }: NotificationsPageHeaderProps) {
    return (
        <div className="mb-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-slate-900">
                        Мои уведомления
                    </h1>
                    <p className="mt-1 text-[13px] text-slate-500">
                        Непрочитанных: <b className="text-[#4e57d6]">{unreadCount}</b>
                    </p>
                </div>

                <button
                    onClick={onMarkAllRead}
                    disabled={markAllDisabled}
                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Check className="h-4 w-4"/>
                    Прочитать все
                </button>
            </div>

            <SearchBar
                className="mt-4"
                placeholder="Поиск по уведомлениям…"
                value={search}
                onChange={onSearchChange}
                variant="white"
            />
        </div>
    );
}