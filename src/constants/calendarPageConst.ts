// Максимальное число видимых строк событий в ячейке дня (остальные - в «+N ещё»)
export const MAX_VISIBLE = 3;

// Цвета: просроченные / предстоящие (срок ещё не прошёл) события
export const COLORS = {
    overdue: {bg: "#fdecea", fg: "#c0392b"},
    upcoming: {bg: "#eef3ff", fg: "#2f68f5"},
} as const;

// Куда вести клик по событию, когда у типа документа нет страницы конкретной записи
export const STATIC_LINKS: Record<string, string> = {
    Acknowledgement: "/hr-ack",
    Letter: "/correspondence",
    Obligation: "/obligations",
};

// Для типов, у которых есть страница отдельной записи
export const LINKS: Record<string, (id: number) => string> = {
    Sz: id => `/sz/${id}`,
    Procurement: id => `/prc/${id}`,
    Vnd: id => `/base-vnd/${id}`,
    Meeting: id => `/meetings/${id}`,
};
