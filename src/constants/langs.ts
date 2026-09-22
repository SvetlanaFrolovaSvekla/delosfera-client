export type Lang = "ru" | "ky" | "en";

export const LANGS: {code: Lang; label: string; tooltipKey: string}[] = [
    {code: "ru", label: "RU", tooltipKey: "header.langRu"},
    {code: "ky", label: "KY", tooltipKey: "header.langKy"},
    {code: "en", label: "EN", tooltipKey: "header.langEN"},
];