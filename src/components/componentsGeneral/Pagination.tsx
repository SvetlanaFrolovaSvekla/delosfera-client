// Панель страниц под таблицей: "Показано 1-50 из 342", выбор размера страницы и номера страниц
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useTranslation} from "react-i18next";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import type {Accent} from "@/constants/accent.ts";

interface PaginationProps {
    /** Текущая страница, с 1 */
    page: number;
    pageSize: number;
    /** Всего записей по текущему фильтру */
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
    /** Пока грузятся данные - кнопки неактивны, чтобы не плодить запросы */
    disabled?: boolean;
    /** Акцент выпадающего списка размера страницы (по умолчанию фиолетовый, "blue" — для СЗ). */
    accent?: Accent;
}

const DEFAULT_PAGE_SIZES = [25, 50, 100];

/** Номера страниц с многоточиями: 1 … 4 5 [6] 7 8 … 20 */
function buildPageList(page: number, totalPages: number): (number | "gap-left" | "gap-right")[] {
    const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
    if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
    if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => wanted.add(n));

    const sorted = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const result: (number | "gap-left" | "gap-right")[] = [];
    sorted.forEach((n, i) => {
        if (i > 0 && n - sorted[i - 1] > 1) result.push(i === 1 ? "gap-left" : "gap-right");
        result.push(n);
    });
    return result;
}

export function Pagination({
                               page,
                               pageSize,
                               total,
                               onPageChange,
                               onPageSizeChange,
                               pageSizeOptions = DEFAULT_PAGE_SIZES,
                               disabled = false,
                               accent,
                           }: PaginationProps) {
    const {t} = useTranslation();

    // Записей меньше, чем влезает на самую маленькую страницу, - листать нечего
    if (total <= Math.min(...pageSizeOptions)) return null;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    const navButton =
        "cursor-pointer grid h-8 min-w-8 place-items-center rounded-[8px] border border-[#e5e9f0] bg-white px-2 " +
        "text-[12.5px] font-semibold text-[#55617a] transition hover:bg-[#f2f5f9] " +
        "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white";

    return (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-[#55617a]">
            <div className="flex flex-wrap items-center gap-4">
                <span>{t("pager.shown", {from, to, total})}</span>
                <div className={`flex items-center gap-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
                    {t("pager.pageSize")}
                    {/* Свой выпадающий список вместо системного <select> */}
                    <SelectDropdown
                        options={pageSizeOptions.map((size) => ({value: String(size), label: String(size)}))}
                        value={String(pageSize)}
                        onChange={(v) => onPageSizeChange(Number(v))}
                        minWidth="72px"
                        valueClassName="font-semibold text-[#26324a]"
                        accent={accent}
                    />
                </div>
            </div>

            <nav className="flex items-center gap-1" aria-label="pagination">
                <button
                    type="button"
                    className={navButton}
                    disabled={disabled || page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label={t("pager.prev")}
                    title={t("pager.prev")}
                >
                    <ChevronLeft size={16}/>
                </button>

                {buildPageList(page, totalPages).map((item) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            type="button"
                            disabled={disabled}
                            onClick={() => onPageChange(item)}
                            aria-current={item === page ? "page" : undefined}
                            className={navButton}
                            style={item === page
                                ? {background: "var(--app-accent, #4e57d6)", borderColor: "var(--app-accent, #4e57d6)", color: "#fff"}
                                : undefined}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={item} className="grid h-8 w-6 place-items-center text-[#a3adbd]">…</span>
                    )
                )}

                <button
                    type="button"
                    className={navButton}
                    disabled={disabled || page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label={t("pager.next")}
                    title={t("pager.next")}
                >
                    <ChevronRight size={16}/>
                </button>
            </nav>
        </div>
    );
}
