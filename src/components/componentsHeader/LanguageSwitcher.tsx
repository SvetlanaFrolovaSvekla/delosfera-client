// Переключатель языков
import {useTranslation} from "react-i18next";
import {type Lang, LANGS} from "@/constants/langs.ts";

export function LanguageSwitcher() {
    const {i18n} = useTranslation();
    const lang = i18n.language as Lang;
    const setLang = (l: Lang) => i18n.changeLanguage(l);

    return (
        <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f2f5f9] p-[3px]">
            {LANGS.map(({code, label}) => (
                <button
                    key={code}
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
            ))}
        </div>
    );
}