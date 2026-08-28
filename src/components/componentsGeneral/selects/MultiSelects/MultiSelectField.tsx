// Может выводить и модалку с деревом с множественным выбором и плоский список (множественный выбор)
import {useLayoutEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, X} from "lucide-react";
import {MultiSelectModal} from "./MultiSelectModal.tsx";
import {TreeMultiSelectModal, type TreeSelectOption} from "./TreeMultiSelectModal.tsx";
import { Tooltip } from "../../Tooltip.tsx";

interface SelectListFieldProps {
    label?: string;
    modalTitle: string;
    options: TreeSelectOption[];
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    searchPlaceholder?: string;
    selectedCountLabel?: string;
    hierarchical?: boolean;
    boldLabel?: boolean;
    required?: boolean;
    showChevron?: boolean;
}

const MAX_VISIBLE_CHIPS = 5;

function PillLabel({label}: { label: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
        check();

        // на случай если ширина поля меняется (ресайз, адаптив)
        const observer = new ResizeObserver(check);
        observer.observe(el);
        return () => observer.disconnect();
    }, [label]);

    return (
        // min-w-0 на самой обёртке Tooltip обязателен: без него flex-item по умолчанию не
        // сжимается уже её content (min-width: auto), и truncate у span ниже просто не срабатывает -
        // чипс вылезает за пределы узкой колонки фильтра вместо обрезания текста с многоточием.
        <Tooltip content={label} disabled={!isTruncated} side="top" className="min-w-0 max-w-full">
            <span
                ref={ref}
                className="block truncate min-w-0 max-w-full hover:underline cursor-pointer"
            >
                {label}
            </span>
        </Tooltip>
    );
}

export function MultiSelectField({
                                     label,
                                     modalTitle,
                                     options = [],
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

    // Чтобы поле не растягивалось на весь экран при большом количестве выбранных пунктов,
    // показываем не больше MAX_VISIBLE_CHIPS чипсов, а остальные сворачиваем в "+N" с тултипом.
    const visibleOptions = selectedOptions.slice(0, MAX_VISIBLE_CHIPS);
    const hiddenOptions = selectedOptions.slice(MAX_VISIBLE_CHIPS);

    const removeOne = (key: string) => {
        onChange(selectedKeys.filter((k) => k !== key));
    };

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
                        {allSelected ? (
                            <span
                                className="inline-flex items-center pl-[9px] pr-[9px] py-[3px] rounded-full bg-[#ececfc] text-[12px] text-[#4e57d6] font-semibold">
                                {t("general.selectAll")}
                            </span>
                        ) : (
                            <>
                                {visibleOptions.map((o) => (
                                    <span
                                        key={o.key}
                                        className="inline-flex min-w-0 max-w-full items-center gap-[6px] pl-[9px] pr-[6px] py-[3px] rounded-full bg-[#f2f5f9] text-[12px] text-[#3a4560] font-medium"
                                    >
        <PillLabel label={o.label}/>
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
                                {hiddenOptions.length > 0 && (
                                    <Tooltip
                                        content={hiddenOptions.map((o) => o.label).join(", ")}
                                        side="top"
                                    >
                                        <span
                                            className="inline-flex flex-none cursor-default items-center px-[9px] py-[3px] rounded-full bg-[#ececfc] text-[12px] font-semibold text-[#4e57d6]"
                                        >
                                            +{hiddenOptions.length}
                                        </span>
                                    </Tooltip>
                                )}
                            </>
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