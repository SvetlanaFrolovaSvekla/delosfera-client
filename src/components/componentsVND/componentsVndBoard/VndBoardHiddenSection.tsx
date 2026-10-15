// "Убрано с доски": связанные с СП документы, которые пользователь скрыл. Свёрнуто по умолчанию —
// это служебный список, нужен только чтобы вернуть случайно убранное.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {ChevronDown, CornerUpLeft, EyeOff} from "lucide-react";

import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

interface VndBoardHiddenSectionProps {
    items: VndResponse[];
    busyIds: Set<number>;
    onRestore: (vnd: VndResponse) => void;
}

export function VndBoardHiddenSection({items, busyIds, onRestore}: VndBoardHiddenSectionProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    if (items.length === 0) return null;

    return (
        <section className="mt-5 rounded-2xl border border-[#e9edf3] bg-white">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 rounded-2xl border-none bg-transparent px-5 py-3.5 text-left cursor-pointer hover:bg-[#fafbfd]"
            >
                <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#f2f5f9] text-[#8b97ab]">
                    <EyeOff className="h-4 w-4" strokeWidth={2}/>
                </span>
                <span className="flex-1">
                    <span className="block text-[13.5px] font-semibold text-[#26324a]">
                        {t("vndBoard.hidden.title", {count: items.length})}
                    </span>
                    <span className="block text-[12px] text-[#8b97ab]">{t("vndBoard.hidden.description")}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-[#8b97ab] transition-transform ${open ? "rotate-180" : ""}`}
                             strokeWidth={2}/>
            </button>

            {open && (
                <ul className="m-0 list-none border-t border-[#eef2f7] px-3 py-2">
                    {items.map((vnd) => (
                        <li key={vnd.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f7f9fc]">
                            <Link to={`/base-vnd/${vnd.id}`} className="min-w-0 flex-1 no-underline">
                                <span className="mr-2 font-mono text-[12px] font-semibold text-[#4e57d6]">{vnd.code}</span>
                                <span className="text-[13px] text-[#55617a]">{vnd.name}</span>
                            </Link>
                            <button
                                type="button"
                                disabled={busyIds.has(vnd.id)}
                                onClick={() => onRestore(vnd)}
                                className="inline-flex h-8 flex-none items-center gap-1.5 rounded-lg border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] disabled:cursor-wait disabled:opacity-60"
                            >
                                <CornerUpLeft className="h-3.5 w-3.5" strokeWidth={2.2}/>
                                {t("vndBoard.actions.restore")}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
