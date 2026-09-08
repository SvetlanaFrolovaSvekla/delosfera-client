// Поле, открывающее модалку с деревом, с одиночным выбором
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown} from "lucide-react";
import {TreeSingleSelectModal, type TreeSelectOption} from "./TreeSingleSelectModal.tsx";
import {getAncestorPath} from "@/utils/treeSelectUtils.ts";

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
    // Путь от корня до выбранного узла (например, "Правление" -> "Заместитель правления") -
    // показываем его целиком в поле, а не только название самого узла: у плоских справочников
    // (без parentId) путь состоит из одного этого же узла, так что для них ничего не меняется.
    const path = selected ? getAncestorPath(options, selected.key) : [];
    const ancestors = path.slice(0, -1);

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
                    className="w-full min-h-10 px-3 py-[7px] rounded-[9px] border border-[#e5e9f0] bg-white outline-none box-border cursor-pointer flex items-center justify-between gap-2 hover:bg-[#f6f8fb]"
                >
                    {selected ? (
                        <span className="flex min-w-0 flex-1 flex-col items-start gap-[1px] text-left">
                            {ancestors.map((a) => (
                                <span key={a.key} className="truncate w-full text-[11px] text-[#a3adbd]">
                                    {a.label}
                                </span>
                            ))}
                            <span className="truncate w-full text-[13px] text-[#1c2740]">
                                {selected.label}
                            </span>
                        </span>
                    ) : (
                        <span className="truncate text-[13px] text-[#a3adbd]">
                            {placeholder ?? t("general.openList")}
                        </span>
                    )}
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