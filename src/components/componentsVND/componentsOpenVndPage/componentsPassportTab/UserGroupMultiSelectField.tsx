// Поле выбора "Группы доступа" для карточки ВНД: в окне выбора сверху пояснение, а у каждой
// группы кнопка "?", которая открывает окно со списком участников этой группы.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {CircleHelp, Info} from "lucide-react";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {UserGroupMembersModal} from "@/components/componentsVND/componentsOpenVndPage/componentsPassportTab/UserGroupMembersModal.tsx";

interface UserGroupMultiSelectFieldProps {
    label?: string;
    modalTitle: string;
    options: { key: string; label: string }[];
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    searchPlaceholder?: string;
    boldLabel?: boolean;
}

export function UserGroupMultiSelectField(props: UserGroupMultiSelectFieldProps) {
    const {t} = useTranslation();
    const [membersOf, setMembersOf] = useState<{ id: number; name: string } | null>(null);

    return (
        <>
            <MultiSelectField
                {...props}
                modalHint={
                    <span className="flex items-start gap-2">
                        <Info size={14} className="mt-[2px] flex-none text-[#4e57d6]" strokeWidth={2}/>
                        <span>{t("userGroupAccess.hint")}</span>
                    </span>
                }
                renderOptionAction={(key) => (
                    <Tooltip content={t("userGroupAccess.membersTooltip")} side="left">
                        <button
                            type="button"
                            onClick={() => setMembersOf({
                                id: Number(key),
                                name: props.options.find((o) => o.key === key)?.label ?? "",
                            })}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#a3adbd] hover:bg-[#ececfc] hover:text-[#4e57d6]"
                        >
                            <CircleHelp size={16} strokeWidth={1.9}/>
                        </button>
                    </Tooltip>
                )}
            />
            {membersOf && (
                <UserGroupMembersModal
                    groupId={membersOf.id}
                    groupName={membersOf.name}
                    onClose={() => setMembersOf(null)}
                />
            )}
        </>
    );
}
