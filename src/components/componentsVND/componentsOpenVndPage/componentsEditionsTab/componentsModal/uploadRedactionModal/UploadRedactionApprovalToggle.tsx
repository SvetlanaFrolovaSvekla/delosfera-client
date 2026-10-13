// Чекбокс "Требуется согласование" + роли, которые дают право загрузить редакцию без него
import {useTranslation} from "react-i18next";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {Check} from "lucide-react";

interface UploadRedactionApprovalToggleProps {
    checked: boolean;
    onToggle: () => void;
    grantingRoleNames: string[];
}

export function UploadRedactionApprovalToggle({checked, onToggle, grantingRoleNames}: UploadRedactionApprovalToggleProps) {
    const {t} = useTranslation();

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-2  rounded-[9px]  bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer select-none w-fit"
            >
                <span
                    className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                    style={{
                        borderColor: checked ? "#4e57d6" : "#cbd3df",
                        background: checked ? "#4e57d6" : "white",
                    }}
                >
                    <Check
                        className="w-[13px] h-[13px] text-white"
                        strokeWidth={3}
                        style={{opacity: checked ? 1 : 0}}
                    />
                </span>
                {t("vndUploadRedactionModal.requiresApprovalCheckbox")}
            </button>

            <Clue>
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                    <span>
                        {grantingRoleNames.length === 1
                            ? t("vndUploadRedactionModal.skipApprovalClueRoleSingular")
                            : t("vndUploadRedactionModal.skipApprovalCluePlural")}
                    </span>
                    {grantingRoleNames.map((name) => (
                        <span
                            key={name}
                            className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#ececfc] text-[11.5px] font-semibold text-[#4e57d6] whitespace-nowrap"
                        >
                            {name}
                        </span>
                    ))}
                </span>
            </Clue>
        </>
    );
}
