/**
 * Таблица реестра.
 *
 * Вынесена отдельно, потому что реестров в системе много и все они выглядят
 * одинаково: шапка, строки, горизонтальная прокрутка внутри своей рамки.
 * Прокрутка именно внутри - иначе широкая таблица уводит вбок всю страницу
 * вместе с меню.
 */
import type {ReactNode} from "react";
import type {TFunction} from "i18next";

interface DataTableProps {
    headers: (string | {title: string; align?: "left" | "right"})[];
    children: ReactNode;
}

export function DataTable({headers, children}: DataTableProps) {
    return (
        <div className="overflow-x-auto rounded-[14px] border border-[#e9edf3] bg-white">
            <table className="w-full border-collapse text-[13.5px]">
                <thead>
                <tr>
                    {headers.map((header, index) => {
                        const title = typeof header === "string" ? header : header.title;
                        const align = typeof header === "string" ? "left" : header.align ?? "left";

                        return (
                            <th
                                key={`${title}-${index}`}
                                className={`whitespace-nowrap border-b border-[#eef2f7] bg-[#fafbfd] px-5 py-3
                                            text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]
                                            ${align === "right" ? "text-right" : "text-left"}`}
                            >
                                {title}
                            </th>
                        );
                    })}
                </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

interface RowProps {
    children: ReactNode;
    onClick?: () => void;
    /** Строка требует внимания — просрочка, истекающий срок. */
    alert?: boolean;
}

export function Row({children, onClick, alert}: RowProps) {
    return (
        <tr
            onClick={onClick}
            className={`border-b border-[#f3f6f9] last:border-0 transition
                        ${onClick ? "cursor-pointer hover:bg-[#fbfcfe]" : ""}
                        ${alert ? "bg-[#fdf6f5]" : ""}`}
        >
            {children}
        </tr>
    );
}

interface CellProps {
    children: ReactNode;
    strong?: boolean;
    mono?: boolean;
    align?: "left" | "right";
    /** Не переносить: номера, даты, короткие коды. */
    nowrap?: boolean;
    className?: string;
}

export function Cell({children, strong, mono, align = "left", nowrap, className = ""}: CellProps) {
    return (
        <td
            className={`px-5 py-3 align-top
                        ${mono ? "font-mono text-[12.5px]" : ""}
                        ${nowrap || mono ? "whitespace-nowrap" : ""}
                        ${align === "right" ? "text-right" : ""}
                        ${strong ? "font-semibold text-[#1c2740]" : "text-[#55617a]"}
                        ${className}`}
        >
            {children}
        </td>
    );
}

/** Цвета состояний. Семантика одна на всю систему: зелёное — закрыто, красное — горит. */
export type BadgeTone = "neutral" | "info" | "good" | "warn" | "bad";

const TONE_STYLE: Record<BadgeTone, string> = {
    neutral: "bg-[#eef2f7] text-[#55617a]",
    info: "bg-[#ececfc] text-[#4e57d6]",
    good: "bg-[#e5f7ee] text-[#1a8a5f]",
    warn: "bg-[#fdf3e7] text-[#b3730a]",
    bad: "bg-[#fdeceb] text-[#c0392b]",
};

export function Badge({children, tone = "neutral"}: {children: ReactNode; tone?: BadgeTone}) {
    return (
        <span
            className={`inline-block whitespace-nowrap rounded-full px-[9px] py-[2px]
                        text-[10.5px] font-semibold ${TONE_STYLE[tone]}`}
        >
            {children}
        </span>
    );
}

/** Кнопки фильтра одной строкой. Выбранное подсвечено, остальное — рамкой. */
export function FilterChip({
                               active, onClick, children, count,
                           }: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    count?: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`cursor-pointer rounded-[9px] border px-3 py-1.5 text-[13px] transition
                ${active
                ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                : "border-[#e5e9f0] bg-white/40 text-[#55617a] hover:bg-[#f6f8fb]"}`}
        >
            {children}
            {count !== undefined && count > 0 && (
                <span className="ml-1.5 font-mono text-[12px] opacity-70">{count}</span>
            )}
        </button>
    );
}

/** Дата в привычном виде. Пусто — прочерк, а не пустое место: так видно, что поля нет. */
// eslint-disable-next-line react-refresh/only-export-components
export function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"});
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
}

/**
 * Срок словами: «осталось 3 дня», «сегодня», «просрочено на 5 дней».
 * Число дней само по себе требует счёта в уме, а срок смотрят бегло.
 * Склонения («1 день / 2 дня / 5 дней») берутся из переводов time.days.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function formatDaysLeft(days: number | null | undefined, t: TFunction): string {
    if (days === null || days === undefined) return "—";
    if (days === 0) return t("dataTable.today");
    if (days < 0) return t("time.overdueBy", {time: t("time.days", {count: -days})});
    return t("time.remaining", {time: t("time.days", {count: days})});
}
