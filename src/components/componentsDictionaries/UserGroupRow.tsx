// Одна строка справочника групп пользователей - показывает кол-во участников
import {Pencil, Trash2, Users} from "lucide-react";
import {useTranslation} from "react-i18next";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import type {UserGroupResponse} from "@/service/dictionariesService/userGroupService/userGroupServiceType.ts";

interface UserGroupRowProps {
    item: UserGroupResponse;
    query: string;
    canManage: boolean;
    onEdit: (item: UserGroupResponse) => void;
    onDelete: (item: UserGroupResponse) => void;
}

export function UserGroupRow({item, query, canManage, onEdit, onDelete}: UserGroupRowProps) {
    const {t} = useTranslation();

    return (
        <div className="group flex items-stretch rounded-lg hover:bg-[#f6f8fb]">
            <div className="flex-1 min-w-0 flex items-center gap-[7px] py-[9px] pl-2.5 pr-2.5">
                <span className="flex-1 min-w-0 text-[13.5px] text-[#26324a] truncate">
                    <HighlightText text={item.titleRu} query={query}/>
                </span>

                <span className="flex-none inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-[#f2f5f9] text-[#8b97ab] text-[11.5px] font-medium">
                    <Users className="w-[12px] h-[12px]" strokeWidth={2}/>
                    {item.users.length}
                </span>

                {canManage && (
                    <div className="flex-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip content={t("dictionaries.editAction")} side="top">
                            <button
                                type="button"
                                onClick={() => onEdit(item)}
                                className="w-7 h-7 grid place-items-center rounded-md bg-[#ececfc] text-[#4e57d6] cursor-pointer transition-colors hover:bg-[#dcdefa] hover:text-[#3a42b8]"
                            >
                                <Pencil className="w-[13px] h-[13px]" strokeWidth={2}/>
                            </button>
                        </Tooltip>

                        <Tooltip content={t("dictionaries.deleteAction")} side="top">
                            <button
                                type="button"
                                onClick={() => onDelete(item)}
                                className="w-7 h-7 grid place-items-center rounded-md bg-[#fdeceb] text-[#c0392b] cursor-pointer transition-colors hover:bg-[#fad9d7] hover:text-[#a52d21]"
                            >
                                <Trash2 className="w-[13px] h-[13px]" strokeWidth={2}/>
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
        </div>
    );
}