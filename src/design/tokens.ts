// Дизайн-токены Делосферы (по прототипу v8, Creatio-style). Единый источник цветов,
// радиусов, отступов, типографики и порогов RYG. Используется UI-примитивами.

export const colors = {
    accent: "#2f68f5",
    accentSoft: "#e9f0ff",
    accentBorder: "#cbddff",
    accentHover: "#1b4fd0",

    ink: "#0f1b2d",       // основной текст
    inkMuted: "#55617a",  // вторичный
    inkSubtle: "#8b97ab", // подписи
    inkFaint: "#a3adbd",  // плейсхолдеры/иконки

    surface: "#ffffff",
    surfaceAlt: "#f6f8fb",
    surfaceHover: "#fafbfd",
    border: "#e5e9f0",
    borderSoft: "#eef2f7",

    // Палитра статусов ВНД/документов
    status: {
        active: {fg: "#1c7a4d", bg: "#e2f4ea"},   // действующий
        onact: {fg: "#b3730a", bg: "#fbeecf"},     // на актуализации
        review: {fg: "#2f68f5", bg: "#e9f0ff"},    // на согласовании
        consol: {fg: "#7a5ce0", bg: "#efeafe"},    // консолидация
        arch: {fg: "#c0392b", bg: "#fdecea"},      // в архиве
        draft: {fg: "#5b6472", bg: "#eef0f3"},     // черновик
    },

    // RYG-индикация сроков (PLN-03)
    ryg: {
        green: {fg: "#1c7a4d", bg: "#e9f6ee", bd: "#c3e6d1"},
        amber: {fg: "#b3730a", bg: "#fdf3e0", bd: "#f0dcae"},
        red: {fg: "#c0392b", bg: "#fbeae7", bd: "#f1c9c2"},
    },
} as const;

export const radius = {
    sm: "6px",
    md: "9px",
    lg: "12px",
    pill: "999px",
} as const;

/** Шаг сетки 4px. space(3) === "12px". */
export const space = (n: number) => `${n * 4}px`;

export const font = {
    sans: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
} as const;

/** Пороги RYG по дням до срока актуализации (PLN-03, настраиваемо). */
export const rygThresholds = {
    /** > этого — зелёный. */
    greenDays: 30,
    /** &lt;= этого (или просрочка) — красный. */
    redDays: 5,
} as const;

export type RygTone = "green" | "amber" | "red";

/** Определить тон RYG по количеству дней до срока (null → нейтральный красный). */
export function rygTone(days: number | null | undefined): RygTone {
    if (days == null) return "red";
    if (days < 0 || days <= rygThresholds.redDays) return "red";
    if (days <= rygThresholds.greenDays) return "amber";
    return "green";
}
