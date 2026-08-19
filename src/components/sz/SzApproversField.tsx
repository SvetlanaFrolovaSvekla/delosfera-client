import {useMemo, useState} from "react";
import {ChevronDown, ChevronUp, X} from "lucide-react";

export interface ApproverOption {
    id: number;
    fullName: string;
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

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

/**
 * Состав согласующих записки.
 *
 * Порядок задаётся явно стрелками, а не порядком выбора: при последовательном
 * согласовании от него зависит, кто получит записку первым, и переставлять людей
 * должно быть можно, не собирая список заново.
 */
export function SzApproversField({
    value, onChange, users, parallel, onParallelChange, editable,
}: Props) {
    const [toAdd, setToAdd] = useState("");

    const byId = useMemo(
        () => Object.fromEntries(users.map((u) => [u.id, u.fullName])) as Record<number, string>,
        [users]);

    const available = useMemo(
        () => users.filter((u) => !value.includes(u.id)),
        [users, value]);

    const move = (index: number, delta: number) => {
        const next = [...value];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <div className="mt-4">
            <div className="flex items-baseline justify-between mb-[5px]">
                <span className="block text-[11.5px] text-[#8b97ab]">Согласующие</span>
                {editable && (
                    <label className="flex items-center gap-2 text-[12.5px] text-[#55617a]">
                        <input type="checkbox" checked={parallel}
                               onChange={(e) => onParallelChange(e.target.checked)}/>
                        Согласовать параллельно
                    </label>
                )}
            </div>

            {editable && (
                <select
                    className={inputClass}
                    value={toAdd}
                    onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) onChange([...value, id]);
                        setToAdd("");
                    }}
                >
                    <option value="">Добавить согласующего…</option>
                    {available.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
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
                            <span className="flex-1 truncate text-[#1c2740]">
                                {byId[id] ?? `Пользователь № ${id}`}
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
