// Поле, открывающее модалку с деревом, с одиночным выбором
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown} from "lucide-react";
import {TreeSingleSelectModal, type TreeSelectOption} from "./TreeSingleSelectModal.tsx";

interface SingleSelectListFieldProps {
    label: string;
    modalTitle: string;
    options: TreeSelectOption[]; // parentId опционален - работает и как плоский список
    selectedKey: string | null;
    onChange: (key: string | null) => void;
    searchPlaceholder?: string;
    placeholder?: string; // текст в поле, когда ничего не выбрано
    boldLabel?: boolean;
    required?: boolean;
    showChevron?: boolean; // показывать ли стрелочку-шеврон справа в поле
}

export function SingleSelectListField({
                                          label,
                                          modalTitle,
                                          options = [],
                                          selectedKey,
                                          onChange,
                                          searchPlaceholder,
                                          placeholder,
                                          boldLabel = true,
                                          required = false,
                                          showChevron = true,
                                      }: SingleSelectListFieldProps) {
    const {t} = useTranslation();
    const [modalOpen, setModalOpen] = useState(false);

    const selected = options.find((o) => o.key === selectedKey) ?? null;

    return (
        <>
            <div className="min-w-0">
                <span
                    className={
                        boldLabel
                            ? "block text-[12px] font-semibold text-[#3a4560] mb-2"
                            : "block text-[11.5px] text-[#8b97ab] mb-[5px]"
                    }
                >
                    {label} {required && <span className="text-[#c0392b]">*</span>}
                </span>
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white outline-none box-border cursor-pointer flex items-center justify-between gap-2 hover:bg-[#f6f8fb]"
                >
                    <span className={`truncate text-[13px] ${selected ? "text-[#1c2740]" : "text-[#a3adbd]"}`}>
                        {selected?.label ?? placeholder ?? t("general.openList")}
                    </span>
                    {showChevron && (
                        <ChevronDown className="w-[15px] h-[15px] flex-none text-[#a3adbd]" strokeWidth={2}/>
                    )}
                </button>
            </div>

            <TreeSingleSelectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                options={options}
                selectedKey={selectedKey}
                onSelect={onChange}
                searchPlaceholder={searchPlaceholder}
            />
        </>
    );
}