// Таблица пользователей (реестр учётных записей)
import {Pencil, Lock, Unlock} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import type {UserResponse, UserSource} from "@/service/userService/userServiceType.ts";
import type {UserColDef} from "@/constants/columnsFilters/usersColumns.ts";

const SOURCE_LABEL: Record<UserSource, string> = {
    Local: "Локальный",
    Ldap: "LDAP",
};

const SOURCE_STYLE: Record<UserSource, string> = {
    Ldap: "text-[#3b6fd6] bg-[#eaf1fd]",
    Local: "text-[#7a4fd6] bg-[#f3edfd]",
};

function getInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDateTime(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

interface UsersTableProps {
    users: UserResponse[];
    columns: UserColDef[];
    gridTemplate: string;
    onEdit: (user: UserResponse) => void;
    onBlock: (user: UserResponse) => void;
    onUnblock: (user: UserResponse) => void;
}

export function UsersTable({users, columns, gridTemplate, onEdit, onBlock, onUnblock}: UsersTableProps) {
    return (
        <div className="bg-white border border-[#e9edf3] rounded-[14px] overflow-x-auto">
            <div className="w-full">
                <div
                    className="grid gap-3 px-5 py-3 border-b border-[#eef2f7] bg-[#fafbfd] rounded-t-[14px] text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]"
                    style={{gridTemplateColumns: gridTemplate}}
                >
                    {columns.map((c) => (
                        <div key={c.key} className={c.key === "actions" ? "text-right" : "whitespace-nowrap"}>
                            {c.label}
                        </div>
                    ))}
                </div>

                {users.map((u, index) => (
                    <div
                        key={u.id}
                        className={`group grid gap-3 items-center px-5 py-3 hover:bg-[#fbfcfe] transition ${
                            index === users.length - 1 ? "rounded-b-[14px]" : "border-b border-[#f3f6f9]"
                        }`}
                        style={{gridTemplateColumns: gridTemplate}}
                    >
                        {columns.map((c) => {
                            switch (c.key) {
                                case "user":
                                    return (
                                        <div key={c.key} className="flex items-center gap-2.5 min-w-0">
                                            <span
                                                className="w-8 h-8 flex-none rounded-lg bg-[#eef0fb] text-[#4e57d6] grid place-items-center text-[11px] font-bold">
                                                {getInitials(u.fullName)}
                                            </span>
                                            <div className="min-w-0">
                                                <div
                                                    className="text-[13px] font-semibold text-[#1c2740] whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {u.fullName}
                                                </div>
                                                <div
                                                    className="text-[11.5px] text-[#8b97ab] whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {u.position?.titleRu ?? "—"}
                                                </div>
                                            </div>
                                        </div>
                                    );

                                case "email":
                                    return (
                                        <div key={c.key}
                                             className="min-w-0 font-mono text-[12px] text-[#55617a] whitespace-nowrap overflow-hidden text-ellipsis">
                                            {u.email}
                                        </div>
                                    );

                                case "orgUnit":
                                    return (
                                        <div key={c.key}
                                             className="min-w-0 text-[12.5px] text-[#55617a] whitespace-nowrap overflow-hidden text-ellipsis">
                                            {u.orgUnit?.titleRu ?? "—"}
                                        </div>
                                    );

                                case "roles":
                                    return (
                                        <div key={c.key} className="flex flex-wrap gap-1.5">
                                            {u.roles.length === 0 ? (
                                                <span className="text-[12px] text-[#c2c9d6]">—</span>
                                            ) : (
                                                u.roles.map((r) => (
                                                    <span key={r.id}
                                                          className="text-[10.5px] font-semibold text-[#3a4560] bg-[#eef2f7] px-2 py-[2px] rounded-full whitespace-nowrap">
                                                        {r.titleRu}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    );

                                case "source":
                                    return (
                                        <div key={c.key}>
                                            <span
                                                className={`text-[11px] font-semibold px-[10px] py-[3px] rounded-full whitespace-nowrap ${SOURCE_STYLE[u.source]}`}
                                            >
                                                {SOURCE_LABEL[u.source]}
                                            </span>
                                        </div>
                                    );

                                case "status":
                                    return (
                                        <div key={c.key}>
                                            {u.isBlocked ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span
                                                        className="text-[10.5px] font-semibold px-[9px] py-[2px] rounded-full text-[#c0392b] bg-[#fdeceb] w-fit">
                                                        Заблокирован
                                                    </span>
                                                    <span className="text-[10px] text-[#a3adbd]"
                                                          title={u.blockReason ?? undefined}>
                                                        {formatDateTime(u.blockedAt)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span
                                                    className="text-[10.5px] font-semibold px-[9px] py-[2px] rounded-full text-[#1a8a5f] bg-[#e5f7ee]">
                                                    Активен
                                                </span>
                                            )}
                                        </div>
                                    );

                                case "createdAt":
                                    return (
                                        <div key={c.key} className="text-[12px] text-[#55617a] whitespace-nowrap">
                                            {formatDateTime(u.createdAt) || "—"}
                                        </div>
                                    );

                                case "lastLoginAt":
                                    return (
                                        <div key={c.key} className="text-[12px] text-[#55617a] whitespace-nowrap">
                                            {formatDateTime(u.lastLoginAt) || "—"}
                                        </div>
                                    );

                                case "actions":
                                    return (
                                        <div key={c.key} className="flex-none flex items-center justify-end gap-1">
                                            <Tooltip content="Редактировать" side="top">
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(u)}
                                                    className="w-7 h-7 grid place-items-center rounded-md bg-[#ececfc] text-[#4e57d6] cursor-pointer transition-colors hover:bg-[#dcdefa] hover:text-[#3a42b8]"
                                                >
                                                    <Pencil className="w-[13px] h-[13px]" strokeWidth={2}/>
                                                </button>
                                            </Tooltip>

                                            <Tooltip content={u.isBlocked ? "Разблокировать" : "Заблокировать"}
                                                     side="top">
                                                <button
                                                    type="button"
                                                    onClick={() => (u.isBlocked ? onUnblock(u) : onBlock(u))}
                                                    className={
                                                        u.isBlocked
                                                            ? "w-7 h-7 grid place-items-center rounded-md bg-[#fdeceb] text-[#c0392b] cursor-pointer transition-colors hover:bg-[#fad9d7] hover:text-[#a52d21]"
                                                            : "w-7 h-7 grid place-items-center rounded-md bg-[#eef1f5] text-[#8b97ab] cursor-pointer transition-colors hover:bg-[#e2e6ec] hover:text-[#55617a]"
                                                    }
                                                >
                                                    {u.isBlocked
                                                        ? <Lock className="w-[13px] h-[13px]" strokeWidth={2}/>
                                                        : <Unlock className="w-[13px] h-[13px]" strokeWidth={2}/>}
                                                </button>
                                            </Tooltip>
                                        </div>
                                    );

                                default:
                                    return <div key={c.key}/>;
                            }
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}