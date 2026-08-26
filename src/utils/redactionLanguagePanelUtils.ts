import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

export type RedactionLanguage = "ru" | "kg" | "en";

/** То же, что RedactionLanguage, плюс "tid" - для просмотра Таблицы изменений и дополнений
 * (файл без привязки к языку) через те же компоненты просмотра/RedactionViewModal. */
export type RedactionViewTarget = RedactionLanguage | "tid";

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
