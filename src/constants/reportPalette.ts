// Единая цветовая палитра для страницы отчётности — в тон общей палитре приложения
// (акцент #4e57d6, бренд-зелёный #24a36b, статусные цвета из STATUS_META).

export const REPORT_COLORS = [
    "#4e57d6", // акцент приложения (индиго)
    "#24a36b", // бренд-зелёный
    "#2f68f5", // синий (согласование)
    "#b3730a", // янтарный (актуализация)
    "#7a5ce0", // фиолетовый (консолидация)
    "#0f9bb3", // бирюза
    "#c0392b", // красный (архив/просрочка)
    "#d68f3a", // тёплый оранжевый
    "#5b6472", // серый (черновик)
    "#1c7a4d", // тёмно-зелёный
] as const;

export function colorAt(index: number): string {
    return REPORT_COLORS[index % REPORT_COLORS.length];
}

export const REPORT_UI = {
    ink: "#0f1b2d",
    inkSoft: "#26324a",
    muted: "#8b97ab",
    mutedSoft: "#a3adbd",
    border: "#e9edf3",
    borderSoft: "#eef2f7",
    surfaceSoft: "#f6f8fb",
    accent: "#4e57d6",
    accentSoft: "#ececfc",
    brand: "#24a36b",
    brandSoft: "#e4f5ec",
    danger: "#c0392b",
    dangerSoft: "#fdecea",
    warning: "#b3730a",
    warningSoft: "#fbeecf",
} as const;
