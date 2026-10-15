// Маленькая плашка «Р2 · RU» у ссылки или вложения на вкладке «Связанные документы»: в тексте
// какой редакции и на каком языке (одном или нескольких) найдено упоминание. Зелёная точка -
// действующая редакция; при наведении - полный код редакции.
// Используется в MentionLine и AttachmentLinkRow.
import {useTranslation} from "react-i18next";
import {languageShortLabel} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/vndLinkUi.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

export function RedactionPill({number, lang, current, code}: {
    number: number;
    /** Один язык ("ru") или несколько (["ru", "kg"]) - в каком тексте найдена ссылка. */
    lang: string | string[] | null | undefined;
    current: boolean;
    code: string;
}) {
    const {t} = useTranslation();
    const langLabel = (Array.isArray(lang) ? lang : [lang]).map(languageShortLabel).filter(Boolean).join(", ");
    return (
        <Tooltip content={`${code}${current ? ` · ${t("openVndPage.linksTab.currentRedaction")}` : ""}`} side="top">
            <span className="flex flex-none items-center gap-1 rounded-[6px] bg-[#ececfc] px-1.5 py-0.5 text-[10.5px] font-bold text-[#4e57d6]">
                {current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>}
                Р{number}{langLabel ? ` · ${langLabel}` : ""}
            </span>
        </Tooltip>
    );
}
