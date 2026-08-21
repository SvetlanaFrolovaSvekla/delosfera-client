import React from "react";
import {
    LayoutGrid,
    FileText,
    Layers,
    CalendarClock,
    GitBranch,
    PanelsTopLeft,
    BarChart3,
    BookOpen,
    ShoppingCart,
    ChevronLeft,
    Lock,
    GripVertical,
    X,
    Plus,
    Check,
    Clock,
    ArrowRight,
    Circle,
} from "lucide-react";

/**
 * Страница "Согласование ТИД" — Конструктор маршрута согласования.
 * Чистая разметка (без интерактивности/стейта), Tailwind CSS.
 */

const NAV_GROUPS = [
    {
        title: null,
        items: [{ icon: LayoutGrid, label: "Рабочий стол" }],
    },
    {
        title: "Нормотворчество",
        items: [
            { icon: FileText, label: "База ВНД" },
            { icon: Layers, label: "Архив ВНД" },
            { icon: CalendarClock, label: "Планирование" },
            { icon: GitBranch, label: "Согласование ТИД", active: true },
            { icon: PanelsTopLeft, label: "Два окна" },
            { icon: BarChart3, label: "Отчётность" },
            { icon: BookOpen, label: "База знаний" },
        ],
    },
    {
        title: "Служебные записки",
        items: [{ icon: FileText, label: "Реестр СЗ" }],
    },
    {
        title: "Закупки",
        items: [{ icon: ShoppingCart, label: "Заявки и закупки" }],
    },
];

const STAGES = [
    {
        num: 1,
        kind: "Последовательно",
        norm: "8 раб. ч",
        locked: false,
        participants: [{ initials: "РС", name: "Руководитель СП" }],
    },
    {
        num: 2,
        kind: "Финальный контроль",
        norm: "8 раб. ч",
        locked: true,
        participants: [{ initials: "ОМ", name: "Отдел методологии" }],
    },
];

function NavItem({ icon: Icon, label, active }) {
    return (
        <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                    ? "bg-[#ececfc] text-[#4e57d6] font-semibold"
                    : "text-slate-600 hover:bg-slate-100 font-medium"
            }`}
        >
            <Icon size={18} strokeWidth={1.8} className="shrink-0" />
            <span className="truncate">{label}</span>
        </button>
    );
}

function StageCard({ stage }) {
    return (
        <div
            className={`relative bg-white border rounded-2xl p-4 shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)] max-w-xl mx-auto ${
                stage.locked ? "border-[#ddd0fa]" : "border-slate-200"
            }`}
        >
            <div className="flex items-center gap-3 mb-3">
                {stage.locked ? (
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-[#efeafe] text-[#7a5ce0] grid place-items-center">
            <Lock size={16} strokeWidth={1.9} />
          </span>
                ) : (
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-400 grid place-items-center cursor-grab">
            <GripVertical size={17} strokeWidth={1.7} />
          </span>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800">
              Этап {stage.num}
            </span>
                        <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                stage.kind === "Финальный контроль"
                                    ? "bg-[#efeafe] text-[#7a5ce0]"
                                    : "bg-[#ececfc] text-[#4e57d6]"
                            }`}
                        >
              {stage.kind}
            </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                        Норматив: {stage.norm}
                    </div>
                </div>

                {!stage.locked && (
                    <>
                        <div className="flex items-center bg-slate-100 rounded-md p-0.5 w-[150px]">
                            <button className="flex-1 py-1 rounded text-[10.5px] font-semibold bg-[#4e57d6] text-white">
                                Послед.
                            </button>
                            <button className="flex-1 py-1 rounded text-[10.5px] font-semibold text-slate-500">
                                Паралл.
                            </button>
                        </div>
                        <button className="w-7 h-7 shrink-0 grid place-items-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 ml-1.5">
                            <X size={15} strokeWidth={2} />
                        </button>
                    </>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {stage.participants.map((p) => (
                    <div
                        key={p.name}
                        className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
            <span className="w-6 h-6 shrink-0 rounded-md bg-[#ececfc] text-[#4e57d6] grid place-items-center text-[10px] font-bold font-mono">
              {p.initials}
            </span>
                        <span className="text-xs text-slate-700 font-medium">
              {p.name}
            </span>
                        {!stage.locked && (
                            <button className="w-4.5 h-4.5 grid place-items-center rounded text-slate-300 hover:text-red-500">
                                <X size={12} strokeWidth={2.4} />
                            </button>
                        )}
                    </div>
                ))}

                {!stage.locked && (
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-dashed border-slate-300 rounded-lg text-[#4e57d6] text-xs font-semibold hover:border-[#4e57d6] hover:bg-[#ececfc]">
                        <Plus size={14} strokeWidth={2} />
                        Добавить участника
                    </button>
                )}
            </div>
        </div>
    );
}

export default function TestPage() {
    return (
        <div className="flex h-screen w-full bg-[#edecf5] text-[#0f1b2d] text-sm">
            {/* SIDEBAR */}
            <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
                <div className="h-[60px] shrink-0 flex items-center gap-2.5 px-4 border-b border-slate-100">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-[#24a36b] grid place-items-center">
                        <GitBranch size={18} className="text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <div className="font-bold text-[15px] leading-none">Делосфера</div>
                        <div className="text-[10.5px] text-slate-400 font-medium tracking-wide mt-0.5">
                            СЭД
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-3">
                    {NAV_GROUPS.map((group, i) => (
                        <div key={i} className="mb-1.5">
                            {group.title && (
                                <div className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400 px-3 pt-3.5 pb-1.5">
                                    {group.title}
                                </div>
                            )}
                            {group.items.map((item) => (
                                <NavItem key={item.label} {...item} />
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-3">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 text-sm hover:bg-slate-100">
                        <ChevronLeft size={18} strokeWidth={1.7} />
                        <span>Свернуть меню</span>
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 min-w-0 overflow-y-auto">
                <div className="max-w-[1360px] mx-auto px-8 py-6 pb-16">
                    {/* breadcrumb-ish header */}
                    <div className="flex items-center gap-3 mb-1.5">
            <span className="font-mono text-[13px] font-semibold text-[#4e57d6] bg-[#ececfc] px-2.5 py-0.5 rounded-md">
              ТИД-2026-014
            </span>
                        <span className="text-[12.5px] text-slate-400">
              на основе ВНД-062 · Порядок работы с обеспечением (залогами)
            </span>
                    </div>

                    <div className="flex items-end justify-between gap-5 flex-wrap mb-5">
                        <h1 className="text-[23px] font-bold tracking-tight">
                            Конструктор маршрута согласования
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                <button className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white text-[#4e57d6] shadow-sm">
                                    Схема
                                </button>
                                <button className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-400">
                                    Список
                                </button>
                            </div>
                            <button className="h-[38px] px-3.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                                Полный шаблон
                            </button>
                            <button className="h-[38px] px-3.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                                Мин. шаблон
                            </button>
                        </div>
                    </div>

                    {/* content grid */}
                    <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
                        {/* canvas */}
                        <div className="bg-[#fbfcfe] border border-slate-200 rounded-2xl p-6 bg-[radial-gradient(#e4e9f1_1px,transparent_1px)] bg-[length:18px_18px]">
                            {/* start pill */}
                            <div className="flex justify-center mb-0.5">
                                <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-[#0f1b2d] text-white text-xs font-semibold shadow-lg">
                                    <Circle size={8} className="fill-green-400 text-green-400" />
                                    Запуск · Инициатор
                                </div>
                            </div>

                            {STAGES.map((stage, i) => (
                                <React.Fragment key={stage.num}>
                                    <div className="flex justify-center">
                                        <div className="w-0.5 h-[22px] bg-slate-300" />
                                    </div>
                                    <StageCard stage={stage} />
                                    {i === STAGES.length - 1 && (
                                        <div className="flex justify-center mt-0.5">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <div className="w-0.5 h-[22px] bg-slate-300" />
                                                <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-dashed border-slate-300 rounded-xl bg-white text-[#4e57d6] text-xs font-semibold hover:border-[#4e57d6] hover:bg-[#ececfc]">
                                                    <Plus size={16} strokeWidth={2} />
                                                    Добавить этап
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}

                            {/* end pill */}
                            <div className="flex justify-center mt-6">
                                <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-[#1c7a4d] text-white text-xs font-semibold shadow-lg">
                                    <Check size={15} strokeWidth={2.2} />
                                    Утверждение · Правление
                                </div>
                            </div>
                        </div>

                        {/* sidebar right */}
                        <div className="sticky top-0 flex flex-col gap-4">
                            <div className="bg-white border border-slate-200 rounded-2xl p-4.5">
                                <h2 className="font-semibold text-sm mb-3">Правила маршрута</h2>
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex gap-2.5">
                                        <Lock
                                            size={17}
                                            strokeWidth={1.8}
                                            className="shrink-0 text-[#7a5ce0]"
                                        />
                                        <span className="text-xs text-slate-600 leading-relaxed">
                      <b className="text-slate-700">Отдел методологии</b>{" "}
                                            закреплён финальным этапом автоматически и не
                      удаляется.
                    </span>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <GripVertical
                                            size={17}
                                            strokeWidth={1.8}
                                            className="shrink-0 text-[#4e57d6]"
                                        />
                                        <span className="text-xs text-slate-600 leading-relaxed">
                      Перетаскивайте этапы для изменения порядка;
                      параллельные визы идут одновременно.
                    </span>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <Clock
                                            size={17}
                                            strokeWidth={1.8}
                                            className="shrink-0 text-amber-600"
                                        />
                                        <span className="text-xs text-slate-600 leading-relaxed">
                      Норматив срока задаёт автоакцепт при бездействии
                      согласующего.
                    </span>
                                    </div>
                                </div>

                                <label className="flex items-center gap-2.5 mt-3.5 pt-3 border-t border-slate-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#4e57d6] cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-600">
                    Смоделировать нарушение правил
                  </span>
                                </label>
                            </div>

                            <div className="bg-[#eafaf0] border border-[#c3e6d1] rounded-2xl p-3.5 flex items-center gap-2.5">
                                <Check size={19} strokeWidth={2} className="shrink-0 text-[#1c7a4d]" />
                                <span className="text-xs text-[#186b43] leading-relaxed">
                  Маршрут корректен. Все обязательные согласующие включены.
                </span>
                            </div>

                            <button className="w-full flex items-center justify-center gap-2 h-[46px] rounded-xl bg-[#4e57d6] text-white text-sm font-semibold shadow-lg hover:brightness-105">
                                <ArrowRight size={18} strokeWidth={2} />
                                Запустить согласование
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}