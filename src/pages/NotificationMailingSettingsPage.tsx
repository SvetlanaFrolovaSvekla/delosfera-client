// Настройки рассылок по актуализации ВНД — раздел "Уведомления" в "Управление"
// (ManagementPage), кнопка "Настройки рассылок плана" на странице "Планирование
// актуализации". Двухпанельная раскладка, как у "Системные настройки" (SystemSettingsPage):
// слева — разделы настроек, справа — содержимое выбранного.
import {useState} from "react";

import {ActualizationResponsiblesSection} from "@/components/componentsVND/componentsNotificationSettings/ActualizationResponsiblesSection.tsx";
import {ActualizationMonthlyDigestSection} from "@/components/componentsVND/componentsNotificationSettings/ActualizationMonthlyDigestSection.tsx";

interface Section {
    id: string;
    title: string;
    subtitle: string;
}

const SECTIONS: Section[] = [
    {
        id: "responsibles",
        title: "Ответственные сотрудники за актуализацию",
        subtitle: "Кто отвечает за актуализацию ВНД по каждому структурному подразделению",
    },
    {
        id: "monthly",
        title: "Ежемесячные уведомления",
        subtitle: "Сводка 1-го числа с планом актуализации в Excel",
    },
];

export function NotificationMailingSettingsPage() {
    const [selected, setSelected] = useState(SECTIONS[0].id);

    return (
        <div className="p-6">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Настройки рассылок по актуализации ВНД</h1>
            <div className="mt-1 text-[13px] text-[#8b97ab]">
                Кто и что получает в уведомлениях по актуализации ВНД
            </div>

            <div className="mt-5 grid gap-5" style={{gridTemplateColumns: "minmax(220px, 280px) 1fr"}}>
                <aside className="rounded-[12px] border border-[#e5e9f0] bg-white p-2 self-start">
                    {SECTIONS.map((section) => {
                        const active = section.id === selected;

                        return (
                            <button
                                key={section.id}
                                onClick={() => setSelected(section.id)}
                                className={`w-full rounded-[9px] px-3 py-2.5 text-left cursor-pointer border-none ${
                                    active ? "bg-[#e9f0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                            >
                                <span className={`text-[13px] font-semibold ${
                                    active ? "text-[#2f68f5]" : "text-[#1c2740]"}`}>
                                    {section.title}
                                </span>
                                <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                                    {section.subtitle}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                <section>
                    {selected === "responsibles" && <ActualizationResponsiblesSection/>}
                    {selected === "monthly" && <ActualizationMonthlyDigestSection/>}
                </section>
            </div>
        </div>
    );
}
