import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Tabs } from "@/components/componentsGeneral/Tabs";
import { userService } from "@/service/userService/userService.ts";
import type { UserActivityResponse } from "@/service/userService/userServiceType.ts";

// TODO: фото цвет, приоритет ролей цвет, главная панель с историей действий, начальник СП, куратор СП;

const ALL_TAB = "all";

function getInitials(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "—";
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ProfilePage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<string>(ALL_TAB);
    const [activity, setActivity] = useState<UserActivityResponse | null>(null);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        setActivityLoading(true);
        userService
            .getActivity(user.id)
            .then((data) => { if (!cancelled) setActivity(data); })
            .catch(() => { if (!cancelled) setActivity(null); })
            .finally(() => { if (!cancelled) setActivityLoading(false); });
        return () => { cancelled = true; };
    }, [user]);

    // все права по всем ролям пользователя, без дублей (по code)
    const allPermissions = useMemo(() => {
        if (!user) return [];
        const seen = new Map<number, string>();
        user.roles.forEach((role) =>
            role.permissions.forEach((p) => seen.set(p.code, p.description))
        );
        return Array.from(seen, ([code, label]) => ({ code, label }));
    }, [user]);

    // если роль ровно одна — табы вообще не нужны
    const hasSingleRole = (user?.roles.length ?? 0) === 1;

    // вкладки для Tabs: "Все мои полномочия" + по одной на каждую роль
    const permissionTabs = useMemo(() => {
        if (!user || hasSingleRole) return [];
        return [
            { id: ALL_TAB, label: "Все мои полномочия", n: allPermissions.length },
            ...user.roles.map((role) => ({
                id: String(role.id),
                label: role.name,
                n: role.permissions.length,
            })),
        ];
    }, [user, allPermissions, hasSingleRole]);

    // права текущей выбранной вкладки (или права единственной роли)
    const activePermissions = useMemo(() => {
        if (!user) return [];
        if (hasSingleRole) return allPermissions;
        if (activeTab === ALL_TAB) return allPermissions;
        const role = user.roles.find((r) => String(r.id) === activeTab);
        return role
            ? role.permissions.map((p) => ({ code: p.code, label: p.description }))
            : [];
    }, [user, activeTab, allPermissions, hasSingleRole]);

    if (!user) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] py-[26px] pb-[60px]">
                <div className="text-sm text-[#8b97ab]">Загрузка профиля…</div>
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto px-[30px] pt-[26px] pb-[60px] animate-[dsIn_.22s_ease]">
            {/* Шапка профиля */}
            <div className="bg-white border border-[#e9edf3] rounded-2xl px-7 py-6 mb-[18px] flex items-center gap-[22px] flex-wrap">
                <span className="w-[72px] h-[72px] flex-none rounded-[20px] bg-[var(--soft)] text-[var(--accent)] grid place-items-center font-bold text-[25px]">
                    {getInitials(user.fullName)}
                </span>
                <div className="flex-1 min-w-[220px]">
                    <h1 className="m-0 text-[23px] font-bold tracking-[-.02em]">{user.fullName}</h1>
                    <div className="mt-[9px] flex items-center gap-[10px] flex-wrap">
                        {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                                <span
                                    key={role.id}
                                    className="inline-flex items-center gap-[7px] px-[11px] py-[5px] rounded-lg bg-[#e2f4ea] text-[#1c7a4d] font-semibold text-[12.5px]"
                                >
                                    <UserIcon size={14} strokeWidth={1.9} />
                                    {role.name}
                                </span>
                            ))
                        ) : (
                            <span className="inline-flex items-center gap-[7px] px-[11px] py-[5px] rounded-lg bg-[var(--soft)] text-[var(--accent)] font-semibold text-[12.5px]">
                                <UserIcon size={14} strokeWidth={1.9} />
                                Без роли
                            </span>
                        )}
                        <span className="text-[13px] text-[#55617a]">
                            {user.position?.name ?? "Должность не указана"} · {user.orgUnit?.name ?? "Подразделение не указано"}
                        </span>
                    </div>
                </div>
                <span
                    className={`inline-flex items-center gap-[7px] h-[34px] px-[13px] rounded-[9px] text-[12.5px] font-semibold ${
                        user.isActive ? "bg-[#e2f4ea] text-[#1c7a4d]" : "bg-[#fbe3e3] text-[#a12b2b]"
                    }`}
                >
                    <span
                        className={`w-[7px] h-[7px] rounded-full ${
                            user.isActive ? "bg-[#1c7a4d]" : "bg-[#a12b2b]"
                        }`}
                    />
                    {user.isActive ? "Учётная запись активна" : "Учётная запись деактивирована"}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px] items-start">
                {/* Левая колонка - история действий */}
                <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                    <div className="px-[22px] pt-[17px] pb-[14px] border-b border-[#eef2f7]">
                        <h2 className="m-0 text-[15px] font-bold">История действий</h2>
                    </div>
                    <div className="px-[22px] pb-[18px] pt-[2px]">
                        {activityLoading ? (
                            <div className="py-7 text-center text-[#a3adbd] text-[13px]">Загрузка…</div>
                        ) : !activity || activity.recent.length === 0 ? (
                            <div className="py-7 text-center text-[#a3adbd] text-[13px]">Действий пока нет</div>
                        ) : (
                            <ul className="flex flex-col divide-y divide-[#f1f4f8]">
                                {activity.recent.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 py-[11px]">
                                        <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-[#7c86ff]" />
                                        <div className="min-w-0">
                                            <div className="text-[13px] text-[#1c2740]">
                                                {item.description}
                                                {item.vndCode && (
                                                    <span className="text-[#6b7688]"> · {item.vndCode}</span>
                                                )}
                                            </div>
                                            {item.vndTitle && (
                                                <div className="truncate text-[12px] text-[#8b97ab]">{item.vndTitle}</div>
                                            )}
                                            <div className="text-[11px] text-[#a3adbd]">{formatDateTime(item.timestamp)}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Правая колонка */}
                <div className="flex flex-col gap-4">
                    {/* Учётная запись */}
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                        <h3 className="m-0 mb-[13px] text-[13.5px] font-bold">Учётная запись</h3>
                        <div className="flex flex-col gap-[11px]">
                            <Row label="Логин" value={user.email} />
                            <Row label="Должность" value={user.position?.name ?? "—"} />
                            <Row label="Структурная единица" value={user.orgUnit?.name ?? "—"} />
                            <div className="pt-[10px] border-t border-[#f3f6f9]">
                                <Row label="Последний вход" value={formatDateTime(user.lastLoginAt)} />
                            </div>
                            <Row label="В системе с" value={formatDateTime(user.createdAt)} />
                        </div>
                    </div>

                    {/* Электронная подпись - данных пока нет */}
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                        <div className="flex items-center gap-[9px] mb-[13px]">
                            <span className="w-[30px] h-[30px] flex-none rounded-lg bg-[var(--soft)] text-[var(--accent)] grid place-items-center">
                                <KeyRound size={17} strokeWidth={1.8} />
                            </span>
                            <h3 className="m-0 text-[13.5px] font-bold">Электронная подпись</h3>
                        </div>
                        <p className="m-0 text-[12.5px] text-[#55617a] leading-[1.55]">
                            Недоступно
                        </p>
                    </div>

                    {/* Полномочия */}
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                        {hasSingleRole ? (
                            <h3 className="m-0 mb-3 text-[13.5px] font-bold">
                                Полномочия моей моей роли «{user.roles[0].name}»:
                            </h3>
                        ) : (
                            <>
                                <h3 className="m-0 text-[13.5px] font-bold">Полномочия</h3>
                                <div className="overflow-x-auto -mx-1 px-1 mb-4">
                                    <Tabs tabs={permissionTabs} value={activeTab} onChange={setActiveTab} />
                                </div>
                            </>
                        )}

                        <div className="flex flex-wrap gap-[7px]">
                            {activePermissions.map((p) => (
                                <span
                                    key={p.code}
                                    className="inline-flex items-center gap-[6px] text-[11.5px] font-semibold text-[#3a4560] bg-[#f2f5f9] px-[10px] py-[5px] rounded-lg"
                                >
                                    <Check size={12} strokeWidth={2.4} className="text-[#1c7a4d]" />
                                    {p.label}
                                </span>
                            ))}
                            {activePermissions.length === 0 && (
                                <span className="text-[12px] text-[#a3adbd]">Прав не назначено</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-[#8b97ab]">{label}</span>
            <span
                className={`text-[12.5px] font-semibold text-[#1c2740] text-right ml-auto ${
                    mono ? "font-mono" : ""
                }`}
            >
                {value}
            </span>
        </div>
    );
}