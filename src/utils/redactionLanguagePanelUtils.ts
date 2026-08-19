import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

export type RedactionLanguage = "ru" | "kg" | "en";

export const LANGUAGE_TABS: {
    code: RedactionLanguage;
    label: string;
    fileKey: "docFileRuId" | "docFileKgId" | "docFileEnId";
}[] = [
    {code: "ru", label: "Русский", fileKey: "docFileRuId"},
    {code: "kg", label: "Кыргызча", fileKey: "docFileKgId"},
    {code: "en", label: "English", fileKey: "docFileEnId"},
];

/** Языки, для которых у редакции реально есть файл текста */
export function getAvailableLanguages(redaction: VndRedactionResponse): RedactionLanguage[] {
    return LANGUAGE_TABS.filter((t) => redaction[t.fileKey] !== null).map((t) => t.code);
}

/** ID файла редакции на конкретном языке (или null, если текста на этом языке нет) */
export function getRedactionFileId(redaction: VndRedactionResponse, lang: RedactionLanguage): number | null {
    const tab = LANGUAGE_TABS.find((t) => t.code === lang);
    return tab ? (redaction[tab.fileKey] as number | null) : null;
}
