// Панель переключения языка содержимого редакции (RU/KG/EN)
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

export type RedactionLanguage = "ru" | "kg" | "en";

const LANGUAGE_TABS: {
    code: RedactionLanguage;
    label: string;
    fileKey: "docFileRuId" | "docFileKgId" | "docFileEnId";
}[] = [
    {code: "ru", label: "Русский", fileKey: "docFileRuId"},
    {code: "kg", label: "Кыргызча", fileKey: "docFileKgId"},
    {code: "en", label: "English", fileKey: "docFileEnId"},
];

interface RedactionLanguageTabsPanelProps {
    selected: VndRedactionResponse;
    activeLanguage: RedactionLanguage;
    onChange: (lang: RedactionLanguage) => void;
}

export function RedactionLanguageTabsPanel({
                                               selected,
                                               activeLanguage,
                                               onChange,
                                           }: RedactionLanguageTabsPanelProps) {
    return (
        <div className="rounded-[14px] border border-[#e9edf3] bg-white p-[14px]">
            <div className="px-1 pb-[10px] pt-[2px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                Язык документа
            </div>

            <div className="flex flex-col gap-1 rounded-[10px] bg-[#f4f6fa] p-1">
                {LANGUAGE_TABS.map((tab) => {
                    const available = selected[tab.fileKey] !== null;
                    const active = activeLanguage === tab.code;
                    return (
                        <button
                            key={tab.code}
                            onClick={() => available && onChange(tab.code)}
                            disabled={!available}
                            className={`h-9 w-full rounded-[8px] text-[12.5px] font-semibold transition-colors ${
                                !available
                                    ? "cursor-not-allowed text-[#c3ccd8]"
                                    : active
                                        ? "cursor-pointer bg-white text-[#1c2740] shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
                                        : "cursor-pointer text-[#8b97ab] hover:text-[#3a4560]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Языки, для которых у редакции реально есть файл текста */
export function getAvailableLanguages(redaction: VndRedactionResponse): RedactionLanguage[] {
    return LANGUAGE_TABS.filter((t) => redaction[t.fileKey] !== null).map((t) => t.code);
}

/** ID файла редакции на конкретном языке (или null, если текста на этом языке нет) */
export function getRedactionFileId(redaction: VndRedactionResponse, lang: RedactionLanguage): number | null {
    const tab = LANGUAGE_TABS.find((t) => t.code === lang);
    return tab ? (redaction[tab.fileKey] as number | null) : null;
}