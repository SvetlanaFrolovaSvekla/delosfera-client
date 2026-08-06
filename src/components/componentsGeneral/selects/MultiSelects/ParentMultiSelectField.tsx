// Триггер + чипы для выбора родительских узлов - использует ParentTreeMultiSelectModal (без каскада)
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, X} from "lucide-react";
import {ParentTreeMultiSelectModal, type ParentTreeOption} from "./ParentTreeMultiSelectModal.tsx";

interface ParentMultiSelectFieldProps {
    label?: string;
    modalTitle: string;
    options: ParentTreeOption[];
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    searchPlaceholder?: string;
    selectedCountLabel?: string;
}

export function ParentMultiSelectField({
                                           label,
                                           modalTitle,
                                           options = [],
                                           selectedKeys,
                                           onChange,
                                           searchPlaceholder,
                                           selectedCountLabel,
                                       }: ParentMultiSelectFieldProps) {
    const {t} = useTranslation();
    const [modalOpen, setModalOpen] = useState(false);

    const selectedOptions = options.filter((o) => selectedKeys.includes(o.key));

    const removeOne = (key: string) => {
        onChange(selectedKeys.filter((k) => k !== key));
    };

    return (
        <div className="min-w-0">
            {label && <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">{label}</span>}
            <div
                onClick={() => setModalOpen(true)}
                className="w-full min-w-0 min-h-[38px] px-2.5 py-[6px] rounded-[9px] border border-[#e5e9f0] bg-white outline-none box-border cursor-pointer flex items-center gap-[6px] hover:bg-[#f6f8fb]"
            >
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-[6px]">
                    {selectedOptions.length === 0 && (
                        <span className="text-[13px] text-[#a3adbd] px-[3px]">
                            {t("general.openList")}
                        </span>
                    )}
                    {selectedOptions.map((o) => (
                        <span
                            key={o.key}
                            className="inline-flex min-w-0 max-w-full items-center gap-[6px] pl-[9px] pr-[6px] py-[3px] rounded-full bg-[#f2f5f9] text-[12px] text-[#3a4560] font-medium"
                        >
                            <span className="truncate min-w-0 max-w-[160px]">{o.label}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeOne(o.key);
                                }}
                                className="w-[16px] h-[16px] flex-none grid place-items-center rounded-full text-[#8b97ab] hover:bg-[#e5e9f0] hover:text-[#55617a] cursor-pointer"
                            >
                                <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                            </button>
                        </span>
                    ))}
                </div>
                <ChevronDown className="w-[15px] h-[15px] flex-none text-[#a3adbd]" strokeWidth={2}/>
            </div>

            <ParentTreeMultiSelectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                options={options}
                selectedKeys={selectedKeys}
                onApply={onChange}
                searchPlaceholder={searchPlaceholder}
                selectedCountLabel={selectedCountLabel}
            />
        </div>
    );
}