// Окно "Состав группы": кто входит в группу доступа (открывается по "?" в окне выбора групп)
import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Loader2, Users, X} from "lucide-react";
import {userGroupService} from "@/service/dictionariesService/userGroupService/userGroupService.ts";
import type {UserGroupResponse} from "@/service/dictionariesService/userGroupService/userGroupServiceType.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {getInitials} from "@/utils/namingUsers/getInitials.ts";

// Группы с составом грузим один раз на вкладку браузера (справочник меняется редко);
// при ошибке кэш сбрасывается, чтобы следующее открытие попробовало снова.
let groupsPromise: Promise<UserGroupResponse[]> | null = null;
function loadGroups(): Promise<UserGroupResponse[]> {
    if (groupsPromise) return groupsPromise;
    const promise: Promise<UserGroupResponse[]> = userGroupService.getAll().catch((e) => {
        groupsPromise = null;
        throw e;
    });
    groupsPromise = promise;
    return promise;
}

interface UserGroupMembersModalProps {
    groupId: number;
    /** Название группы - показываем сразу, пока состав ещё грузится */
    groupName: string;
    onClose: () => void;
}

export function UserGroupMembersModal({groupId, groupName, onClose}: UserGroupMembersModalProps) {
    const {t} = useTranslation();
    const [group, setGroup] = useState<UserGroupResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        let cancelled = false;
        loadGroups()
            .then((groups) => { if (!cancelled) setGroup(groups.find((g) => g.id === groupId) ?? null); })
            .catch(() => { if (!cancelled) setFailed(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => {
            cancelled = true;
        };
    }, [groupId]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const members = group?.users ?? [];
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? members.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
            : members;
    }, [members, query]);

    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,27,45,.42)] p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[85vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)]"
            >
                <div className="flex flex-none items-start justify-between gap-4 border-b border-[#eef2f7] px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Users size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h3 className="m-0 truncate text-[15px] font-semibold text-[#1c2740]">
                                {group?.name ?? groupName}
                            </h3>
                            <p className="m-0 mt-0.5 text-[12px] text-[#8b97ab]">
                                {group ? t("userGroupAccess.membersCount", {count: members.length}) : t("userGroupAccess.membersTitle")}
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

                {members.length > 5 && (
                    <div className="flex flex-none px-5 pt-4 pb-1">
                        <SearchBar
                            autoFocus
                            value={query}
                            onChange={setQuery}
                            placeholder={t("userGroupAccess.membersSearch")}
                        />
                    </div>
                )}

                <div className="min-h-[120px] flex-1 overflow-y-auto px-5 py-3">
                    {loading ? (
                        <div className="grid place-items-center py-8 text-[#a3adbd]">
                            <Loader2 size={20} className="animate-spin"/>
                        </div>
                    ) : failed ? (
                        <div className="py-8 text-center text-[13px] text-[#c0392b]">
                            {t("userGroupAccess.membersLoadError")}
                        </div>
                    ) : members.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("userGroupAccess.membersEmpty")}
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[#a3adbd]">{t("general.notFound")}</div>
                    ) : (
                        <ul className="m-0 flex list-none flex-col p-0">
                            {visible.map((u) => (
                                <li key={u.id}
                                    className="flex items-center gap-3 border-t border-[#f3f6f9] py-2.5 first:border-t-0">
                                    <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#ececfc] text-[11px] font-bold text-[#4e57d6]">
                                        {getInitials(u.fullName)}
                                    </span>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate text-[13px] font-semibold text-[#26324a]">
                                            <HighlightText text={u.fullName} query={query}/>
                                        </span>
                                        <span className="truncate text-[11.5px] text-[#8b97ab]">
                                            <HighlightText text={u.email} query={query}/>
                                        </span>
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
