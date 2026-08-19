import {useTranslation} from "react-i18next";

const KY_WEEKDAYS = ["жекшемби", "дүйшөмбү", "шейшемби", "шаршемби", "бейшемби", "жума", "ишемби"];
const KY_MONTHS = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

/**
 * Возвращает текущую дату в формате "день недели, число месяц" на текущем языке.
 * Заменяет старый util getFormattedDate(), который форматировал дату только на русском.
 *
 * Для кыргызского языка форматируем вручную: браузерная/нодовская поддержка
 * Intl.DateTimeFormat('ky', ...) для названий дней недели и месяцев неполная и
 * нестабильна между окружениями, поэтому используем свой словарь.
 */
export function useFormattedDate(): string {
    const {i18n} = useTranslation();
    const now = new Date();

    if (i18n.language === "ky") {
        const weekday = KY_WEEKDAYS[now.getDay()];
        const month = KY_MONTHS[now.getMonth()];
        return `${weekday}, ${now.getDate()}-${month}`;
    }

    const locale = i18n.language === "en" ? "en-US" : "ru-RU";
    return new Intl.DateTimeFormat(locale, {weekday: "long", day: "numeric", month: "long"}).format(now);
}