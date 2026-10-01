/* Страница "Доступы и роли" */
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {rolesPermissionService} from "@/service/rolesPermissionService/rolesPermissionService.ts";
import type {PermissionResponse, RoleResponse} from "@/service/rolesPermissionService/rolesPermissionTypeService.ts";
import {toast} from "@/service/toastService.ts";
import {CreateRoleModal, type CreateRoleData} from "@/components/componentsModal/CreateRoleModal.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {Check, Lock, Pencil, Plus, Shield, Trash2, User as UserIcon} from "lucide-react";


/** Текст ошибки из ответа сервера ({message}) — axios сам отдаёт лишь «Request failed with status code 409». */
function serverErrorMessage(e: unknown, fallback: string): string {
    const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
    return message || (e instanceof Error ? e.message : fallback);
}

export function RolesPermissionPage() {
    const {t} = useTranslation();
    const {user} = useAuth();
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [checkedCodes, setCheckedCodes] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [permissionQuery, setPermissionQuery] = useState("");
    // Полный каталог прав с сервера: иначе право, которого нет ни у одной роли,
    // нельзя было бы включить вообще — список собирался только из прав существующих ролей.
    const [permissionCatalog, setPermissionCatalog] = useState<PermissionResponse[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function selectRole(role: RoleResponse) {
        setSelectedRoleId(role.id);
        setCheckedCodes(new Set(role.permissionCodes));
        setJustSaved(false);
    }

    async function loadRoles() {
        try {
            const data = await rolesPermissionService.getAll({
                sortBy: "NameAsc",
            });

            setRoles(data);

            if (data.length > 0) {
                setSelectedRoleId(data[0].id);
                setCheckedCodes(new Set(data[0].permissionCodes));
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadRoles();
        rolesPermissionService.getAllPermissions()
            .then(setPermissionCatalog)
            .catch(() => setPermissionCatalog([]));
    }, []);

    const selectedRole = useMemo(
        () => roles.find((r) => r.id === selectedRoleId) ?? null,
        [roles, selectedRoleId]
    );

    // Все возможные права, сгруппированные — берём из permissions ЛЮБОЙ роли,
    // где они уже расшифрованы (описание + код), объединяя по всем ролям на случай,
    // если у выбранной роли какое-то право сейчас не отмечено.
    const allPermissions = useMemo(() => {
        const map = new Map<number, { code: number; description: string }>();
        permissionCatalog.forEach((p) => map.set(p.code, {code: p.code, description: p.description}));
        roles.forEach((role) => {
            role.permissions.forEach((p) => {
                if (!map.has(p.code)) map.set(p.code, {code: p.code, description: p.description});
            });
        });
        return Array.from(map.values()).sort((a, b) => a.code - b.code);
    }, [roles, permissionCatalog]);

    // Есть ли несохранённые изменения прав выбранной роли.
    const isDirty = useMemo(() => {
        if (!selectedRole) return false;
        const original = new Set(selectedRole.permissionCodes);
        if (original.size !== checkedCodes.size) return true;
        for (const code of checkedCodes) if (!original.has(code)) return true;
        return false;
    }, [selectedRole, checkedCodes]);

    // Поиск по описанию права и по номеру ("#12" и "12" находят одно и то же).
    const shownPermissions = useMemo(() => {
        const q = permissionQuery.trim().toLowerCase();
        if (!q) return allPermissions;
        const codeQuery = q.replace(/^#/, "");
        return allPermissions.filter((p) =>
            p.description.toLowerCase().includes(q) || String(p.code).includes(codeQuery));
    }, [allPermissions, permissionQuery]);

    function togglePermission(code: number) {
        setCheckedCodes((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
        setJustSaved(false);
    }

    function handleCancel() {
        if (selectedRole) selectRole(selectedRole);
    }

    async function handleSave() {
        if (!selectedRole) return;
        setSaving(true);
        // "Сохраняем изменения…", `Роль «${selectedRole.name}»`
        const toastId = toast.loading(
            t("rolesPermissions.toastSavingChanges"),
            t("rolesPermissions.toastRoleName", {name: selectedRole.name})
        );
        try {
            const updated = await rolesPermissionService.update(selectedRole.id, {
                titleRu: selectedRole.titleRu,
                titleEn: selectedRole.titleEn ?? undefined,
                titleKg: selectedRole.titleKg ?? undefined,
                permissionCodes: Array.from(checkedCodes),
            });
            setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setCheckedCodes(new Set(updated.permissionCodes));
            setJustSaved(true);
            toast.update(toastId, {
                variant: "success",
                // "Изменения сохранены"
                title: t("rolesPermissions.toastChangesSaved"),
                // `Роль «${updated.name}» обновлена`
                description: t("rolesPermissions.toastRoleUpdated", {name: updated.name}),
                duration: 4500,
            });
        } catch (e) {
            toast.update(toastId, {
                variant: "error",
                // "Не удалось сохранить"
                title: t("rolesPermissions.toastSaveFailed"),
                // "Попробуйте ещё раз"
                description: serverErrorMessage(e, t("rolesPermissions.toastTryAgain")),
                duration: 4500,
            });
        } finally {
            setSaving(false);
        }
    }

    // Создание роли: только названия, права по умолчанию пустые —
    // включаются потом в редакторе справа (уже готовый UI выше).
    async function handleCreateRole(data: CreateRoleData) {
        // "Создаём роль…"
        const toastId = toast.loading(t("rolesPermissions.toastCreatingRole"), data.titleRu);
        try {
            const created = await rolesPermissionService.create({
                titleRu: data.titleRu,
                titleEn: data.titleEn,
                titleKg: data.titleKg,
                permissionCodes: [],
            });
            setRoles((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            selectRole(created);
            toast.update(toastId, {
                variant: "success",
                // "Роль создана"
                title: t("rolesPermissions.toastRoleCreated"),
                // `«${created.name}» — включите права в редакторе справа`
                description: t("rolesPermissions.toastRoleCreatedDesc", {name: created.name}),
                duration: 4500,
            });
        } catch (e) {
            toast.update(toastId, {
                variant: "error",
                // "Не удалось создать роль"
                title: t("rolesPermissions.toastCreateRoleFailed"),
                // "Попробуйте ещё раз"
                description: serverErrorMessage(e, t("rolesPermissions.toastTryAgain")),
                duration: 4500,
            });
            // пробрасываем, чтобы модалка осталась открытой и показала ошибку в форме
            throw new Error(serverErrorMessage(e, t("rolesPermissions.toastTryAgain")));
        }
    }

    // Правка названий роли. Права при этом не трогаем — берём сохранённые, а не
    // отмеченные в редакторе, чтобы переименование не сохранило их втихую.
    async function handleEditRole(data: CreateRoleData) {
        if (!selectedRole) return;
        let updated: RoleResponse;
        try {
            updated = await rolesPermissionService.update(selectedRole.id, {
                titleRu: data.titleRu,
                titleEn: data.titleEn,
                titleKg: data.titleKg,
                permissionCodes: selectedRole.permissionCodes,
            });
        } catch (e) {
            // Модалка покажет текст ошибки в форме и останется открытой.
            throw new Error(serverErrorMessage(e, "Не удалось сохранить роль"));
        }
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? {...updated, usersCount: r.usersCount} : r)));
        toast.success("Роль сохранена", `«${updated.name}»`);
    }

    async function handleDeleteRole() {
        if (!selectedRole) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await rolesPermissionService.remove(selectedRole.id);
            const rest = roles.filter((r) => r.id !== selectedRole.id);
            setRoles(rest);
            if (rest.length > 0) selectRole(rest[0]);
            else setSelectedRoleId(null);
            setDeleteOpen(false);
            toast.success("Роль удалена", `«${selectedRole.name}» снята со всех пользователей`);
        } catch (e) {
            setDeleteError(serverErrorMessage(e, "Не удалось удалить роль"));
        } finally {
            setDeleting(false);
        }
    }

    if (!user) return null;

    if (loading) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] pt-[26px] pb-[60px] text-[13px] text-[#8b97ab]">
                {/* "Загрузка…" */}
                <Loader label={t("general.loading")}/>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <div className="flex items-end justify-between gap-5 flex-wrap  mb-5">
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em] text-[#1c2740]">
                        {/* "Роли и права доступа" */}
                        {t("rolesPermissions.title")}
                    </h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        {/* "Настройка полномочий согласующих, подписантов и других ролей." */}
                        {t("rolesPermissions.subtitle")}
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {/* "Создать роль" */}
                        {t("rolesPermissions.createRole")}
                    </button>
                </div>
            </div>

            {/* Роли пользователя */}
            {user.roles.length > 0 && (
                <div className="pb-3 flex flex-wrap gap-1.5">
                    <p
                        className="py-1 text-[13px] text-[#8b97ab] text-[13px]"
                    >
                        {/* "Роли моего профиля:" */}
                        {t("rolesPermissions.myProfileRoles")}
                    </p>
                    {user.roles.map((role) => (
                        <span
                            key={role.id}
                            className="inline-flex items-center gap-[7px] px-[11px] py-[5px] rounded-lg bg-[#e2f4ea] text-[#1c7a4d] font-semibold text-[12.5px]"
                        >
                                    <UserIcon size={14} strokeWidth={1.9} />
                            {role.name}
                                </span>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
                {/* Левая колонка — список ролей */}
                <div className="flex flex-col gap-[9px]">
                    <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] px-0.5 pb-0.5">
                        {/* "Роли" */}
                        {t("rolesPermissions.roles")}
                    </div>
                    {roles.map((role) => {
                        const isActive = role.id === selectedRoleId;
                        return (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => selectRole(role)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-[11px] border text-left cursor-pointer transition-colors ${
                                    isActive
                                        ? "border-[#4e57d6] bg-[#f5f6ff]"
                                        : "border-[#e9edf3] bg-white hover:bg-[#fbfcfe]"
                                }`}
                            >
                                <span
                                    className="w-[34px] h-[34px] flex-none rounded-[9px] bg-[#ececfc] text-[#4e57d6] grid place-items-center">
                                    <Shield className="w-[18px] h-[18px]" strokeWidth={1.8}/>
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5 font-semibold text-[13px] text-[#1c2740]">
                                        <span className="truncate">{role.name}</span>
                                        {role.isSystem && (
                                            <span title="Системная роль — удалить нельзя" className="flex-none text-[#a3adbd]">
                                                <Lock className="w-[12px] h-[12px]" strokeWidth={2.2}/>
                                            </span>
                                        )}
                                    </span>
                                    <span className="block text-[11px] text-[#8b97ab] truncate">
                                        {role.titleEn ?? ""}
                                        {role.usersCount !== undefined && (
                                            <>{role.titleEn ? " · " : ""}пользователей: {role.usersCount}</>
                                        )}
                                    </span>
                                </span>
                                <span
                                    className="flex-none font-mono text-[11px] font-bold text-[#4e57d6] bg-[#ececfc] px-[7px] py-0.5 rounded-full">
                                    {role.permissionCodes.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Правая колонка — права выбранной роли */}
                {selectedRole && (
                    <div className="bg-white border border-[#e9edf3] rounded-[14px] overflow-hidden">
                        <div
                            className="flex items-center justify-between px-[22px] py-[17px] border-b border-[#eef2f7]">
                            <div>
                                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">
                                    {selectedRole.name}
                                </h2>
                                <div className="text-[12px] text-[#8b97ab] mt-0.5">
                                    {selectedRole.titleEn ?? ""}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] text-[#55617a] mr-1">
                                    {/* "Прав включено:" */}
                                    {t("rolesPermissions.permissionsEnabled")}{" "}
                                    <b className="font-mono text-[#4e57d6]">{checkedCodes.size}</b>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(true)}
                                    title="Изменить название роли"
                                    className="w-8 h-8 grid place-items-center rounded-[9px] bg-[#ececfc] text-[#4e57d6] cursor-pointer hover:bg-[#dcdefa]"
                                >
                                    <Pencil className="w-[14px] h-[14px]" strokeWidth={2}/>
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedRole.isSystem}
                                    onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
                                    title={selectedRole.isSystem ? "Системную роль удалить нельзя" : "Удалить роль"}
                                    className="w-8 h-8 grid place-items-center rounded-[9px] bg-[#fdeceb] text-[#c0392b] cursor-pointer hover:bg-[#fad9d7] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-[14px] h-[14px]" strokeWidth={2}/>
                                </button>
                            </div>
                        </div>

                        {/* Кнопки сохранения — над поиском, чтобы не листать длинный список прав вниз. */}
                        <div className="flex items-center justify-end gap-2.5 px-[22px] py-3 border-b border-[#eef2f7] bg-[#fbfcfe]">
                            {isDirty && (
                                <span className="mr-auto text-[12px] text-[#b3701e]">Есть несохранённые изменения</span>
                            )}
                            {justSaved && !isDirty && (
                                <span
                                    className="inline-flex items-center gap-[7px] h-9 px-2 text-[#1c7a4d] font-semibold text-[12.5px]">
                                    <Check className="w-4 h-4" strokeWidth={2.2}/>
                                    {/* "Сохранено" */}
                                    {t("rolesPermissions.saved")}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={!isDirty || saving}
                                className="h-9 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* "Отмена" */}
                                {t("rolesPermissions.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving || !isDirty}
                                className="h-9 px-[18px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {/* saving ? "Сохранение…" : "Сохранить изменения" */}
                                {saving ? t("rolesPermissions.saving") : t("rolesPermissions.saveChanges")}
                            </button>
                        </div>

                        <div className="px-[22px] py-3 border-b border-[#eef2f7]">
                            <SearchBar
                                variant="white"
                                placeholder={t("rolesPermissions.searchPermissions")} /* Поиск по правам… */
                                value={permissionQuery}
                                onChange={setPermissionQuery}
                            />
                        </div>

                        <div className="py-2">
                            {shownPermissions.length === 0 && (
                                <div className="px-[22px] py-8 text-center text-[13px] text-[#8b97ab]">
                                    {t("rolesPermissions.permissionsNotFound") /* Права не найдены */}
                                </div>
                            )}
                            {shownPermissions.map((perm) => {
                                const checked = checkedCodes.has(perm.code);
                                return (
                                    <label
                                        key={perm.code}
                                        className="flex items-center gap-[13px] px-[22px] py-[11px] cursor-pointer border-b border-[#f6f8fb] hover:bg-[#fbfcfe]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => togglePermission(perm.code)}
                                            className={`w-[20px] h-[20px] flex-none rounded-[6px] grid place-items-center transition-colors ${
                                                checked
                                                    ? "bg-[#4e57d6]"
                                                    : "bg-white border border-[#d5dae3]"
                                            }`}
                                        >
                                            <Check
                                                className="w-[14px] h-[14px] text-white"
                                                strokeWidth={2.6}
                                                style={{opacity: checked ? 1 : 0}}
                                            />
                                        </button>
                                        <span className="flex-1 text-[13.5px] text-[#26324a]">
                                            <HighlightText text={perm.description} query={permissionQuery}/>
                                        </span>
                                        <span
                                            className="text-[10.5px] font-semibold text-[#a3adbd] bg-[#f2f5f9] px-[9px] py-0.5 rounded-full">
                                            <HighlightText text={`#${perm.code}`} query={permissionQuery}/>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                    </div>
                )}
            </div>

            <CreateRoleModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateRole}
            />

            {selectedRole && (
                <CreateRoleModal
                    open={isEditModalOpen}
                    mode="edit"
                    initial={{
                        titleRu: selectedRole.titleRu,
                        titleEn: selectedRole.titleEn ?? undefined,
                        titleKg: selectedRole.titleKg ?? undefined,
                    }}
                    lockTitleRu={selectedRole.isSystem}
                    onClose={() => setIsEditModalOpen(false)}
                    onCreate={handleEditRole}
                />
            )}

            {selectedRole && deleteOpen && (
                <ConfirmDeleteModal
                    open
                    onClose={() => setDeleteOpen(false)}
                    onConfirm={() => void handleDeleteRole()}
                    loading={deleting}
                    error={deleteError}
                    title="Удалить роль?"
                    message={
                        (selectedRole.usersCount ?? 0) > 0
                            ? `Роль «${selectedRole.name}» будет снята со всех пользователей (${selectedRole.usersCount}) и удалена. Действие нельзя отменить.`
                            : `Роль «${selectedRole.name}» будет удалена. Действие нельзя отменить.`
                    }
                />
            )}
        </div>
    );
}