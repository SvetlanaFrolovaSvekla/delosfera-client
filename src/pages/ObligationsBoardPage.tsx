import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {obligationsService, type ObligationBoardColumn} from "@/service/obligationsService/obligationsService.ts";

/**
 * Доска обязательств по стадии текущего периода (ПР-1). Реестр отвечает «какие
 * обязательства есть», доска — «что горит прямо сейчас»: ожидает, просрочено,
 * исполнено, снято. Неактивные не показываем.
 */

/** Цвет заголовка колонки по стадии — тревожные слева ярче. */
const COLUMN_TONE: Record<string, string> = {
    Pending: "#4e57d6",
    Missed: "#c0392b",
    Fulfilled: "#1f9268",
    Waived: "#8b97ab",
};

function dueLabel(due: string | null): string {
    if (!due) return "без срока";
    return new Date(due).toLocaleDateString("ru-RU");
}

export function ObligationsBoardPage() {
    const [columns, setColumns] = useState<ObligationBoardColumn[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        obligationsService.board()
            .then(setColumns)
            .catch(() => setError("Не удалось загрузить доску обязательств"));
    }, []);

    const total = columns?.reduce((s, c) => s + c.count, 0) ?? 0;
    const overdue = columns?.find(c => c.code === "Missed")?.count ?? 0;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Доска обязательств</h1>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        Активные обязательства по стадии текущего периода
                        {columns && ` · всего ${total}`}
                        {overdue > 0 && ` · пропущено ${overdue}`}
                    </div>
                </div>
                <Link to="/obligations" className="text-[13px] font-semibold text-[#2f68f5] no-underline hover:underline">
                    ← Реестр обязательств
                </Link>
            </div>

            {error && <div className="text-[13px] text-[#c0392b]">{error}</div>}
            {!columns && !error && <div className="text-[13px] text-[#8b97ab]">Загрузка…</div>}

            {columns && (
                <div className="flex gap-3 overflow-x-auto pb-3" style={{scrollbarWidth: "thin"}}>
                    {columns.map(col => (
                        <div key={col.code} className="shrink-0 w-[280px] rounded-[13px] bg-[#f6f8fb] border border-[#e5e9f0] flex flex-col">
                            <div className="px-3.5 py-3 border-b border-[#e5e9f0] flex items-center justify-between">
                                <span className="text-[13px] font-bold" style={{color: COLUMN_TONE[col.code] ?? "#0f1b2d"}}>
                                    {col.title}
                                </span>
                                <span className="text-[12px] font-bold text-[#55617a] bg-white border border-[#e5e9f0] rounded-full px-2 py-0.5">
                                    {col.count}
                                </span>
                            </div>

                            <div className="p-2.5 flex flex-col gap-2 min-h-[60px]">
                                {col.items.length === 0 && (
                                    <div className="text-[12px] text-[#a3adbd] text-center py-4">пусто</div>
                                )}
                                {col.items.map(it => (
                                    <div
                                        key={it.id}
                                        className={`block rounded-[10px] border p-3 ${
                                            it.isOverdue ? "bg-[#fbeae7] border-[#f0c8c0]" : "bg-white border-[#e9edf3]"
                                        }`}
                                    >
                                        <div className="text-[12.5px] font-medium text-[#1c2740] leading-snug line-clamp-2">
                                            {it.title}
                                        </div>
                                        <div className="mt-1.5 flex items-baseline justify-between gap-2">
                                            <span className="text-[11px] text-[#8b97ab]">{it.periodicityTitle}</span>
                                            <span className="text-[11px] font-semibold whitespace-nowrap"
                                                  style={{color: it.isOverdue ? "#c0392b" : "#a3adbd"}}>
                                                {dueLabel(it.dueDate)}
                                            </span>
                                        </div>
                                        {it.responsible && (
                                            <div className="mt-1 text-[11px] text-[#8b97ab] truncate">{it.responsible}</div>
                                        )}
                                        {it.missedCount > 0 && (
                                            <div className="mt-1 text-[11px] font-semibold text-[#c0392b]">
                                                пропусков за историю: {it.missedCount}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
