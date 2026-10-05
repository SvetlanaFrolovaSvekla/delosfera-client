/**
 * Доска обязательств по стадии текущего периода (ПР-1). Реестр отвечает «какие
 * обязательства есть», доска — «что горит прямо сейчас»: ожидает, просрочено,
 * исполнено, снято. Неактивные не показываем.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {ArrowLeft} from "lucide-react";
import {
    obligationsService, PERIODICITY_TITLE, type ObligationBoardColumn,
} from "@/service/obligationsService/obligationsService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Badge} from "@/components/componentsGeneral/DataTable.tsx";


/** Цвет заголовка колонки по стадии — тревожные слева ярче. */
const COLUMN_TONE: Record<string, string> = {
    Pending: "#4e57d6",
    Missed: "#c0392b",
    Fulfilled: "#1f9268",
    Waived: "#8b97ab",
};

/** Сервер отдаёт название периодичности русской строкой - по ней находим код и переводим. */
function periodicityCode(title: string): string | null {
    return Object.entries(PERIODICITY_TITLE).find(([, value]) => value === title)?.[0] ?? null;
}

export function ObligationsBoardPage() {
    const {t, i18n} = useTranslation();
    const dateLocale = i18n.language === "en" ? "en-GB" : "ru-RU";
    const dueLabel = (due: string | null) =>
        due ? new Date(due).toLocaleDateString(dateLocale) : t("obligations.board.noDue");

    const [columns, setColumns] = useState<ObligationBoardColumn[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        obligationsService.board()
            .then(setColumns)
            .catch(() => setError(t("obligations.board.error")));
    }, [t]);

    const total = columns?.reduce((s, c) => s + c.count, 0) ?? 0;
    const overdue = columns?.find(c => c.code === "Missed")?.count ?? 0;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("obligations.board.title")}
                description={
                    t("obligations.board.description") +
                    (columns ? ` · ${t("obligations.board.total", {count: total})}` : "") +
                    (overdue > 0 ? ` · ${t("obligations.board.missed", {count: overdue})}` : "")
                }
                actions={
                    <Link
                        to="/obligations"
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border border-[#e5e9f0] bg-white text-[13px] font-semibold text-[#3a4560] no-underline hover:bg-[#f6f8fb]"
                    >
                        <ArrowLeft className="w-[17px] h-[17px]" strokeWidth={2}/>
                        {t("obligations.board.back")}
                    </Link>
                }
            />

            {error && (
                <EmptyState variant="error" title={t("obligations.board.errorTitle")} description={error}/>
            )}
            {!columns && !error && <Loader label={t("obligations.board.loading")}/>}

            {columns && (
                <div className="flex gap-3 overflow-x-auto pb-3" style={{scrollbarWidth: "thin"}}>
                    {columns.map(col => (
                        <div key={col.code}
                             className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-[#e9edf3] bg-[#f6f8fb]">
                            <div className="flex items-center justify-between border-b border-[#e9edf3] px-4 py-3">
                                <span className="text-[13px] font-bold" style={{color: COLUMN_TONE[col.code] ?? "#0f1b2d"}}>
                                    {t(`obligations.periodStatus.${col.code}`)}
                                </span>
                                <Badge>{col.count}</Badge>
                            </div>

                            <div className="flex min-h-[60px] flex-col gap-2 p-2.5">
                                {col.items.length === 0 && (
                                    <div className="py-4 text-center text-[12px] text-[#a3adbd]">{t("obligations.board.empty")}</div>
                                )}
                                {col.items.map(it => (
                                    <div
                                        key={it.id}
                                        className={`block rounded-xl border p-3 ${
                                            it.isOverdue ? "border-[#f2c9c2] bg-[#fdf6f5]" : "border-[#e9edf3] bg-white"
                                        }`}
                                    >
                                        <div className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-[#1c2740]">
                                            {it.title}
                                        </div>
                                        <div className="mt-1.5 flex items-baseline justify-between gap-2">
                                            <span className="text-[11px] text-[#8b97ab]">
                                                {periodicityCode(it.periodicityTitle)
                                                    ? t(`obligations.periodicity.${periodicityCode(it.periodicityTitle)}`)
                                                    : it.periodicityTitle}
                                            </span>
                                            <span className="whitespace-nowrap font-mono text-[11px] font-semibold"
                                                  style={{color: it.isOverdue ? "#c0392b" : "#a3adbd"}}>
                                                {dueLabel(it.dueDate)}
                                            </span>
                                        </div>
                                        {it.responsible && (
                                            <div className="mt-1 truncate text-[11px] text-[#8b97ab]">{it.responsible}</div>
                                        )}
                                        {it.missedCount > 0 && (
                                            <div className="mt-1 text-[11px] font-semibold text-[#c0392b]">
                                                {t("obligations.board.missedHistory", {count: it.missedCount})}
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
