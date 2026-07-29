// Переключатель языков
import {useTranslation} from "react-i18next";
import {Tooltip} from "../componentsGeneral/Tooltip";

type Lang = "ru" | "ky" | "en";

export function LanguageSwitcher() {
    const {t, i18n} = useTranslation();
    const lang = i18n.language as Lang;
    const setLang = (l: Lang) => i18n.changeLanguage(l);

    const langs: {code: Lang; label: string; tooltipKey: string}[] = [
        {code: "ru", label: "RU", tooltipKey: "header.langRu"},
        {code: "ky", label: "KY", tooltipKey: "header.langKy"},
        {code: "en", label: "EN", tooltipKey: "header.langEN"},
    ];

    return (
        <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f2f5f9] p-[3px]">
            {langs.map(({code, label, tooltipKey}) => (
                <Tooltip key={code} content={t(tooltipKey)} side="bottom" disabled={lang === code}>
                    <button
                        onClick={() => setLang(code)}
                        className="cursor-pointer rounded-[6px] px-2.5 py-1 text-[12px] font-semibold"
                        style={
                            lang === code
                                ? {
                                    background: "#fff",
                                    color: "var(--app-accent, #4e57d6)",
                                    boxShadow: "0 1px 2px rgba(15,27,45,.08)",
                                }
                                : {color: "#8b97ab"}
                        }
                    >
                        {label}
                    </button>
                </Tooltip>
            ))}
        </div>
    );
}