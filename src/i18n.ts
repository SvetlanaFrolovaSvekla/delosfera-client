import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ru from "@/locales/ru/translation.json";
import ky from "@/locales/kg/translation.json";
import en from "@/locales/en/translation.json";

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: ru },
            ky: { translation: ky },
            en: { translation: en },
        },
        fallbackLng: "ru",
        supportedLngs: ["ru", "ky", "en"],

        /*
         * Язык берём только из явного выбора человека, не из настроек браузера.
         *
         * По умолчанию определитель смотрит на язык системы, и рабочая станция с
         * английской Windows открывала интерфейс по-английски. Банк работает
         * по-русски, английскую локаль ставят айтишники при установке — это
         * ничего не говорит о том, на каком языке сотрудник хочет читать.
         *
         * Хуже того, переведены не все строки: часть подписей вписана в разметку
         * по-русски. Английский интерфейс выходил наполовину русским — не
         * переключение языка, а поломка.
         */
        detection: {
            order: ["localStorage"],
            caches: ["localStorage"],
        },

        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;