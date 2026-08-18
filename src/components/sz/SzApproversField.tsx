import {useMemo, useRef, useState} from "react";
import {Check, ChevronDown, ChevronUp, Search, X} from "lucide-react";

export interface ApproverOption {
    id: number;
    fullName: string;

    /** Должность и подразделение — по ним отличают однофамильцев. */
    position?: string | null;
    orgUnit?: string | null;
}

interface Props {
    /** Выбранные согласующие: порядок в массиве и есть очерёдность маршрута. */
    value: number[];
    onChange: (userIds: number[]) => void;
    users: ApproverOption[];
    parallel: boolean;
    onParallelChange: (parallel: boolean) => void;
    editable: boolean;
}

/**
 * Состав согласующих записки.
 *
 * Выбор множественный: согласующих обычно назначают пачкой — руководитель, юрист,
 * бухгалтер, — и добавлять их по одному из списка в полтысячи человек значит
 * пять раз пройти один и тот же путь. Поэтому список с поиском и отметками:
 * нашёл, отметил нужных, закрыл.
 *
 * Порядок задаётся стрелками, а не порядком выбора: при последовательном
 * согласовании от него зависит, кто получит записку первым, и переставлять людей
 * должно быть можно, не собирая список заново.
 */
export function SzApproversField({
    value, onChange, users, parallel, onParallelChange, editable,
}: Props) {
    const [открыт, setОткрыт] = useState(false);
    const [поиск, setПоиск] = useState("");
    const область = useRef<HTMLDivElement>(null);

    const byId = useMemo(
        () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<number, ApproverOption>,
        [users]);

    const найденные = useMemo(() => {
        const q = поиск.trim().toLowerCase();
        if (!q) return users;

        return users.filter((u) =>
            u.fullName.toLowerCase().includes(q) ||
            (u.position ?? "").toLowerCase().includes(q) ||
            (u.orgUnit ?? "").toLowerCase().includes(q));
    }, [users, поиск]);

    const переключить = (id: number) =>
        onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

    const move = (index: number, delta: number) => {
        const next = [...value];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    /**
     * Закрываем список, когда фокус ушёл наружу. Проверяем через relatedTarget:
     * клик по строке списка тоже уводит фокус, и закрытие по любому blur не дало
     * бы отметить второго человека — список схлопывался бы после первого.
     */
    const наПотереФокуса = (e: React.FocusEvent<HTMLDivElement>) => {
        if (!область.current?.contains(e.relatedTarget as Node)) setОткрыт(false);
    };

    return (
        <div className="mt-4">
            <div className="flex items-baseline justify-between mb-[5px]">
                <span className="block text-[11.5px] text-[#8b97ab]">
                    Согласующие{value.length > 0 && `: ${value.length}`}
                </span>
                {editable && (
                    <label className="flex items-center gap-2 text-[12.5px] text-[#55617a]">
                        <input type="checkbox" checked={parallel}
                               onChange={(e) => onParallelChange(e.target.checked)}/>
                        Согласовать параллельно
                    </label>
                )}
            </div>

            {editable && (
                <div className="relative" ref={область} onBlur={наПотереФокуса}>
                    <button
                        type="button"
                        onClick={() => setОткрыт(!открыт)}
                        className="flex h-10 w-full items-center justify-between rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#55617a] outline-none focus:border-[#2f68f5]"
                    >
                        <span>Выбрать согласующих</span>
                        <ChevronDown size={15} className={открыт ? "rotate-180 transition" : "transition"}/>
                    </button>

                    {открыт && (
                        <div className="absolute z-20 mt-1 w-full rounded-[10px] border border-[#e5e9f0] bg-white shadow-lg">
                            <label className="relative flex items-center border-b border-[#eef2f7] px-3">
                                <Search size={14} className="pointer-events-none absolute left-3 text-[#a3adbd]"/>
                                <input
                                    autoFocus
                                    value={поиск}
                                    onChange={(e) => setПоиск(e.target.value)}
                                    placeholder="Поиск по ФИО, должности, подразделению"
                                    className="h-10 w-full border-none bg-transparent pl-6 text-[13px] outline-none"
                                />
                            </label>

                            <div className="max-h-[280px] overflow-y-auto p-1">
                                {найденные.length === 0 ? (
                                    <p className="m-0 px-3 py-5 text-center text-[12.5px] text-[#a6b0c2]">
                                        Никого не нашлось
                                    </p>
                                ) : найденные.map((u) => {
                                    const выбран = value.includes(u.id);

                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => переключить(u.id)}
                                            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-none px-2.5 py-2 text-left ${
                                                выбран ? "bg-[#eaf0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                                        >
                                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                                                выбран
                                                    ? "border-[#2f68f5] bg-[#2f68f5]"
                                                    : "border-[#c8d2e0] bg-white"}`}>
                                                {выбран && <Check size={11} className="text-white" strokeWidth={3}/>}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate text-[13px] ${
                                                    выбран ? "font-semibold text-[#2f68f5]" : "text-[#1c2740]"}`}>
                                                    {u.fullName}
                                                </span>
                                                {(u.position || u.orgUnit) && (
                                                    <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                        {[u.position, u.orgUnit].filter(Boolean).join(" · ")}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between border-t border-[#eef2f7] px-3 py-2">
                                <span className="text-[11.5px] text-[#8b97ab]">
                                    Отмечено: {value.length}
                                </span>
                                <button type="button" onClick={() => setОткрыт(false)}
                                        className="h-8 rounded-[8px] border-none bg-[#2f68f5] px-3.5 text-[12.5px] font-semibold text-white">
                                    Готово
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {value.length === 0 ? (
                <div className="mt-2 text-[12.5px] text-[#a6b0c2]">
                    Согласующие не выбраны — записку нельзя отправить на согласование
                </div>
            ) : (
                <div className="mt-2 flex flex-col gap-1.5">
                    {value.map((id, i) => (
                        <div key={id}
                             className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px]">
                            {!parallel && (
                                <span className="w-5 text-[11.5px] font-semibold text-[#8b97ab]">{i + 1}</span>
                            )}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[#1c2740]">
                                    {byId[id]?.fullName ?? `Пользователь № ${id}`}
                                </span>
                                {byId[id]?.position && (
                                    <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                        {byId[id].position}
                                    </span>
                                )}
                            </span>

                            {editable && !parallel && (
                                <>
                                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                                            title="Выше"
                                            className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#2f68f5] disabled:opacity-30">
                                        <ChevronUp size={14}/>
                                    </button>
                                    <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1}
                                            title="Ниже"
                                            className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#2f68f5] disabled:opacity-30">
                                        <ChevronDown size={14}/>
                                    </button>
                                </>
                            )}
                            {editable && (
                                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))}
                                        title="Убрать"
                                        className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#c0392b]">
                                    <X size={14}/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
