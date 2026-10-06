// Шапка календаря: заголовок, переключение месяца/года, кнопка «Сегодня»
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {buildYearOptions, type CalendarView} from "@/utils/calendar/calendarUtils.ts";
import {asStringArray, capitalize} from "@/utils/stringUtils.ts";
import {NavButton} from "@/components/componentsCalendar/NavButton.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {ChevronLeft, ChevronRight} from "lucide-react";

interface Props {
    view: CalendarView;
    onShift: (delta: number) => void;
    onMonthChange: (m: number) => void;
    onYearChange: (y: number) => void;
    onToday: () => void;
}

export function CalendarHeader({view, onShift, onMonthChange, onYearChange, onToday}: Props) {
    const {t, i18n} = useTranslation();

    // Строка-ключ вместо массива: массив из t() - новый объект на каждый рендер
    const monthsKey = asStringArray(t("calendar.months", {returnObjects: true})).join("|");

    const monthOptions = useMemo(() => {
        const translated = monthsKey ? monthsKey.split("|") : [];
        const names = translated.length === 12
            ? translated
            : Array.from({length: 12}, (_, i) =>
                new Intl.DateTimeFormat(i18n.language, {month: "long"}).format(new Date(2000, i, 1)));
        return names.map((m, i) => ({value: String(i), label: capitalize(m)}));
    }, [monthsKey, i18n.language]);

    const yearOptions = useMemo(() => buildYearOptions(view.y), [view.y]);

    return (
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
                <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("calendar.title")}</h1>
                <div className="mt-1 text-[12.5px] text-[#8b97ab] first-letter:uppercase">
                    {t("calendar.description")}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <NavButton label={t("calendar.prev", {defaultValue: "Предыдущий месяц"})} onClick={() => onShift(-1)}>
                    <ChevronLeft className="w-4 h-4 text-[#55617a]" aria-hidden="true"/>
                </NavButton>
                <SelectDropdown
                    options={monthOptions}
                    value={String(view.m)}
                    onChange={(v) => onMonthChange(Number(v))}
                    minWidth="128px"
                />
                <NavButton label={t("calendar.next", {defaultValue: "Следующий месяц"})} onClick={() => onShift(1)}>
                    <ChevronRight className="w-4 h-4 text-[#55617a]" aria-hidden="true"/>
                </NavButton>
                <SelectDropdown
                    options={yearOptions}
                    value={String(view.y)}
                    onChange={(v) => onYearChange(Number(v))}
                    minWidth="88px"
                />
                <button onClick={onToday}
                        className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#f6f8fb]">
                    {t("calendar.today")}
                </button>
            </div>
        </div>
    );
}
