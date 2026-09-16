// Палитра цветов для подсветки цитат согласующих в тексте редакции
export interface ApproverColor {
    /** Пастельный фон - собственно подсветка цитаты этого согласующего в тексте. */
    bg: string;
    /** Насыщенный цвет того же оттенка - акцент (нижняя граница подсветки, точка/значок в
     * подсказке при наведении, легенда). */
    accent: string;
}

const APPROVER_COLOR_PALETTE: ApproverColor[] = [
    {bg: "#fde68a", accent: "#b45309"}, // янтарный
    {bg: "#bfdbfe", accent: "#1d4ed8"}, // синий
    {bg: "#fbcfe8", accent: "#be185d"}, // розовый
    {bg: "#bbf7d0", accent: "#15803d"}, // зелёный
    {bg: "#ddd6fe", accent: "#6d28d9"}, // фиолетовый
    {bg: "#fecaca", accent: "#b91c1c"}, // красный
    {bg: "#99f6e4", accent: "#0f766e"}, // бирюзовый
    {bg: "#fed7aa", accent: "#c2410c"}, // оранжевый
    {bg: "#c7d2fe", accent: "#4338ca"}, // индиго
    {bg: "#f5d0fe", accent: "#a21caf"}, // фуксия
];

export function getApproverColor(approverUserId: number): ApproverColor {
    const idx = ((approverUserId % APPROVER_COLOR_PALETTE.length) + APPROVER_COLOR_PALETTE.length)
        % APPROVER_COLOR_PALETTE.length;
    return APPROVER_COLOR_PALETTE[idx];
}

/** Фон для подсветки: один цвет, если это цитата одного согласующего, либо диагональные полосы
 * из цветов ВСЕХ согласующих, чьи цитаты пересеклись в этом месте текста */
export function buildApproverBackground(colors: ApproverColor[]): string {
    if (colors.length === 0) return "transparent";
    if (colors.length === 1) return colors[0].bg;

    const stripeWidth = 9; // px - на глаз читается как "полоски", не сливается в кашу
    const stops: string[] = [];
    colors.forEach((c, i) => {
        const from = i * stripeWidth;
        const to = from + stripeWidth;
        stops.push(`${c.bg} ${from}px`, `${c.bg} ${to}px`);
    });
    return `repeating-linear-gradient(135deg, ${stops.join(", ")})`;
}
