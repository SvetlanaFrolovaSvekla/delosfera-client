// Модалка с описанием полномочий роли (открывается по "?" возле названия роли в карточке
// учётной записи - см. UserCardPage)
import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Check, ShieldCheck, X} from "lucide-react";
import type {RoleResponse} from "@/service/userService/userServiceType.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";

interface RolePermissionsModalProps {
    role: RoleResponse;
    onClose: () => void;
}

export function RolePermissionsModal({role, onClose}: RolePermissionsModalProps) {
    const {t} = useTranslation();
    const [query, setQuery] = useState("");

    const visiblePermissions = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? role.permissions.filter((p) => p.description.toLowerCase().includes(q))
            : role.permissions;
    }, [role.permissions, query]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,27,45,.42)] p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)]"
            >
                {/* Заголовок */}
                <div className="flex flex-none items-start justify-between gap-4 border-b border-[#eef2f7] px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span
                            className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <ShieldCheck size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h3 className="m-0 truncate text-[15px] font-semibold text-[#1c2740]">
                                {role.titleRu}
                            </h3>
                            <p className="m-0 mt-0.5 text-[12px] text-[#8b97ab]">
                                {/* "Полномочия роли: {{count}}" */}
                                {t("userCardPage.rolePermissionsSubtitle", {count: role.permissions.length})}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a]"
                    >
                        <X className="h-4 w-4" strokeWidth={2}/>
                    </button>
                </div>

                {/* Поиск по полномочиям */}
                {role.permissions.length > 0 && (
                    <div className="flex flex-none px-5 pt-4 pb-1">
                        <SearchBar
                            autoFocus
                            value={query}
                            onChange={setQuery}
                            placeholder={t("userCardPage.permissionsSearchPlaceholder")}
                        />
                    </div>
                )}

                {/* Список полномочий */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                    {role.permissions.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[#a3adbd]">
                            {/* "У роли нет назначенных полномочий" */}
                            {t("userCardPage.rolePermissionsEmpty")}
                        </div>
                    ) : visiblePermissions.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("general.notFound")}
                        </div>
                    ) : (
                        <ul className="m-0 flex list-none flex-col p-0">
                            {visiblePermissions.map((p) => (
                                <li
                                    key={p.code}
                                    className="flex items-start gap-2.5 border-t border-[#f3f6f9] py-2.5 first:border-t-0"
                                >
                                    <span
                                        className="mt-[1px] grid h-5 w-5 flex-none place-items-center rounded-md bg-[#e9f0ff] text-[#2f68f5]">
                                        <Check className="h-[13px] w-[13px]" strokeWidth={3}/>
                                    </span>
                                    <span className="text-[13px] leading-[1.4] text-[#26324a]">
                                        <HighlightText text={p.description} query={query}/>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
