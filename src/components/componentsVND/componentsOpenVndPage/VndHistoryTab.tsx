import {Shield, Key} from "lucide-react";

interface AuditEntry {
    id: string;
    text: string;
    meta: string; // дата + время
}

interface VndVersion {
    id: string;
    version: string;
    tag: string;
    tagColor: string;
    tagBg: string;
    date: string;
    by: string;
    hash: string;
    developer: string; // Разработчик
    organ: string; // Орган утверждения
    responsibleExecutor: string; // Ответственные исполнители
}

const mockAudit: AuditEntry[] = [
    {id: "1", text: "Документ зарегистрирован в системе, как черновик", meta: "28.07.2026, 14:02"},
    {
        id: "2",
        text: "К документу добавлена новая редакция \"10084-Р3\", требующая согласования",
        meta: "01.08.2026, 11:30"
    },
    {id: "3", text: "Новая редакция \"10084-Р3\" отправлена на согласование", meta: "02.08.2026, 16:45"},
    {
        id: "4",
        text: "Гульнара Асанова (Юридическое управление) оставила резолюцию \"Согласовать\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Первичное согласование-",
        meta: "04.08.2026, 09:10 "
    },
    {
        id: "5",
        text: "Айбек Нуруев (Риск-менеджмент) оставил резолюцию \"Согласовать с замечаниями\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Первичное согласование-",
        meta: "04.08.2026, 09:12"
    },
    {
        id: "6",
        text: "Жаныл Эсенова (Комплаенс-контроль) оставила резолюцию \"Согласовать с замечаниями\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Первичное согласование-",
        meta: "04.08.2026, 09:12"
    },
    {
        id: "7",
        text: "Нурбек Осконов (Методология) оставил резолюцию \"Согласовать\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Первичное согласование-",
        meta: "04.08.2026, 09:10 "
    },
    {id: "8", text: "Новая редакция \"10084-Р3\" отправлена на доработку", meta: "02.08.2026, 16:45"},
    {
        id: "9",
        text: "Новая редакция была доработана и отправлена на этап -Согласование после внесённых изменений-",
        meta: "02.08.2026, 16:45"
    },
    {
        id: "10",
        text: "Гульнара Асанова (Юридическое управление) оставила резолюцию \"Согласовать\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Согласование после внесённых изменений-",
        meta: "04.08.2026, 09:10 "
    },
    {
        id: "11",
        text: "Айбек Нуруев (Риск-менеджмент) оставил резолюцию резолюцию \"Согласовать\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Согласование после внесённых изменений-",
        meta: "04.08.2026, 09:10 "
    },
    {
        id: "12",
        text: "Жаныл Эсенова (Комплаенс-контроль) оставила резолюцию \"Согласовать\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Согласование после внесённых изменений-",
        meta: "04.08.2026, 09:10 "
    },
    {
        id: "13",
        text: "Нурбек Осконов (Методология) оставил резолюцию \"Согласовать\" в ходе процесса согласования новой редакции 10084-Р3 на этапе -Согласование после внесённых изменений-",
        meta: "04.08.2026, 09:10 "
    },
    {
        id: "14",
        text: "Новая редакция \"10084-Р3\" отправлена на этап согласования -Финальная выдержка-",
        meta: "04.08.2026, 09:10 "
    },
    {
        id: "15",
        text: "Этап согласования -Финальная выдержка- прошел без замечаний от согласующих. Редакция \"10084-Р3\" стала Действующей.",
        meta: "04.08.2026, 09:10 "
    },
];

const mockVersions: VndVersion[] = [
    {
        id: "1",
        version: "10084-Р4",
        tag: "Действующая",
        tagColor: "text-emerald-700",
        tagBg: "bg-emerald-100",
        date: "04.08.2026",
        by: "Согласовано: Фролова С. В.",
        hash: "a4f9c2e1",
        developer: "Разработчик: Фролова С. В.",
        organ: "Орган утверждения: Правление",
        responsibleExecutor: "Ответственные исполнители: Начальник УД"
    },
    {
        id: "2",
        version: "10084-Р3",
        tag: "Не действ.",
        tagColor: "text-slate-500",
        tagBg: "bg-slate-100",
        date: "15.05.2026",
        by: "Согласовано: Иванов А. К.",
        hash: "7b3d8e90",
        developer: "Разработчик: Фролова С. В.",
        organ: "Орган утверждения: Правление",
        responsibleExecutor: "Ответственные исполнители: Начальник УД"
    },
    {
        id: "3",
        version: "10084-Р2",
        tag: "Не действ.",
        tagColor: "text-slate-500",
        tagBg: "bg-slate-100",
        date: "02.02.2026",
        by: "Согласовано: Иванов А. К.",
        hash: "1e5f4a22",
        developer: "Разработчик: Фролова С. В.",
        organ: "Орган утверждения: Правление",
        responsibleExecutor: "Ответственные исполнители: Начальник УД"
    },
    {
        id: "4",
        version: "10084-Р1",
        tag: "Не действ.",
        tagColor: "text-slate-500",
        tagBg: "bg-slate-100",
        date: "11.11.2025",
        by: "Согласовано: Петрова О. Н.",
        hash: "9c0b7d15",
        developer: "Разработчик: Фролова С. В.",
        organ: "Орган утверждения: Правление",
        responsibleExecutor: "Ответственные исполнители: Начальник УД"
    },
];

// ===== Компонент =====

export function VndHistoryTab() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
            {/* Левая колонка */}
            <div className="flex flex-col gap-[18px]">
                {/* Журнал аудита */}
                <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                        <Shield size={17} strokeWidth={1.8} className="text-[#8b97ab]"/>
                        <h2 className="m-0 text-sm font-semibold">Журнал аудита</h2>
                        <span className="ml-auto text-[11px] text-[#a3adbd]">История всех действий с данной ВНД</span>
                    </div>
                    <div className="px-5 pt-1.5 pb-3.5">
                        {mockAudit.map((a) => (
                            <div key={a.id}
                                 className="flex gap-[11px] py-2.5 border-t border-[#f3f6f9] first:border-t-0">
                                <span className="w-[7px] h-[7px] flex-none rounded-full mt-1.5 bg-[#c3ccd8]"/>
                                <div className="min-w-0">
                                    <div className="text-[12.5px] text-[#26324a] leading-[1.4]">{a.text}</div>
                                    <div className="text-[11px] text-[#8b97ab] mt-0.5">{a.meta}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Правая колонка: Версии и юридическая значимость */}
            <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7]">
                    <h2 className="m-0 text-sm font-semibold">Редакции и юридическая значимость</h2>
                </div>
                <div className="px-5 pt-1.5 pb-3.5">
                    {mockVersions.map((v) => (
                        <div key={v.id} className="flex gap-[13px] py-3 border-b border-[#f3f6f9] last:border-b-0">
                            <div className="flex-none text-center">
                                <div className="font-mono text-[13px] font-bold text-[#1c2740]">{v.version}</div>
                                <span
                                    className={`inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${v.tagColor} ${v.tagBg}`}
                                >
                  {v.tag}
                </span>
                            </div>
                            <div className="flex-1 min-w-0 border-l-2 border-[#eef2f7] pl-[13px]">
                                <div className="text-[12.5px] text-[#26324a]">{v.date}</div>
                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">{v.by}</div>
                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">{v.developer}</div>
                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">{v.organ}</div>
                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">{v.responsibleExecutor}</div>
                                <div className="flex items-center gap-1.5 mt-[5px]">
                                    <Key size={12} strokeWidth={2} className="text-[#a3adbd]"/>
                                    <span className="font-mono text-[10.5px] text-[#a3adbd]">hash {v.hash}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}