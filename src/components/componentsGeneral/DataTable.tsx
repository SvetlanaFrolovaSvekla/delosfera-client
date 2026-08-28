import type {ReactNode} from "react";

/**
 * Таблица реестра.
 *
 * Вынесена отдельно, потому что реестров в системе много и все они выглядят
 * одинаково: шапка, строки, горизонтальная прокрутка внутри своей рамки.
 * Прокрутка именно внутри — иначе широкая таблица уводит вбок всю страницу
 * вместе с меню.
 */

interface DataTableProps {
    headers: (string | {title: string; align?: "left" | "right"})[];
    children: ReactNode;
}

export function DataTable({headers, children}: DataTableProps) {
    return (
        <div className="overflow-x-auto rounded-[14px] border border-[#e1e7ef] bg-white">
            <table className="w-full border-collapse text-[13.5px]">
                <thead>
                <tr>
                    {headers.map((header, index) => {
                        const title = typeof header === "string" ? header : header.title;
                        const align = typeof header === "string" ? "left" : header.align ?? "left";

                        return (
                            <th
                                key={`${title}-${index}`}
                                className={`whitespace-nowrap border-b border-[#e1e7ef] bg-[#f7f9fc] px-4 py-2.5
                                            text-[10.5px] font-bold uppercase tracking-wider text-[#8593a8]
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
            className={`border-b border-[#e1e7ef] last:border-0
                        ${onClick ? "cursor-pointer hover:bg-[#f7f9fc]" : ""}
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
            className={`px-4 py-2.5 align-top
                        ${mono ? "font-mono text-[12.5px]" : ""}
                        ${nowrap || mono ? "whitespace-nowrap" : ""}
                        ${align === "right" ? "text-right" : ""}
                        ${strong ? "font-semibold text-[#101a2c]" : "text-[#4d5a72]"}
                        ${className}`}
        >
            {children}
        </td>
    );
}

/** Цвета состояний. Семантика одна на всю систему: зелёное — закрыто, красное — горит. */
export type BadgeTone = "neutral" | "info" | "good" | "warn" | "bad";

const TONE_STYLE: Record<BadgeTone, string> = {
    neutral: "bg-[#eef2f7] text-[#8593a8]",
    info: "bg-[#eaf0ff] text-[#2f68f5]",
    good: "bg-[#e6f4ec] text-[#1c7a4d]",
    warn: "bg-[#fdf3e0] text-[#b3730a]",
    bad: "bg-[#fbeae7] text-[#c0392b]",
};

export function Badge({children, tone = "neutral"}: {children: ReactNode; tone?: BadgeTone}) {
    return (
        <span
            className={`inline-block whitespace-nowrap rounded-[5px] px-2 py-0.5
                        text-[11px] font-semibold uppercase tracking-wide ${TONE_STYLE[tone]}`}
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
            className={`rounded-[9px] border px-3 py-1.5 text-[13px] transition
                ${active
                ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                : "border-[#e1e7ef] text-[#4d5a72] hover:border-[#c3cede]"}`}
        >
            {children}
            {count !== undefined && count > 0 && (
                <span className="ml-1.5 font-mono text-[12px] opacity-70">{count}</span>
            )}
        </button>
    );
}

/** Дата в привычном виде. Пусто — прочерк, а не пустое место: так видно, что поля нет. */
export function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"});
}

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
 * Срок словами: «через 3 дня», «сегодня», «просрочено на 5 дней».
 * Число дней само по себе требует счёта в уме, а срок смотрят бегло.
 */
export function formatDaysLeft(days: number | null | undefined): string {
    if (days === null || days === undefined) return "—";
    if (days === 0) return "сегодня";
    if (days < 0) return `просрочено на ${plural(-days, "день", "дня", "дней")}`;
    return `через ${plural(days, "день", "дня", "дней")}`;
}

function plural(count: number, one: string, few: string, many: string): string {
    const mod100 = count % 100;
    const mod10 = count % 10;

    if (mod100 >= 11 && mod100 <= 14) return `${count} ${many}`;
    if (mod10 === 1) return `${count} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;
    return `${count} ${many}`;
}
