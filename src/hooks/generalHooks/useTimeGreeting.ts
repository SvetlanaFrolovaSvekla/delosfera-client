import {useTranslation} from "react-i18next";

/**
 * Возвращает приветствие по времени суток на текущем языке интерфейса.
 * Заменяет старый util getTimeGreeting(), который возвращал жёстко русский текст.
 */
export function useTimeGreeting(): string {
    const {t} = useTranslation();
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return t("home.greeting.morning");
    if (hour >= 12 && hour < 18) return t("home.greeting.day");
    if (hour >= 18 && hour < 23) return t("home.greeting.evening");
    return t("home.greeting.night");
}