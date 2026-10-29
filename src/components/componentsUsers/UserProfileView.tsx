// Личный профиль пользователя
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs";
import {Check, KeyRound, Lock, Pencil, Search, ShieldPlus, User as UserIcon, UserRound, X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {EcpCredentialCard} from "@/components/componentsUsers/EcpCredentialCard.tsx";
import {UserActivityHistory} from "@/components/componentsUsers/UserActivityHistory.tsx";
import {AccessRequestModal} from "@/components/componentsUsers/AccessRequestModal.tsx";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

const ALL_TAB = "all";

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

interface UserProfileViewProps {
    user: UserResponse;
    /** Профиль принадлежит текущему авторизованному пользователю — меняет формулировки
     * («мои полномочия» и т.п.). Для чужого профиля (просмотр коллеги) — false. */
    isOwnProfile: boolean;
}

/**
 * Карточка профиля: шапка, история действий, учётная запись, полномочия.
 *
 * Используется и для «Моего профиля» (ProfilePage, данные из useAuth), и для просмотра
 * профиля другого сотрудника (UserProfileViewPage, данные по id из userService.getById) —
 * это тот же самый read-only вид, отличаются только формулировки и источник данных.
 */
export function UserProfileView({user, isOwnProfile}: UserProfileViewProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    // Правка учётной записи (Управление → Пользователи → карточка) - только с правом
    // ManageUsers, как и на сервере (PUT /users/{id}).
    const {hasPermission} = useAuth();
    const canEditUser = hasPermission(PermissionCode.ManageUsers);
    const [activeTab, setActiveTab] = useState<string>(ALL_TAB);
    // Поиск по полномочиям (в пределах выбранной вкладки)
    const [permissionSearch, setPermissionSearch] = useState("");
    const permissionTerms = useMemo(() => splitSearchTerms(permissionSearch), [permissionSearch]);
    const [accessRequestOpen, setAccessRequestOpen] = useState(false);
    // Сброс скролла при открытии профиля: страница открывается внутри общего
    // скроллящегося контейнера (main > div.overflow-y-auto в App.tsx), а не окна
    // браузера, поэтому без явного сброса остаётся там, где был скролл на предыдущей странице.
    // Срабатывает и при переходе с одного профиля сразу на другой (id меняется без размонтирования).
    useEffect(() => {
        document.getElementById("main-scroll-container")?.scrollTo({top: 0, left: 0});
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(ALL_TAB);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPermissionSearch("");
    }, [user.id]);

    const closeAccessRequest = useCallback(() => setAccessRequestOpen(false), []);

    // все права по всем ролям пользователя, без дублей (по code)
    const allPermissions = useMemo(() => {
        const seen = new Map<number, string>();
        user.roles.forEach((role) =>
            role.permissions.forEach((p) => seen.set(p.code, p.description))
        );
        return Array.from(seen, ([code, label]) => ({code, label}));
    }, [user]);

    // если роль ровно одна — табы вообще не нужны
    const hasSingleRole = user.roles.length === 1;

    // вкладки для Tabs: "Все полномочия" + по одной на каждую роль
    const permissionTabs = useMemo(() => {
        if (hasSingleRole) return [];
        return [
            {
                id: ALL_TAB,
                // label: isOwnProfile ? "Все мои полномочия" : "Все полномочия",
                label: isOwnProfile ? t("userProfile.allMyPermissions") : t("userProfile.allPermissions"),
                n: allPermissions.length,
            },
            ...user.roles.map((role) => ({
                id: String(role.id),
                label: role.name,
                n: role.permissions.length,
            })),
        ];
    }, [user, allPermissions, hasSingleRole, isOwnProfile, t]);

    // права текущей выбранной вкладки (или права единственной роли)
    const activePermissions = useMemo(() => {
        if (hasSingleRole) return allPermissions;
        if (activeTab === ALL_TAB) return allPermissions;
        const role = user.roles.find((r) => String(r.id) === activeTab);
        return role
            ? role.permissions.map((p) => ({code: p.code, label: p.description}))
            : [];
    }, [user, activeTab, allPermissions, hasSingleRole]);

    // Полномочия вкладки, где есть ВСЕ слова запроса
    const visiblePermissions = useMemo(() => {
        if (permissionTerms.length === 0) return activePermissions;
        return activePermissions.filter((p) => {
            const label = p.label.toLowerCase();
            return permissionTerms.every((term) => label.includes(term));
        });
    }, [activePermissions, permissionTerms]);

    return (
        <div className="animate-[dsIn_.22s_ease]">
            <AccessRequestModal open={accessRequestOpen} onClose={closeAccessRequest}/>
            {/* Шапка профиля */}
            <div
                className="bg-white border border-[#e9edf3] rounded-2xl px-7 py-6 mb-[18px] flex items-center gap-[22px] flex-wrap">
                {/* Цветной кружок с инициалами (цвет зависит от имени, см. Avatar) */}
                <Avatar name={user.fullName} size={72} muted={!user.isActive}/>
                <div className="flex-1 min-w-[220px]">
                    <h1 className="m-0 text-[23px] font-bold tracking-[-.02em]">{user.fullName}</h1>
                    <div className="mt-[9px] flex items-center gap-[10px] flex-wrap">
                        {/* Роли: */}
                        <span className="text-[12.5px] font-semibold text-[#8b97ab]">{t("userProfile.rolesLabel")}</span>
                        {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                                <span
                                    key={role.id}
                                    className="inline-flex items-center gap-[7px] px-[11px] py-[5px] rounded-lg bg-[#ececfc] text-[#4e57d6] font-semibold text-[12.5px]"
                                >
                                    <UserIcon size={14} strokeWidth={1.9}/>
                                    {role.name}
                                </span>
                            ))
                        ) : (
                            <span
                                className="inline-flex items-center gap-[7px] px-[11px] py-[5px] rounded-lg bg-[var(--soft)] text-[var(--accent)] font-semibold text-[12.5px]">
                                <UserIcon size={14} strokeWidth={1.9}/>
                                {/* Без роли */}
                                {t("userProfile.noRole")}
                            </span>
                        )}
                        <span className="text-[13px] text-[#55617a]">
                            {/* {user.position?.name ?? "Должность не указана"} · {user.orgUnit?.name ?? "Подразделение не указано"} */}
                            {user.position?.name ?? t("userProfile.positionNotSpecified")} ·{" "}
                            {user.orgUnit?.name ?? t("userProfile.orgUnitNotSpecified")}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
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
                        {/* {user.isActive ? "Учётная запись активна" : "Учётная запись деактивирована"} */}
                        {user.isActive ? t("userProfile.accountActive") : t("userProfile.accountDeactivated")}
                    </span>

                    {canEditUser && (
                        <button
                            type="button"
                            onClick={() => navigate(`/management/users/${user.id}`)}
                            className="inline-flex items-center gap-[7px] h-[34px] px-[13px] rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#ececfc]"
                        >
                            <Pencil size={14} strokeWidth={2}/>
                            {/* Редактировать */}
                            {t("userProfile.editButton")}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px]">
                {/* Левая колонка - история действий */}
                <div className="relative lg:min-h-[560px]">
                    {/* key: другой профиль — свежие фильтры и лента */}
                    <UserActivityHistory key={user.id} userId={user.id}/>
                </div>

                {/* Правая колонка */}
                <div className="flex flex-col gap-4">
                    {/* Учётная запись */}
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                        <div className="flex items-center gap-[9px] mb-[13px]">
                            <span
                                className="w-[30px] h-[30px] flex-none rounded-lg bg-[var(--soft)] text-[var(--accent)] grid place-items-center">
                                <UserRound size={17} strokeWidth={1.8}/>
                            </span>
                            {/* Учётная запись */}
                            <h3 className="m-0 text-[13.5px] font-bold">{t("userProfile.accountSectionTitle")}</h3>
                        </div>
                        <div className="flex flex-col gap-[11px]">
                            {/* <Row label="Логин" value={user.email} /> */}
                            <Row label={t("userProfile.login")} value={user.email}/>
                            {/* <Row label="Должность" value={user.position?.name ?? "—"} /> */}
                            <Row label={t("userProfile.position")}
                                 value={user.position?.name ?? t("userProfile.dash")}/>
                            {/* <Row label="Структурная единица" value={user.orgUnit?.name ?? "—"} /> */}
                            <Row label={t("userProfile.orgUnit")} value={user.orgUnit?.name ?? t("userProfile.dash")}/>
                            <div className="pt-[10px] border-t border-[#f3f6f9]">
                                {/* <Row label="Последний вход" value={formatDateTime(user.lastLoginAt)} /> */}
                                <Row label={t("userProfile.lastLogin")} value={formatDateTime(user.lastLoginAt)}/>
                            </div>
                            {/* <Row label="В системе с" value={formatDateTime(user.createdAt)} /> */}
                            <Row label={t("userProfile.memberSince")} value={formatDateTime(user.createdAt)}/>
                        </div>
                    </div>

                    {/* Электронная подпись: в своём профиле - идентификация в ГП «Инфоком»
                        (ПИН + код из СМС один раз), в чужом - данных нет, показываем заглушку */}
                    {isOwnProfile ? (
                        <EcpCredentialCard/>
                    ) : (
                        <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                            <div className="flex items-center gap-[9px] mb-[13px]">
                                <span
                                    className="w-[30px] h-[30px] flex-none rounded-lg bg-[var(--soft)] text-[var(--accent)] grid place-items-center">
                                    <KeyRound size={17} strokeWidth={1.8}/>
                                </span>
                                {/* <h3 className="m-0 text-[13.5px] font-bold">Электронная подпись</h3> */}
                                <h3 className="m-0 text-[13.5px] font-bold">{t("userProfile.signatureTitle")}</h3>
                            </div>
                            {/* Чужой профиль: подпись сотрудника видит только он сам */}
                            <div className="flex items-start gap-2.5 rounded-[10px] border border-[#e5e9f0] bg-[#f6f8fb] px-3 py-2.5">
                                <span className="mt-[1px] w-[26px] h-[26px] flex-none rounded-full bg-white border border-[#e5e9f0] text-[#8b97ab] grid place-items-center">
                                    <Lock size={13} strokeWidth={2}/>
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[12.5px] font-semibold text-[#26324a]">
                                        {/* Это профиль другого сотрудника */}
                                        {t("userProfile.signatureForeignTitle")}
                                    </div>
                                    <div className="mt-0.5 text-[12px] text-[#6b7891] leading-[1.5]">
                                        {/* У вас нет права просматривать чужую электронную подпись */}
                                        {t("userProfile.signatureForeignText")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Полномочия */}
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="m-0 text-[13.5px] font-bold">
                                {hasSingleRole ? (
                                    <>
                                        {/* {isOwnProfile ? "Полномочия моей роли" : "Полномочия роли"} «{user.roles[0].name}»: */}
                                        {isOwnProfile ? t("userProfile.permissionsOfMyRole") : t("userProfile.permissionsOfRole")}{" "}
                                        «{user.roles[0].name}»:
                                    </>
                                ) : (
                                    // Полномочия
                                    t("userProfile.permissionsTitle")
                                )}
                            </h3>
                            {/* Запросить себе права - заявка уходит в «Пожелания и замечания» */}
                            {isOwnProfile && (
                                <Tooltip content={t("userProfile.accessRequest.buttonTitle")} side="top">

                                <button
                                    type="button"
                                    onClick={() => setAccessRequestOpen(true)}
                                    className="flex-none inline-flex items-center gap-[5px] h-[26px] px-[9px] rounded-[7px] border border-[#e5e9f0] bg-white text-[11.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#ececfc] hover:border-[#4e57d6]/40"
                                >
                                    <ShieldPlus size={13} strokeWidth={2}/>
                                    {/* Запросить права */}
                                    {t("userProfile.accessRequest.button")}
                                </button>
                                </Tooltip>

                            )}
                        </div>

                        {!hasSingleRole && (
                            <div className="overflow-x-auto px-1">
                                <Tabs tabs={permissionTabs} value={activeTab} onChange={setActiveTab}/>
                            </div>
                        )}

                        {/* Поиск по полномочиям */}
                        {activePermissions.length > 0 && (
                            <div className="relative mb-3">
                                <Search size={14}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a3adbd]"/>
                                <input
                                    type="text"
                                    value={permissionSearch}
                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                    placeholder={t("userProfile.permissionsSearchPlaceholder")}
                                    aria-label={t("userProfile.permissionsSearchPlaceholder")}
                                    className="h-[34px] w-full box-border rounded-[8px] border border-[#e5e9f0] bg-white  pl-8 pr-8 text-[12.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] focus:bg-white"
                                />
                                {permissionSearch !== "" && (
                                    <button type="button" onClick={() => setPermissionSearch("")}
                                            aria-label={t("userProfile.activitySearchClear")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer grid h-5 w-5 place-items-center rounded-full text-[#a3adbd] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                                        <X size={13}/>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Список полномочий может быть очень длинным - ограничиваем высоту, дальше скролл */}
                        <div className="flex flex-wrap gap-[7px] max-h-[600px] overflow-y-auto pr-1">
                            {visiblePermissions.map((p) => (
                                <span
                                    key={p.code}
                                    className="inline-flex items-center gap-[6px] text-[11.5px] font-semibold text-[#3a4560] bg-[#f2f5f9] px-[10px] py-[5px] rounded-lg"
                                >
                                    <Check size={12} strokeWidth={2.4} className="text-[#1c7a4d]"/>
                                    <HighlightSubstrings text={p.label} terms={permissionTerms}/>
                                </span>
                            ))}
                            {activePermissions.length === 0 ? (
                                // <span className="text-[12px] text-[#a3adbd]">Прав не назначено</span>
                                <span
                                    className="text-[12px] text-[#a3adbd]">{t("userProfile.noPermissionsAssigned")}</span>
                            ) : visiblePermissions.length === 0 && (
                                // Ничего не найдено
                                <span className="text-[12px] text-[#a3adbd]">{t("userProfile.activityNothingFound")}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({label, value, mono}: { label: string; value: string; mono?: boolean }) {
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