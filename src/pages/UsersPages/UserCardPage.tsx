/**
 * Карточка учётной записи (редактирование): просмотр и правка.
 */
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {userService} from "@/service/userService/userService.ts";
import {roleService} from "@/service/userService/roleService.ts";
import type {
    RoleResponse,
    UpdateUserRequest,
    UserResponse,
} from "@/service/userService/userServiceType.ts";
import {ArrowLeft, CircleHelp} from "lucide-react";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {RolePermissionsModal} from "@/components/componentsUsers/RolePermissionsModal.tsx";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5] disabled:bg-[#fafbfd] disabled:text-[#8b97ab]";
const labelClass = "block text-[11.5px] text-[#8b97ab] mb-[5px]";

function Field({label, hint, children, className = ""}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={`block ${className}`}>
            <span className={labelClass}>{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[11.5px] text-[#a6b0c2]">{hint}</span>}
        </label>
    );
}

function formatMoment(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

export function UserCardPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const isNew = !id || id === "new";
    const navigate = useNavigate();

    const {orgUnitOptions, positions} = useDictionaries();

    // Должности для SelectDropdown: первым пунктом - "Не задана" (пустое значение)
    const positionSelectOptions = useMemo(
        () => [
            {value: "", label: t("userCardPage.positionNotSet")},
            ...positions.map((p) => ({value: String(p.id), label: p.titleRu})),
        ],
        [positions, t]);

    // Поиск по ролям и роль, для которой открыта модалка с полномочиями
    const [roleQuery, setRoleQuery] = useState("");
    const [infoRole, setInfoRole] = useState<RoleResponse | null>(null);

    const [user, setUser] = useState<UserResponse | null>(null);
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [form, setForm] = useState<UpdateUserRequest & { password?: string }>({
        fullName: "", email: "", isActive: true, roleIds: [], positionId: null, orgUnitId: null,
    });

    const [loading, setLoading] = useState(!isNew);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [blockReason, setBlockReason] = useState("");

    const fromDirectory = user?.source === "Ldap";

    const apply = useCallback((data: UserResponse) => {
        setUser(data);
        setForm({
            fullName: data.fullName,
            email: data.email,
            isActive: data.isActive,
            positionId: data.position?.id ?? null,
            orgUnitId: data.orgUnit?.id ?? null,
            roleIds: data.roles.map((r) => r.id),
        });
    }, []);

    useEffect(() => {
        roleService.getAll().then(setRoles).catch(() => setRoles([]));
    }, []);

    useEffect(() => {
        if (isNew) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        userService.getById(Number(id))
            .then(apply)
            // "Не удалось загрузить учётную запись"
            .catch(() => setError(t("userCardPage.loadError")))
            .finally(() => setLoading(false));
    }, [id, isNew, apply, t]);

    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm((f) => ({...f, [key]: value}));

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            await action();
        } catch (e) {
            const message = (e as { message?: string }).message;
            // "Не удалось выполнить действие"
            setError(message ?? t("userCardPage.actionError"));
        } finally {
            setBusy(false);
        }
    };

    const save = () => run(async () => {
        if (!form.fullName.trim() || !form.email.trim()) {
            // "Заполните ФИО и адрес почты"
            setError(t("userCardPage.validationRequired"));
            return;
        }

        if (isNew) {
            if (!form.password || form.password.length < 8) {
                // "Задайте пароль не короче 8 символов"
                setError(t("userCardPage.validationPassword"));
                return;
            }

            const created = await userService.create({
                fullName: form.fullName,
                email: form.email,
                password: form.password,
                positionId: form.positionId,
                orgUnitId: form.orgUnitId,
                roleIds: form.roleIds,
            });

            navigate(`/management/users/${created.id}`, {replace: true});
            return;
        }

        apply(await userService.update(Number(id), {
            fullName: form.fullName,
            email: form.email,
            password: form.password || undefined,
            positionId: form.positionId,
            orgUnitId: form.orgUnitId,
            isActive: form.isActive,
            roleIds: form.roleIds,
        }));

        setForm((f) => ({...f, password: ""}));
        // "Сохранено"
        setNotice(t("userCardPage.savedNotice"));
    });

    const block = () => run(async () => {
        apply(await userService.block(Number(id), {reason: blockReason || undefined}));
        setBlockReason("");
        // "Учётная запись заблокирована"
        setNotice(t("userCardPage.blockedNotice"));
    });

    const unblock = () => run(async () => {
        apply(await userService.unblock(Number(id)));
        // "Блокировка снята"
        setNotice(t("userCardPage.unblockedNotice"));
    });

    const toggleRole = (roleId: number) =>
        set("roleIds", form.roleIds?.includes(roleId)
            ? form.roleIds.filter((x) => x !== roleId)
            : [...(form.roleIds ?? []), roleId]);

    const visibleRoles = useMemo(() => {
        const q = roleQuery.trim().toLowerCase();
        return q ? roles.filter((r) => r.titleRu.toLowerCase().includes(q)) : roles;
    }, [roles, roleQuery]);

    const title = useMemo(
        // "Новый пользователь" / "Учётная запись"
        () => (isNew ? t("userCardPage.newUserTitle") : user?.fullName ?? t("userCardPage.fallbackTitle")),
        [isNew, user, t]);

    // "Загрузка…"
    if (loading) return <div className="p-6 text-[13px] text-[#8b97ab]">{t("userCardPage.loading")}</div>;

    return (
        <div className="p-6">
            <button
                onClick={() => navigate("/management/users")}
                className="inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[12.5px] text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
            >
                <ArrowLeft size={14}/>
                {/* "Пользователи" */}
                {t("userCardPage.backToList")}
            </button>

            <div className="mt-2 flex items-start justify-between">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{title}</h1>
                    {user && (
                        <div className="mt-1 flex items-center gap-2 text-[12.5px] text-[#8b97ab]">
                            <span>{user.email}</span>
                            <span>·</span>
                            {/* "из службы каталогов" / "локальная учётная запись" */}
                            <span>{fromDirectory ? t("userCardPage.sourceLdapInline") : t("userCardPage.sourceLocalInline")}</span>
                            {user.isBlocked && (
                                <span className="rounded-full bg-[#fdeeec] px-2 py-0.5 font-semibold text-[#c0392b]">
                                    {/* "заблокирована" */}
                                    {t("userCardPage.badgeBlocked")}
                                </span>
                            )}
                            {!user.isActive && !user.isBlocked && (
                                <span className="rounded-full bg-[#f6f8fb] px-2 py-0.5 font-semibold text-[#8b97ab]">
                                    {/* "отключена в каталоге" */}
                                    {t("userCardPage.badgeDisabledInDirectory")}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={save}
                    disabled={busy}
                    className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]">
                    {/* "Сохранить" */}
                    {t("userCardPage.save")}
                </button>
            </div>

            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f3c9c2] bg-[#fdeeec] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}
            {notice && (
                <div className="mt-4 rounded-[10px] border border-[#cbe6d0] bg-[#f0faf3] px-4 py-2.5 text-[13px] text-[#1f8a4c]">
                    {notice}
                </div>
            )}

            <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <h2 className="m-0 mb-4 text-[15px] font-semibold">
                    {/* "Учётные данные" */}
                    {t("userCardPage.credentialsSection")}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <Field
                        // "ФИО"
                        label={t("userCardPage.fullNameLabel")}
                        // "Приходит из службы каталогов"
                        hint={fromDirectory ? t("userCardPage.fromDirectoryHint") : undefined}
                    >
                        <input className={inputClass} value={form.fullName} disabled={fromDirectory}
                               onChange={(e) => set("fullName", e.target.value)}/>
                    </Field>

                    <Field
                        // "Почта (она же логин)"
                        label={t("userCardPage.emailLabel")}
                        // "Приходит из службы каталогов"
                        hint={fromDirectory ? t("userCardPage.fromDirectoryHint") : undefined}
                    >
                        <input className={inputClass} value={form.email} disabled={fromDirectory}
                               onChange={(e) => set("email", e.target.value)}/>
                    </Field>

                    <Field
                        // "Пароль" / "Новый пароль"
                        label={isNew ? t("userCardPage.passwordLabelNew") : t("userCardPage.passwordLabelExisting")}
                        hint={fromDirectory
                            // "Пароль доменной учётной записи хранится в домене"
                            ? t("userCardPage.passwordHintDirectory")
                            : isNew
                                // "Не короче 8 символов"
                                ? t("userCardPage.passwordHintMinLength")
                                // "Пусто — пароль не меняется"
                                : t("userCardPage.passwordHintKeepEmpty")}
                    >
                        <input className={inputClass} type="password" autoComplete="new-password"
                               value={form.password ?? ""} disabled={fromDirectory}
                               onChange={(e) => set("password", e.target.value)}/>
                    </Field>

                    {/* "Должность" */}
                    <div>
                        <span className={labelClass}>{t("userCardPage.positionLabel")}</span>
                        <SelectDropdown
                            className="w-full"
                            minWidth="100%"
                            searchable
                            searchPlaceholder={t("userCardPage.positionSearchPlaceholder")}
                            options={positionSelectOptions}
                            value={form.positionId != null ? String(form.positionId) : ""}
                            onChange={(v) => set("positionId", v ? Number(v) : null)}
                        />
                    </div>

                    {/* "Структурное подразделение" - выбор из модального окна с деревом */}
                    <SingleSelectListField
                        boldLabel={false}
                        label={t("userCardPage.orgUnitLabel")}
                        modalTitle={t("userCardPage.orgUnitModalTitle")}
                        searchPlaceholder={t("userCardPage.orgUnitSearchPlaceholder")}
                        placeholder={t("userCardPage.orgUnitNotSet")}
                        clearLabel={t("userCardPage.orgUnitClear")}
                        options={orgUnitOptions}
                        selectedKey={form.orgUnitId != null ? String(form.orgUnitId) : null}
                        onChange={(key) => set("orgUnitId", key ? Number(key) : null)}
                    />

                    {!isNew && (
                        <div className="flex items-end gap-2.5">
                            <CheckBoxOne
                                tone="brand"
                                checked={!!form.isActive}
                                disabled={fromDirectory}
                                onChange={(v) => set("isActive", v)}
                            >
                                {/* "Учётная запись активна" */}
                                {t("userCardPage.isActiveLabel")}
                            </CheckBoxOne>
                            {fromDirectory && (
                                <span className="pb-2.5 text-[11.5px] text-[#a6b0c2]">
                                    {/* "(задаётся службой каталогов)" */}
                                    {t("userCardPage.isActiveDirectoryHint")}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <h2 className="m-0 mb-1 text-[15px] font-semibold">
                    {/* "Роли" */}
                    {t("userCardPage.rolesSection")}
                </h2>
                <div className="mb-3 text-[12.5px] text-[#8b97ab]">
                    {/* "Определяют, что пользователь видит и может делать. Из каталога роли не приходят — их назначает администратор системы." */}
                    {t("userCardPage.rolesDescription")}
                </div>

                {/* Поиск по названию роли: совпадения подсвечиваются в чипсах ниже */}
                <div className="mb-3 flex">
                    <SearchBar
                        variant="white"
                        value={roleQuery}
                        onChange={setRoleQuery}
                        placeholder={t("userCardPage.rolesSearchPlaceholder")}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {visibleRoles.length === 0 && (
                        <div className="py-2 text-[13px] text-[#a3adbd]">{t("general.notFound")}</div>
                    )}
                    {visibleRoles.map((role) => {
                        const on = form.roleIds?.includes(role.id);

                        return (
                            <div
                                key={role.id}
                                className={`inline-flex h-8 items-center rounded-full border text-[12.5px] font-semibold ${
                                    on
                                        ? "border-[#cbddff] bg-[#e9f0ff] text-[#2f68f5]"
                                        : "border-[#e5e9f0] bg-white text-[#55617a]"}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleRole(role.id)}
                                    className="h-full cursor-pointer rounded-l-full pl-3 pr-1.5 font-semibold"
                                >
                                    <HighlightText text={role.titleRu} query={roleQuery}/>
                                </button>
                                {/* "?" - описание полномочий роли в модалке */}
                                <Tooltip content={t("userCardPage.roleInfoTooltip")} side="top">
                                    <button
                                        type="button"
                                        aria-label={t("userCardPage.roleInfoTooltip")}
                                        onClick={() => setInfoRole(role)}
                                        className="mr-1.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full opacity-70 hover:bg-black/5 hover:opacity-100"
                                    >
                                        <CircleHelp size={15} strokeWidth={2}/>
                                    </button>
                                </Tooltip>
                            </div>
                        );
                    })}
                </div>
            </div>

            {infoRole && <RolePermissionsModal role={infoRole} onClose={() => setInfoRole(null)}/>}

            {user && (
                <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                    <h2 className="m-0 mb-3 text-[15px] font-semibold">
                        {/* "Доступ и события" */}
                        {t("userCardPage.accessSection")}
                    </h2>

                    <div className="grid grid-cols-4 gap-4 text-[13px]">
                        <div>
                            {/* "Последний вход" */}
                            <div className={labelClass}>{t("userCardPage.lastLoginLabel")}</div>
                            <div className="text-[#1c2740]">{formatMoment(user.lastLoginAt)}</div>
                        </div>
                        <div>
                            {/* "Создана" */}
                            <div className={labelClass}>{t("userCardPage.createdLabel")}</div>
                            <div className="text-[#1c2740]">{formatMoment(user.createdAt)}</div>
                        </div>
                        <div>
                            {/* "Изменена" */}
                            <div className={labelClass}>{t("userCardPage.updatedLabel")}</div>
                            <div className="text-[#1c2740]">{formatMoment(user.updatedAt)}</div>
                        </div>
                        <div>
                            {/* "Источник" */}
                            <div className={labelClass}>{t("userCardPage.sourceLabel")}</div>
                            <div className="text-[#1c2740]">
                                {/* "Служба каталогов" / "Заведена в системе" */}
                                {fromDirectory ? t("userCardPage.sourceLdap") : t("userCardPage.sourceLocal")}
                            </div>
                        </div>
                    </div>

                    {user.isBlocked ? (
                        <div className="mt-4 rounded-[9px] border border-[#f0dcae] bg-[#fdf3e0] px-3 py-2.5">
                            <div className="text-[12.5px] text-[#b3730a]">
                                {/* "Заблокирована {date}" */}
                                {t("userCardPage.blockedAt", {date: formatMoment(user.blockedAt)})}
                                {/* ", {name}" */}
                                {user.blockedByUserName ? t("userCardPage.blockedBy", {name: user.blockedByUserName}) : ""}
                                {/* ". Причина: {reason}" */}
                                {user.blockReason ? t("userCardPage.blockedReason", {reason: user.blockReason}) : ""}
                            </div>
                            <button
                                onClick={unblock}
                                disabled={busy}
                                className="mt-2 h-8 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#55617a] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50"
                            >
                                {/* "Снять блокировку" */}
                                {t("userCardPage.unblockButton")}
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4">
                            {/* Подпись сверху, поле и кнопка в одной строке (одной высоты),
                                подсказка под ними - так кнопка стоит ровно по полю */}
                            <span className={labelClass}>
                                {/* "Причина блокировки" */}
                                {t("userCardPage.blockReasonLabel")}
                            </span>
                            <div className="flex items-center gap-2">
                                <input className={`${inputClass} min-w-0 flex-1`} value={blockReason}
                                       onChange={(e) => setBlockReason(e.target.value)}/>
                                <button
                                    onClick={block}
                                    disabled={busy}
                                    className="h-10 flex-none whitespace-nowrap px-4 rounded-[9px] border border-[#f3c9c2] bg-white text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fdeeec] disabled:opacity-50"
                                >
                                    {/* "Заблокировать" */}
                                    {t("userCardPage.blockButton")}
                                </button>
                            </div>
                            <span className="mt-1 block text-[11.5px] text-[#a6b0c2]">
                                {/* "Останется в журнале и в карточке" */}
                                {t("userCardPage.blockReasonHint")}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}