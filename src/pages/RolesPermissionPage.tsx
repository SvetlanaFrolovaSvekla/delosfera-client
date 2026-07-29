import {useEffect, useMemo, useState} from "react";
import {Check, Plus, Shield} from "lucide-react";
import {rolesPermissionService} from "@/service/rolesPermissionService/rolesPermissionService.ts";
import type {RoleResponse} from "@/service/rolesPermissionService/rolesPermissionTypeService.ts";
import {useAuth} from "@/context/AuthContext.ts";

export function RolesPermissionPage() {
    const {user} = useAuth();
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [checkedCodes, setCheckedCodes] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        void loadRoles();
    }, []);

    async function loadRoles() {
        setLoading(true);
        try {
            const data = await rolesPermissionService.getAll({sortBy: "NameAsc"});
            setRoles(data);
            if (data.length > 0) {
                selectRole(data[0]);
            }
        } finally {
            setLoading(false);
        }
    }

    function selectRole(role: RoleResponse) {
        setSelectedRoleId(role.id);
        setCheckedCodes(new Set(role.permissionCodes));
        setJustSaved(false);
    }

    const selectedRole = useMemo(
        () => roles.find((r) => r.id === selectedRoleId) ?? null,
        [roles, selectedRoleId]
    );

    // Все возможные права, сгруппированные — берём из permissions ЛЮБОЙ роли,
    // где они уже расшифрованы (описание + код), объединяя по всем ролям на случай,
    // если у выбранной роли какое-то право сейчас не отмечено.
    const allPermissions = useMemo(() => {
        const map = new Map<number, { code: number; description: string }>();
        roles.forEach((role) => {
            role.permissions.forEach((p) => {
                if (!map.has(p.code)) map.set(p.code, {code: p.code, description: p.description});
            });
        });
        return Array.from(map.values()).sort((a, b) => a.code - b.code);
    }, [roles]);

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
        } finally {
            setSaving(false);
        }
    }

    if (!user) return null;

    if (loading) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] pt-[26px] pb-[60px] text-[13px] text-[#8b97ab]">
                Загрузка…
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto px-[30px] pt-[26px] pb-[60px]">
            <div className="flex items-end justify-between gap-5 flex-wrap  mb-5">
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em] text-[#1c2740]">
                        Роли и права доступа
                    </h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        Настройка полномочий согласующих, подписантов и других ролей — доступ к модулям и типам подписи
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <button
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Создать роль
                    </button>
                </div>
            </div>

            {/* Роли пользователя */}
            {user.roles.length > 0 && (
                <div className="px-[15px] pb-3 flex flex-wrap gap-1.5">
                            <span
                                className="px-2 py-1 text-[11px] font-semibold"
                            >
                                    Роли моего профиля:
                                </span>
                    {user.roles.map((role) => (
                        <span
                            key={role.id}
                            className="px-2 py-1 rounded-[7px] bg-[#f2f5f9] text-[11px] font-semibold text-[#55617a]"
                        >
                                    {role.name}
                                </span>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
                {/* Левая колонка — список ролей */}
                <div className="flex flex-col gap-[9px]">
                    <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] px-0.5 pb-0.5">
                        Роли
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
                                    <span className="block font-semibold text-[13px] text-[#1c2740] truncate">
                                        {role.name}
                                    </span>
                                    <span className="block text-[11px] text-[#8b97ab] truncate">
                                        {role.titleEn ?? ""}
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
                            <span className="text-[12px] text-[#55617a]">
                                Прав включено:{" "}
                                <b className="font-mono text-[#4e57d6]">{checkedCodes.size}</b>
                            </span>
                        </div>

                        <div className="py-2">
                            {allPermissions.map((perm) => {
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
                                            {perm.description}
                                        </span>
                                        <span
                                            className="text-[10.5px] font-semibold text-[#a3adbd] bg-[#f2f5f9] px-[9px] py-0.5 rounded-full">
                                            #{perm.code}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-2.5 px-[22px] py-[15px] border-t border-[#eef2f7]">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                Отмена
                            </button>
                            {justSaved && (
                                <span
                                    className="inline-flex items-center gap-[7px] h-10 px-3.5 text-[#1c7a4d] font-semibold text-[12.5px]">
                                    <Check className="w-4 h-4" strokeWidth={2.2}/>
                                    Сохранено
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving}
                                className="h-10 px-[18px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? "Сохранение…" : "Сохранить изменения"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}