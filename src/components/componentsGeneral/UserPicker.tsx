import {useMemo, useRef, useState} from "react";
import {Check, ChevronDown, Search, X} from "lucide-react";
import {useClickOutside} from "@/hooks/useClickOutside.ts";

/**
 * Выбор сотрудника поиском.
 *
 * В банке около тысячи человек: выпадающий список из тысячи строк не листают,
 * в нём ищут глазами и ошибаются. Здесь ищут по фамилии, должности или
 * подразделению — тому, что человек помнит о коллеге.
 *
 * Порядок в списке значим для согласующих: Положение и практика ведут визу
 * сверху вниз — Правление, затем руководитель, затем остальные. Поэтому список
 * не алфавитный, а по старшинству; внутри группы — по алфавиту.
 */

export interface PickableUser {
    id: number;
    fullName: string;
    position?: string | null;
    orgUnit?: string | null;
    orgUnitId?: number | null;
    /** Член Правления — идёт первым в подборе. */
    isBoardMember?: boolean;
    /** Руководит подразделением — идёт вторым. */
    isUnitHead?: boolean;
}

interface Props {
    users: PickableUser[];
    value: number | null;
    onChange: (user: PickableUser | null) => void;
    disabled?: boolean;
    placeholder?: string;
    /** Разрешить очистку выбора. */
    clearable?: boolean;
    /** Сортировать по старшинству — для подбора согласующих и подписанта. */
    bySeniority?: boolean;
}

/** Старшинство: Правление → руководители → остальные. */
export function seniority(u: PickableUser): number {
    if (u.isBoardMember) return 0;
    if (u.isUnitHead) return 1;
    return 2;
}

export function UserPicker({
    users, value, onChange, disabled, placeholder, clearable = true, bySeniority,
}: Props) {
    const [open, setOpen] = useState(false);
    const [запрос, setЗапрос] = useState("");

    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, open, () => setOpen(false));

    const выбранный = users.find((u) => u.id === value) ?? null;

    const найденные = useMemo(() => {
        const q = запрос.trim().toLowerCase();

        const подходят = q
            ? users.filter((u) =>
                u.fullName.toLowerCase().includes(q)
                || (u.position ?? "").toLowerCase().includes(q)
                || (u.orgUnit ?? "").toLowerCase().includes(q))
            : users;

        if (!bySeniority) return подходят;

        return [...подходят].sort((a, b) =>
            seniority(a) - seniority(b) || a.fullName.localeCompare(b.fullName, "ru"));
    }, [users, запрос, bySeniority]);

    const подпись = (u: PickableUser) =>
        [u.position, u.orgUnit].filter(Boolean).join(" · ");

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className="flex min-h-[38px] w-full items-center gap-2 rounded-[10px] border border-[#e5e9f0]
                           bg-white px-3 py-2 text-left text-[13px] text-[#26324a]
                           disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#8b97ab]"
            >
                <span className="min-w-0 flex-1">
                    {выбранный ? (
                        <>
                            <span className="block truncate">{выбранный.fullName}</span>
                            {подпись(выбранный) && (
                                <span className="mt-0.5 block truncate text-[11.5px] text-[#8b97ab]">
                                    {подпись(выбранный)}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-[#8b97ab]">{placeholder ?? "— не выбрано —"}</span>
                    )}
                </span>

                {выбранный && clearable && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label="Очистить"
                        onClick={(e) => { e.stopPropagation(); onChange(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(null); } }}
                        className="flex-none cursor-pointer text-[#c3cbdb] hover:text-[#8b97ab]"
                    >
                        <X size={14}/>
                    </span>
                )}
                <ChevronDown size={15} className="flex-none text-[#8b97ab]"/>
            </button>

            {open && !disabled && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden
                                rounded-[11px] border border-[#e5e9f0] bg-white shadow-lg">
                    <div className="flex items-center gap-2 border-b border-[#f2f5f9] px-3 py-2.5">
                        <Search size={14} className="flex-none text-[#8b97ab]"/>
                        <input
                            autoFocus
                            value={запрос}
                            onChange={(e) => setЗапрос(e.target.value)}
                            placeholder="Фамилия, должность или подразделение…"
                            className="w-full border-none text-[13px] outline-none"
                        />
                    </div>

                    <div className="max-h-[280px] overflow-y-auto">
                        {найденные.length === 0 && (
                            <div className="px-3.5 py-3 text-[12.5px] text-[#8b97ab]">Никого не нашли</div>
                        )}

                        {найденные.map((u, i) => {
                            const выбран = u.id === value;

                            // Заголовок группы — только когда список по старшинству
                            // и группа началась: иначе порядок читается как случайный.
                            const заголовок = bySeniority
                                && (i === 0 || seniority(найденные[i - 1]) !== seniority(u))
                                ? ["Правление", "Руководители подразделений", "Остальные"][seniority(u)]
                                : null;

                            return (
                                <div key={u.id}>
                                    {заголовок && (
                                        <div className="border-t border-[#f2f5f9] bg-[#fafbfd] px-3.5 pb-1 pt-2
                                                        text-[10.5px] font-bold uppercase tracking-wider text-[#a3adbd]">
                                            {заголовок}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { onChange(u); setOpen(false); setЗапрос(""); }}
                                        className={`flex w-full items-start gap-2 px-3.5 py-2 text-left transition
                                                    hover:bg-[#f6f8fb] ${выбран ? "bg-[#f6f8fb]" : ""}`}
                                    >
                                        <span className="w-4 flex-none pt-0.5 text-[#2f68f5]">
                                            {выбран && <Check size={14}/>}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-[13px] text-[#26324a]">{u.fullName}</span>
                                            {подпись(u) && (
                                                <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                    {подпись(u)}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
