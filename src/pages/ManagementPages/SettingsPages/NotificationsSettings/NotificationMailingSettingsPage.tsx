// Раздел "Уведомления" в "Управление",
// кнопка "Настройки рассылок плана" на странице "Планирование актуализации".
// Настройки рассылок по актуализации ВНД,
import {useState} from "react";
import {useTranslation} from "react-i18next";

import {ActualizationResponsiblesSection} from "@/components/componentsVND/componentsNotificationSettings/ActualizationResponsiblesSection.tsx";
import {ActualizationMonthlyDigestSection} from "@/components/componentsVND/componentsNotificationSettings/ActualizationMonthlyDigestSection.tsx";
import {ActualizationCriticalRemindersSection} from "@/components/componentsVND/componentsNotificationSettings/ActualizationCriticalRemindersSection.tsx";
import {ActualizationOneTimeMailingSection} from "@/components/componentsVND/componentsNotificationSettings/ActualizationOneTimeMailingSection.tsx";
import {NewRedactionMailingSection} from "@/components/componentsVND/componentsNotificationSettings/NewRedactionMailingSection.tsx";

const SECTION_IDS = ["responsibles", "monthly", "criticalReminders", "oneTimeMailing", "newRedactions"] as const;

// Подписи раздела «Новые редакции» — пока по умолчанию (ключи переводов можно добавить позже,
// i18next тогда возьмёт их вместо defaultValue).
const SECTION_DEFAULTS: Partial<Record<(typeof SECTION_IDS)[number], {title: string; subtitle: string}>> = {
    newRedactions: {
        title: "Рассылка с уведомлением о новых редакциях",
        subtitle: "Письмо при каждой консолидации ВНД",
    },
};

export function NotificationMailingSettingsPage() {
    const {t} = useTranslation();
    const [selected, setSelected] = useState<string>(SECTION_IDS[0]);

    return (
        <div className="p-6">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("notificationMailingSettingsPage.title")}</h1>
            <div className="mt-1 text-[13px] text-[#8b97ab]">
                {t("notificationMailingSettingsPage.description")}
            </div>

            <div className="mt-5 grid gap-5" style={{gridTemplateColumns: "minmax(220px, 280px) 1fr"}}>
                <aside className="rounded-[12px] border border-[#e5e9f0] bg-white p-2 self-start">
                    {SECTION_IDS.map((id) => {
                        const active = id === selected;

                        return (
                            <button
                                key={id}
                                onClick={() => setSelected(id)}
                                className={`w-full rounded-[9px] px-3 py-2.5 text-left cursor-pointer border-none ${
                                    active ? "bg-[#e9f0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                            >
                                <span className={`text-[13px] font-semibold ${
                                    active ? "text-[#2f68f5]" : "text-[#1c2740]"}`}>
                                    {t(`notificationMailingSettingsPage.sections.${id}.title`, {defaultValue: SECTION_DEFAULTS[id]?.title})}
                                </span>
                                <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                                    {t(`notificationMailingSettingsPage.sections.${id}.subtitle`, {defaultValue: SECTION_DEFAULTS[id]?.subtitle})}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                <section className="min-w-0">
                    {selected === "responsibles" && <ActualizationResponsiblesSection/>}
                    {selected === "monthly" && <ActualizationMonthlyDigestSection/>}
                    {selected === "criticalReminders" && <ActualizationCriticalRemindersSection/>}
                    {selected === "oneTimeMailing" && <ActualizationOneTimeMailingSection/>}
                    {selected === "newRedactions" && <NewRedactionMailingSection/>}
                </section>
            </div>
        </div>
    );
}
