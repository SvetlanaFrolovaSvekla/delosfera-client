// Выпадающий список "Тип связи" для фильтра "Только связанные со мной" - в отличие от
// обычного MultiSelectDropdown, пункты сгруппированы по смыслу (согласование/актуализация/
// консолидация/инициатива) и каждая группа выделена лёгкой подложкой цвета соответствующей
// "таблетки" статуса последней редакции (см. LINKED_TO_ME_RELATION_GROUPS).
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, ChevronDown} from "lucide-react";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import {LINKED_TO_ME_RELATION_GROUPS, type LinkedToMeRelationKey} from "@/constants/linkedToMeRelations.ts";

interface LinkedToMeRelationDropdownProps {
    selectedKeys: string[];
    onToggle: (key: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    triggerLabel: string;
}

// Лёгкая подложка под блок группы — цвет группы с низкой непрозрачностью (hex alpha).
const GROUP_BG_ALPHA = "14"; // ~8%

export function LinkedToMeRelationDropdown({
                                               selectedKeys,
                                               onToggle,
                                               onSelectAll,
                                               onDeselectAll,
                                               triggerLabel,
                                           }: LinkedToMeRelationDropdownProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useClickOutside(rootRef, open, () => setOpen(false));

    const allKeys: LinkedToMeRelationKey[] = LINKED_TO_ME_RELATION_GROUPS.flatMap((g) => g.options.map((o) => o.key));
    const allSelected = selectedKeys.length === allKeys.length;
    const noneSelected = selectedKeys.length === 0;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                    open
                        ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                        : "border-[#e5e9f0] bg-white"
                }`}
            >
                {triggerLabel}
                <ChevronDown
                    className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`}
                    strokeWidth={2}
                />
            </button>

            {open && (
                <div
                    style={{width: "300px"}}
                    className="absolute top-[42px] right-0 z-30 bg-white border border-[#e5e9f0] rounded-xl shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)] overflow-hidden"
                >
                    <div className="px-2.5 pt-2 pb-1.5">
                        <span className="block text-[10.5px] font-bold tracking-[.05em] uppercase text-[#a3adbd] mb-1.5">
                            Тип связи со мной
                        </span>
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onSelectAll}
                                disabled={allSelected}
                                className={`text-[11px] font-semibold cursor-pointer ${
                                    allSelected ? "text-[#c3ccd8] cursor-default" : "text-[#4e57d6] hover:underline"
                                }`}
                            >
                                {t("general.selectAll")}
                            </button>
                            <button
                                type="button"
                                onClick={onDeselectAll}
                                disabled={noneSelected}
                                className={`text-[11px] font-semibold cursor-pointer ${
                                    noneSelected ? "text-[#c3ccd8] cursor-default" : "text-[#4e57d6] hover:underline"
                                }`}
                            >
                                {t("general.deselectAll")}
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[340px] overflow-y-auto p-1">
                        {LINKED_TO_ME_RELATION_GROUPS.map((group) => (
                            <div key={group.title} className="mb-1 last:mb-0">
                                <div className="px-2.5 pt-2 pb-1">
                                    <span
                                        className="text-[10.5px] font-bold tracking-[.04em] uppercase"
                                        style={{color: group.color}}
                                    >
                                        {group.title}
                                    </span>
                                </div>

                                <div
                                    className="rounded-lg overflow-hidden"
                                    style={{background: `${group.color}${GROUP_BG_ALPHA}`}}
                                >
                                    {group.options.map((o) => {
                                        const on = selectedKeys.includes(o.key);
                                        return (
                                            <button
                                                key={o.key}
                                                type="button"
                                                onClick={() => onToggle(o.key)}
                                                className="w-full flex items-center gap-[11px] px-2.5 py-[9px] bg-transparent text-left cursor-pointer hover:bg-black/[.03]"
                                            >
                                            <span
                                                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                                                style={{
                                                    borderColor: on ? "#4e57d6" : "#cbd3df",
                                                    background: on ? "#4e57d6" : "white",
                                                }}
                                            >
                                                <Check
                                                    className="w-[13px] h-[13px] text-white"
                                                    strokeWidth={3}
                                                    style={{opacity: on ? 1 : 0}}
                                                />
                                            </span>
                                                <span className="text-[13px] text-[#3a4560]">
                                                {o.label}
                                            </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}