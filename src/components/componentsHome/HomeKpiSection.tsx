// Виджеты - сетка карточек с метриками деятельности: верхний ряд (контур ВНД) и
// нижний ряд (остальные контуры + замещения на рабочем столе).
//
// Объединяет бывшие HomeKpiGrid.tsx и HomeContoursCard.tsx: рабочий стол исторически
// показывал только ВНД, а служебные записки и закупки жили каждый в своём разделе —
// чтобы понять, что горит, приходилось обходить их по очереди. Здесь они собраны
// рядом, а тон плитки задаёт срочность — просрочка краснеет независимо от контура
// (GEN-15). Замещение показывается отдельной строкой перед нижним рядом: пока период
// идёт, задачи отсутствующего приходят замещающему, и он должен видеть, почему у него
// чужая работа (GEN-14).
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon} from "@/components/icons/Icon";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import type {VndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";
import {dashboardService, type DashboardKpi, type DashboardSummary} from "@/service/dashboardService/dashboardService.ts";

interface TopKpiItem {
    labelKey?: string;
    label?: string;
    tooltipKey: string;
    value: number;
    col: string;
    tint: string;
    bd: string;
    to: string;
}

function buildTopKpis(summary: VndHomeSummary | null | undefined, tasksLabel: string, tasksValue: number): TopKpiItem[] {
    return [
        {
            label: tasksLabel,
            tooltipKey: "home.kpi.tooltip.tasks",
            value: tasksValue,
            col: "var(--kpi-purple, #7a5ce0)", tint: "var(--kpi-purple-soft, #efeafe)", bd: "var(--kpi-purple-bd, #ddd0fa)",
            to: "/tasks",
        },
        {
            labelKey: "home.kpi.myTimeoutApprovalsThisMonth",
            tooltipKey: "home.kpi.tooltip.myTimeoutApprovalsThisMonth",
            value: summary?.myTimeoutApprovalsThisMonth ?? 0,
            col: "var(--kpi-red, #c0392b)", tint: "var(--kpi-red-soft, #fbe7e4)", bd: "var(--kpi-red-bd, #f1c9c2)",
            to: "/analytics?tab=vnd&sub=actualization",
        },
        {
            labelKey: "home.kpi.myVndAwaitingApproval",
            tooltipKey: "home.kpi.tooltip.myVndAwaitingApproval",
            value: summary?.myVndAwaitingApproval ?? 0,
            col: "var(--kpi-orange, #b3730a)", tint: "var(--kpi-orange-soft, #fdf3e0)", bd: "var(--kpi-orange-bd, #f0dcae)",
            to: "/tasks?tab=coordination&sub=myVndApproval",
        },
        {
            labelKey: "home.kpi.pendingMyApproval",
            tooltipKey: "home.kpi.tooltip.pendingMyApproval",
            value: summary?.pendingMyApproval ?? 0,
            col: "var(--app-accent, #2f68f5)",
            tint: "var(--app-soft, #e9f0ff)",
            bd: "var(--app-bd, #cbddff)",
            to: "/tasks?tab=coordination&sub=coordination",
        },
    ];
}

/* Порядок, в котором зажигается блик у карточек — единый "план" из 9 слотов:
   0-3 занимает верхний ряд (TOP_SHINE_SLOTS), 0-8 покрываются обоими рядами без
   повторов (нижний ряд — BOTTOM_SHINE_SLOTS). Длина слота (SHINE_SLOT_SECONDS)
   должна совпадать с длительностью animation: kpiShine у .kpi-shine-sweep в
   index.css, делённой на 9 (сейчас 18с/9 = 2с) — иначе блики либо наложатся
   друг на друга, либо появится лишняя пауза. */
const SHINE_SLOT_SECONDS = 2;
const TOP_SHINE_SLOTS = [0, 4, 2, 6];
const BOTTOM_SHINE_SLOTS = [7, 1, 8, 5, 3];

const BOTTOM_SLOT_TONES: { col: string; tint: string; bd: string }[] = [
    {col: "var(--app-accent, #2f68f5)", tint: "var(--app-soft, #e9f0ff)", bd: "var(--app-bd, #cbddff)"},
    {col: "var(--kpi-purple, #7a5ce0)", tint: "var(--kpi-purple-soft, #efeafe)", bd: "var(--kpi-purple-bd, #ddd0fa)"},
    {col: "var(--kpi-orange, #b3730a)", tint: "var(--kpi-orange-soft, #fdf3e0)", bd: "var(--kpi-orange-bd, #f0dcae)"},
    {col: "var(--kpi-red, #c0392b)", tint: "var(--kpi-red-soft, #fbe7e4)", bd: "var(--kpi-red-bd, #f1c9c2)"},
    {col: "var(--kpi-purple, #7a5ce0)", tint: "var(--kpi-purple-soft, #efeafe)", bd: "var(--kpi-purple-bd, #ddd0fa)"},
];

const BOTTOM_DEFAULT_TONE = {
    col: "var(--kpi-default, #2f68f5)",
    tint: "var(--kpi-default-soft, #f6f8fb)",
    bd: "var(--kpi-default-bd, #e5e9f0)",
};

/* Порядок значений в слотах нижнего ряда (см. комментарий выше о BOTTOM_SLOT_TONES).
   Слоты 1 и 2, а также 3 и 4, поменялись значениями местами — при этом их цвет
   остался прежним:
   - слот 1 (синий) — раньше "ВНД на актуализации под моей ответственностью",
     теперь "Записки на согласовании у меня" (sz-inbox);
   - слот 2 (фиолетовый) — раньше "Записки на согласовании у меня", теперь "ВНД на
     актуализации под моей ответственностью" (vnd-actualization);
   - слот 3 (оранжевый) — раньше "Записки с нарушением срока", теперь "Заявки на
     закупку в согласовании" (prc-approval);
   - слот 4 (красный) — раньше "Заявки на закупку в согласовании", теперь "Записки
     с нарушением срока" (sz-overdue);
   - слот 5 (фиолетовый) — "Закупки в процедуре" (prc-active) — без изменений. */
const BOTTOM_SLOT_ORDER = ["sz-inbox", "vnd-actualization", "prc-approval", "sz-overdue", "prc-active"];

// Нижний ряд, как и раньше, не локализован — короткие описания для тултипов держим
// здесь же, рядом с порядком слотов. При необходимости поправь текст под реальные
// формулировки бизнеса.
const BOTTOM_TOOLTIPS: Record<string, string> = {
    "sz-inbox": "Служебные записки, которые сейчас ожидают вашего решения как согласующего.",
    "vnd-actualization": "Документы, актуализация которых поручена вам как ответственному.",
    "prc-approval": "Заявки на закупку, которые сейчас проходят согласование.",
    "sz-overdue": "Служебные записки с нарушенным сроком согласования или исполнения.",
    "prc-active": "Закупки, которые сейчас находятся в активной процедуре проведения.",
};

interface HomeKpiSectionProps {
    summary: VndHomeSummary | null | undefined;
}

export function HomeKpiSection({summary}: HomeKpiSectionProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    // Общий запрос сводки дашборда для обоих рядов — раньше его дублировали
    // HomeKpiGrid и HomeContoursCard, каждый своим отдельным вызовом.
    const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
    useEffect(() => {
        let cancelled = false;
        dashboardService.summary()
            .then((d) => {
                if (!cancelled) setDashboard(d);
            })
            .catch(() => {
                if (!cancelled) setDashboard(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const tasksKpi = dashboard?.kpis.find((k) => k.code === "tasks");
    const topKpis = buildTopKpis(summary, tasksKpi?.label ?? "Мои задачи", tasksKpi?.value ?? 0);

    // "На актуализации под моей ответственностью" берётся из той же сводки ВНД
    // (summary), что уже используется верхним рядом — раньше нижний ряд запрашивал
    // её ещё раз отдельным вызовом useVndHomeSummary().
    const otherKpis = dashboard?.kpis.filter((k) => k.code !== "tasks") ?? [];
    const actualizationCard: DashboardKpi = {
        code: "vnd-actualization",
        label: "ВНД на актуализации под моей ответственностью",
        value: summary?.myResponsibleActualizations ?? 0,
        note: null,
        tone: "normal",
    };
    const byCode: Record<string, DashboardKpi> = Object.fromEntries(
        otherKpis.map((k) => [k.code, k] as const)
    );
    byCode["vnd-actualization"] = actualizationCard;
    const bottomCards: DashboardKpi[] = BOTTOM_SLOT_ORDER
        .map((code) => byCode[code])
        .filter((k): k is DashboardKpi => Boolean(k));

    return (
        <>
            {/* Верхний ряд — метрики по ВНД. Рендерится сразу, не дожидаясь dashboard
                (как и раньше в HomeKpiGrid): пока сводка не пришла, счётчик "Мои задачи"
                просто на мгновение показывает 0. */}
            <div className="mb-[12px] grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {topKpis.map((k, i) => (
                    <Tooltip key={k.labelKey ?? k.label} content={t(k.tooltipKey)} side="bottom" className="w-full">
                        <button
                            onClick={() => navigate(k.to)}
                            className="w-full cursor-pointer relative overflow-hidden rounded-[14px] border p-4 pb-[12px] text-left transition-transform hover:-translate-y-0.5"
                            style={{background: k.tint, borderColor: k.bd}}
                        >
                            <span className="kpi-shine-sweep" style={{animationDelay: `${(TOP_SHINE_SLOTS[i] ?? i) * -SHINE_SLOT_SECONDS}s`}} aria-hidden="true"/>
                            <span className="absolute inset-y-0 left-0 w-1" style={{background: k.col}}/>
                            <div className="flex items-center justify-between">
                                <span className="min-h-5 text-[12px] font-medium leading-[1.35] text-[#5b6675]">
                                    {k.labelKey ? t(k.labelKey) : k.label}
                                </span>
                                <Icon name="chevr" width={15} height={15} className="ml-2 flex-none text-[#c3ccd8]"/>
                            </div>
                            <div className="mt-1.5 flex items-baseline gap-2.5">
                                <span
                                    className="text-[31px] font-bold tracking-[-0.02em]"
                                    style={{color: k.col, fontFamily: "'IBM Plex Mono', monospace"}}
                                >
                                    {k.value}
                                </span>
                            </div>
                        </button>
                    </Tooltip>
                ))}
            </div>

            {/* Замещения и нижний ряд — ждут dashboard целиком (как раньше в
                HomeContoursCard), чтобы не показывать пустую сетку до загрузки. */}
            {dashboard && (
                <>
                    {dashboard.actingFor.length > 0 && (
                        <div className="mb-5 rounded-[14px] border border-[#f0c98a] bg-[#fffaf0] px-4 py-3">
                            <div className="text-[13px] font-semibold text-[#8a5a00]">Активно замещение</div>
                            {dashboard.actingFor.map((s) => (
                                <div key={s.id} className="mt-1 text-[12.5px] leading-[1.6] text-[#8a5a00]">
                                    Вы замещаете: <b>{s.userName}</b> — задачи перенаправлены вам автоматически
                                    с сохранением сроков. Период: {s.startsOn} — {s.endsOn}
                                    {s.reason ? ` · ${s.reason}` : ""}
                                </div>
                            ))}
                        </div>
                    )}

                    {dashboard.replacedBy.length > 0 && (
                        <div className="mb-5 rounded-[14px] border border-[#cbddff] bg-[#e9f0ff] px-4 py-3">
                            {dashboard.replacedBy.map((s) => (
                                <div key={s.id} className="text-[12.5px] leading-[1.6] text-[#2f68f5]">
                                    Вас замещает <b>{s.userName}</b> до {s.endsOn}
                                    {s.reason ? ` · ${s.reason}` : ""}
                                </div>
                            ))}
                        </div>
                    )}

                    {bottomCards.length > 0 && (
                        <div className="mb-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {bottomCards.map((k, i) => {
                                const tone = BOTTOM_SLOT_TONES[i] ?? BOTTOM_DEFAULT_TONE;
                                const tooltip = BOTTOM_TOOLTIPS[k.code];

                                // "ВНД на актуализации под моей ответственностью" ведёт на
                                // "Мои задачи" сразу на вкладку "Актуализация" (VndTasksPanel
                                // читает ?tab= при монтировании) — остальные карточки ведут
                                // туда же, куда вели раньше.
                                const target = k.code.startsWith("vnd")
                                    ? "/tasks?tab=actualization"
                                    : k.code.startsWith("sz")
                                        ? "/sz"
                                        : k.code.startsWith("prc")
                                            ? "/prc"
                                            : "/tasks";

                                return (
                                    <Tooltip key={k.code} content={tooltip ?? ""} side="bottom" disabled={!tooltip} className="w-full">
                                        <button
                                            onClick={() => navigate(target)}
                                            className="w-full cursor-pointer relative overflow-hidden rounded-[14px] border p-4 pb-[12px] text-left transition-transform hover:-translate-y-0.5"
                                            style={{background: tone.tint, borderColor: tone.bd}}
                                        >
                                            <span className="kpi-shine-sweep" style={{animationDelay: `${(BOTTOM_SHINE_SLOTS[i] ?? i) * -SHINE_SLOT_SECONDS}s`}} aria-hidden="true"/>
                                            <span className="absolute inset-y-0 left-0 w-1" style={{background: tone.col}}/>
                                            <div className="flex items-center justify-between">
                                                <span className="min-h-8 text-[12px] font-medium leading-[1.35] text-[#5b6675]">
                                                    {k.label}
                                                </span>
                                                <Icon name="chevr" width={15} height={15} className="ml-2 flex-none text-[#c3ccd8]"/>
                                            </div>
                                            <span
                                                className="mt-1.5 block text-[28px] font-bold tracking-[-0.02em]"
                                                style={{color: tone.col, fontFamily: "'IBM Plex Mono', monospace"}}
                                            >
                                                {k.value}
                                            </span>
                                        </button>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </>
    );
}
