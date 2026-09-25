/** Разделы по числу открытий. Полоска под строкой показывает долю от лидера. */
import {useTranslation} from "react-i18next";

export function Sections({sections}: {sections: {title: string; count: number}[]}) {
    const {t} = useTranslation();
    const max = Math.max(...sections.map((s) => s.count), 1);

    return (
        <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#101a2c]">
                {t("usageAnalytics.sectionsTitle") /* Разделы */}
            </h2>
            <p className="mb-3 text-[12px] text-[#8593a8]">
                {t("usageAnalytics.sectionsSubtitle") /* открытий за период */}
            </p>

            {sections.length === 0 ? (
                <p className="text-[13px] text-[#a8b3c4]">
                    {t("usageAnalytics.sectionsEmpty") /* Нет данных */}
                </p>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {sections.map((s) => (
                        <div key={s.title}>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[13px] text-[#101a2c]">{s.title}</span>
                                <span className="shrink-0 font-mono text-[12.5px] text-[#4d5a72]">
                                    {s.count}
                                </span>
                            </div>
                            <div className="mt-1 h-[3px] rounded-full bg-[#eef2f7]">
                                <div
                                    className="h-full rounded-full bg-[#2f68f5]"
                                    style={{width: `${(s.count / max) * 100}%`}}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}