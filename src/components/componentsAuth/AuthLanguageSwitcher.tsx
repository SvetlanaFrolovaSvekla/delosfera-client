import {useTranslation} from "react-i18next";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

type Lang = "ru" | "ky" | "en";

const LANGS: { code: Lang; label: string; tooltipKey: string }[] = [
    {code: "ru", label: "RU", tooltipKey: "header.langRu"},
    {code: "ky", label: "KY", tooltipKey: "header.langKy"},
    {code: "en", label: "EN", tooltipKey: "header.langEN"},
];

export function AuthLanguageSwitcher() {
    const {t, i18n} = useTranslation();
    const lang = i18n.language as Lang;
    const setLang = (l: Lang) => {
        if (l !== lang) void i18n.changeLanguage(l);
    };

    return (
        <div
            role="radiogroup"
            aria-label={t("auth.languageSwitcherAria")}
            className="inline-flex items-center gap-0.5 rounded-full border border-[#eef0f5] bg-white p-1 shadow-[0_4px_14px_-6px_rgba(15,27,45,.16)]"
        >
            {LANGS.map(({code, label, tooltipKey}) => {
                const active = lang === code;
                return (
                    <Tooltip key={code} content={t(tooltipKey)} side="bottom">
                        <button
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setLang(code)}
                            className="cursor-pointer rounded-full px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.01em] transition-colors duration-150"
                            style={
                                active
                                    ? {background: "var(--brand, #24a36b)", color: "#fff"}
                                    : {background: "transparent", color: "#8b97ab"}
                            }
                        >
                            {label}
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}