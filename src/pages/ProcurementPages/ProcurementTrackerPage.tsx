import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {procurementService, type TrackerColumn} from "@/service/procurementService/procurementService.ts";

/**
 * Доска закупок по стадиям (ЗК-11). Реестр отвечает «какие заявки есть», доска — «на
 * какой стадии каждая и где затор»: колонки по жизненному циклу, карточки заявок,
 * подсветка зависших. Отклонённые и отменённые не показываем — доска про работу.
 */

const money = (v: number) => v.toLocaleString("ru-RU");

function ageLabel(days: number): string {
    if (days === 0) return "сегодня";
    if (days === 1) return "1 день";
    if (days < 5) return `${days} дня`;
    return `${days} дней`;
}

export function ProcurementTrackerPage() {
    const [columns, setColumns] = useState<TrackerColumn[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        procurementService.tracker()
            .then(setColumns)
            .catch(() => setError("Не удалось загрузить доску закупок"));
    }, []);

    const total = columns?.reduce((s, c) => s + c.count, 0) ?? 0;
    const stale = columns?.reduce((s, c) => s + c.items.filter(i => i.isStale).length, 0) ?? 0;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Доска закупок</h1>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        Активные заявки по стадиям
                        {columns && ` · всего ${total}`}
                        {stale > 0 && ` · зависло ${stale}`}
                    </div>
                </div>
                <Link to="/prc" className="text-[13px] font-semibold text-[#2f68f5] no-underline hover:underline">
                    ← Реестр закупок
                </Link>
            </div>

            {error && <div className="text-[13px] text-[#c0392b]">{error}</div>}
            {!columns && !error && <div className="text-[13px] text-[#8b97ab]">Загрузка…</div>}

            {columns && (
                <div className="flex gap-3 overflow-x-auto pb-3" style={{scrollbarWidth: "thin"}}>
                    {columns.map(col => (
                        <div key={col.code} className="shrink-0 w-[280px] rounded-[13px] bg-[#f6f8fb] border border-[#e5e9f0] flex flex-col">
                            <div className="px-3.5 py-3 border-b border-[#e5e9f0]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] font-bold text-[#0f1b2d]">{col.title}</span>
                                    <span className="text-[12px] font-bold text-[#55617a] bg-white border border-[#e5e9f0] rounded-full px-2 py-0.5">
                                        {col.count}
                                    </span>
                                </div>
                                {col.totalAmount > 0 && (
                                    <div className="mt-1 text-[11.5px] text-[#8b97ab]">{money(col.totalAmount)} сом</div>
                                )}
                            </div>

                            <div className="p-2.5 flex flex-col gap-2 min-h-[60px]">
                                {col.items.length === 0 && (
                                    <div className="text-[12px] text-[#a3adbd] text-center py-4">пусто</div>
                                )}
                                {col.items.map(it => (
                                    <Link
                                        key={it.id}
                                        to={`/prc/${it.id}`}
                                        className="block rounded-[10px] bg-white border border-[#e9edf3] p-3 no-underline hover:border-[#c9d6f5]"
                                        style={it.isStale ? {borderLeft: "3px solid #e0a23c"} : undefined}
                                    >
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="font-mono text-[11.5px] text-[#2f68f5]">{it.regNumber ?? "черновик"}</span>
                                            <span className="text-[11px] font-semibold whitespace-nowrap"
                                                  style={{color: it.isStale ? "#b3730a" : "#a3adbd"}}>
                                                {ageLabel(it.ageDays)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[12.5px] font-medium text-[#1c2740] leading-snug line-clamp-2">
                                            {it.subject}
                                        </div>
                                        <div className="mt-1.5 text-[12px] font-semibold text-[#0f1b2d]">{money(it.amount)} сом</div>
                                        <div className="mt-1 text-[11px] text-[#8b97ab] truncate">
                                            {it.initiatorUnit ?? "—"}
                                            {it.curatorName && ` · ${it.curatorName}`}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
