import {useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, X} from "lucide-react";
import {MultiSelectModal} from "./MultiSelectModal.tsx";
import {TreeMultiSelectModal, type TreeSelectOption} from "./TreeMultiSelectModal.tsx";

interface SelectListFieldProps {
    label: string;
    modalTitle: string;
    options: TreeSelectOption[]; // parentId опционален — работает и как плоский список
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    searchPlaceholder?: string;
    selectedCountLabel?: string;
    hierarchical?: boolean; // использовать TreeMultiSelectModal вместо плоского MultiSelectModal
    boldLabel?: boolean;
    required?: boolean;
    showChevron?: boolean; // показывать ли стрелочку-шеврон справа в поле
}

export function SelectListField({
                                    label,
                                    modalTitle,
                                    options,
                                    selectedKeys,
                                    onChange,
                                    searchPlaceholder,
                                    selectedCountLabel,
                                    hierarchical = false,
                                    boldLabel = true,
                                    required = false,
                                    showChevron = true,
                                }: SelectListFieldProps) {
    const {t} = useTranslation();
    const [modalOpen, setModalOpen] = useState(false);

    const selectedOptions = options.filter((o) => selectedKeys.includes(o.key));
    const allSelected = options.length > 0 && selectedKeys.length === options.length;

    const removeOne = (key: string) => {
        onChange(selectedKeys.filter((k) => k !== key));
    };

    return (
        <>
            <div>
                 <span
                     className={
                         boldLabel
                             ? "block text-[12px] font-semibold text-[#3a4560] mb-2"
                             : "block text-[11.5px] text-[#8b97ab] mb-[5px]"
                     }
                 >
                    {label} {required && <span className="text-[#c0392b]">*</span>}
                </span>
                <div
                    onClick={() => setModalOpen(true)}
                    className="w-full min-h-[38px] px-2.5 py-[6px] rounded-[9px] border border-[#e5e9f0] bg-white outline-none box-border cursor-pointer flex items-center gap-[6px] hover:bg-[#f6f8fb]"
                >
                    <div className="flex-1 flex flex-wrap items-center gap-[6px]">
                        {selectedOptions.length === 0 && (
                            <span className="text-[13px] text-[#a3adbd] px-[3px]">
                                {t("general.openList")}
                            </span>
                        )}
                        {allSelected ? (
                            <span
                                className="inline-flex items-center pl-[9px] pr-[9px] py-[3px] rounded-full bg-[#ececfc] text-[12px] text-[#4e57d6] font-semibold">
                                {t("general.selectAll")}
                            </span>
                        ) : (
                            selectedOptions.map((o) => (
                                <span
                                    key={o.key}
                                    className="inline-flex items-center gap-[6px] pl-[9px] pr-[6px] py-[3px] rounded-full bg-[#f2f5f9] text-[12px] text-[#3a4560] font-medium"
                                >
                                    <span className="truncate max-w-[160px] hover:underline cursor-pointer">
                                        {o.label}
                                    </span>
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
                            ))
                        )}
                    </div>
                    {showChevron && (
                        <ChevronDown className="w-[15px] h-[15px] flex-none text-[#a3adbd]" strokeWidth={2}/>
                    )}
                </div>
            </div>

            {hierarchical ? (
                <TreeMultiSelectModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={modalTitle}
                    options={options}
                    selectedKeys={selectedKeys}
                    onApply={onChange}
                    searchPlaceholder={searchPlaceholder}
                    selectedCountLabel={selectedCountLabel}
                />
            ) : (
                <MultiSelectModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={modalTitle}
                    options={options}
                    selectedKeys={selectedKeys}
                    onApply={onChange}
                    searchPlaceholder={searchPlaceholder}
                    selectedCountLabel={selectedCountLabel}
                />
            )}
        </>
    );
}