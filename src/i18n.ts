import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ru from "@/locales/ru/translation.json";
import ky from "@/locales/kg/translation.json";

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: ru },
            ky: { translation: ky },
        },
        fallbackLng: "ru",
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;