// Включённые условия фильтра в виде "чипсов": видно, что именно отфильтровано,
// и каждое можно снять
import {X} from "lucide-react";

export interface ActiveFilterChip {
    key: string;
    label: string;
    onRemove: () => void;
}

interface Props {
    chips: ActiveFilterChip[];
    /** Подпись слева: "Активные фильтры" */
    label: string;
    /** Подсказка и aria-label крестика на чипсе */
    removeLabel: string;
}

export function ActiveFilterChips({chips, label, removeLabel}: Props) {
    if (chips.length === 0) return null;

    return (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">{label}</span>
            {chips.map((chip) => (
                <span
                    key={chip.key}
                    className="inline-flex h-7 max-w-[360px] items-center gap-1 rounded-full border border-[#cbddff] bg-[#f3f7ff] pl-3 pr-1 text-[12.5px] font-semibold text-[#2f68f5]"
                >
                    <span className="truncate">{chip.label}</span>
                    <button
                        type="button"
                        onClick={chip.onRemove}
                        title={removeLabel}
                        aria-label={`${removeLabel}: ${chip.label}`}
                        className="grid h-5 w-5 flex-none cursor-pointer place-items-center rounded-full border-none bg-transparent text-[#2f68f5] transition-colors hover:bg-[#2f68f5] hover:text-white"
                    >
                        <X className="h-3 w-3" strokeWidth={2.5}/>
                    </button>
                </span>
            ))}
        </div>
    );
}
