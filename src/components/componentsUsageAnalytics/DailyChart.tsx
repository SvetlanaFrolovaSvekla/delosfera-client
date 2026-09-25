import {useTranslation} from "react-i18next";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

/**
 * Сотрудников в день. Столбики, а не линия: дни дискретны, а линия между ними
 * подразумевала бы значения в промежутках, которых нет.
 */
export function DailyChart({days}: { days: { day: string; users: number }[] }) {
    const {t} = useTranslation();
    if (days.length === 0) {
        return (
            <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
                <h2 className="text-[15px] font-semibold text-[#101a2c]">
                    {t("usageAnalytics.dailyChartTitle") /* Сотрудников в день */}
                </h2>
                <p className="mt-6 text-center text-[13px] text-[#a8b3c4]">
                    {t("usageAnalytics.dailyChartEmpty") /* За период заходов не было */}
                </p>
            </section>
        );
    }

    const max = Math.max(...days.map((d) => d.users), 1);
    const short = (value: string) =>
        new Date(value).toLocaleDateString("ru-RU", {day: "numeric", month: "short"});
    // Для тултипа — подробнее, чем подпись под графиком: с днём недели, его и так
    // никто не держит в голове, а на столбик наводятся именно затем, чтобы уточнить.
    const full = (value: string) =>
        new Date(value).toLocaleDateString("ru-RU", {weekday: "short", day: "numeric", month: "long"});

    return (
        <section className="flex flex-col rounded-[14px] border border-[#e1e7ef] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#101a2c]">
                {t("usageAnalytics.dailyChartTitle") /* Сотрудников в день */}
            </h2>
            <p className="mb-4 text-[12px] text-[#8593a8]">
                {t("usageAnalytics.dailyChartSubtitle") /* уникальных за день */}
            </p>

            {/* Ширину столбика ограничиваем: за неделю их семь, и без предела
                каждый растягивается на седьмую часть карточки — за один день
                выходит сплошная заливка вместо графика.

                minHeight, а не height: карточка тянется по высоте соседней
                Sections, если там больше строк, — график должен расти вместе с ней.
                Обёртке тултипа даём self-stretch (вместо общего items-end), чтобы
                у неё была определённая высота — тогда процентная высота столбика
                внутри неё считается корректно, а items-end на самой обёртке
                прижимает столбик к низу, как и раньше. */}
            <div className="flex flex-1 items-end gap-[2px]" style={{minHeight: 170}}>
                {days.map((d) => (
                    <Tooltip
                        key={d.day}
                        side="bottom"
                        content={t("usageAnalytics.dailyChartTooltip", {
                            date: full(d.day),
                            count: d.users,
                        }) /* `${full(d.day)} · ${d.users} сотрудников` */}
                        className="flex-1 max-w-[34px] items-end self-stretch"
                    >
                        <div
                            className="w-full cursor-default rounded-t-[2px] bg-[#2f68f5] transition hover:bg-[#2554cc]"
                            style={{
                                height: `${(d.users / max) * 100}%`,
                                // Ноль тоже виден полоской: пустой день и день, которого
                                // нет в выборке, — разные вещи.
                                minHeight: d.users > 0 ? 3 : 1,
                                opacity: d.users > 0 ? 1 : 0.25,
                            }}
                        />
                    </Tooltip>
                ))}
            </div>

            <div className="mt-2 flex items-baseline justify-between text-[11.5px] text-[#8593a8]">
                <span>{short(days[0].day)}</span>
                <span className="font-medium text-[#4d5a72]">
                    {t("usageAnalytics.dailyChartMax", {max}) /* `максимум ${max}` */}
                </span>
                <span>{short(days[days.length - 1].day)}</span>
            </div>
        </section>
    );
}