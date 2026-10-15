/**
 * Акцентный цвет общих компонентов (выпадающие списки, календарь, модалки выбора).
 * По умолчанию — фиолетовый (#4e57d6), как в ВНД; "blue" — синий (#2f68f5) реестра СЗ.
 *
 * Классы записаны целиком строками: Tailwind собирает только те классы, что буквально
 * встречаются в исходниках, поэтому склеивать цвет на лету нельзя.
 */
export type Accent = "violet" | "blue";

export interface AccentClasses {
    /** Основной цвет: рамка, фон, текст. */
    border: string;
    bg: string;
    text: string;
    hoverText: string;
    focusBorder: string;
    /** Мягкая подложка выбранного пункта и кольцо фокуса. */
    softBg: string;
    ring: string;
    /** Совсем светлый тон (кружок аватара и т.п.). */
    tintBg: string;
    /** Основная кнопка при наведении. */
    hoverBg: string;
    /** Мягкая подложка при наведении. */
    hoverSoftBg: string;
}

export const ACCENT: Record<Accent, AccentClasses> = {
    violet: {
        border: "border-[#4e57d6]",
        bg: "bg-[#4e57d6]",
        text: "text-[#4e57d6]",
        hoverText: "hover:text-[#4e57d6]",
        focusBorder: "focus:border-[#4e57d6]",
        softBg: "bg-[#ececfc]",
        ring: "ring-[#ececfc]",
        tintBg: "bg-[#f0f1fb]",
        hoverBg: "hover:bg-[#434bc4]",
        hoverSoftBg: "hover:bg-[#ececfc]",
    },
    blue: {
        border: "border-[#2f68f5]",
        bg: "bg-[#2f68f5]",
        text: "text-[#2f68f5]",
        hoverText: "hover:text-[#2f68f5]",
        focusBorder: "focus:border-[#2f68f5]",
        softBg: "bg-[#e9f0ff]",
        ring: "ring-[#e9f0ff]",
        tintBg: "bg-[#eef4ff]",
        hoverBg: "hover:bg-[#2a5ee0]",
        hoverSoftBg: "hover:bg-[#e9f0ff]",
    },
};
