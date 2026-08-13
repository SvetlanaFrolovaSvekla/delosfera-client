// Виджеты - сетка карточек с метриками деятельности ВНД
import {useTranslation} from "react-i18next";
import {Icon} from "@/components/icons/Icon";
import type {VndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";

interface KpiItem {
    labelKey: string;
    value: number;
    col: string;
    tint: string;
    bd: string;
}

function buildKpis(summary: VndHomeSummary | null | undefined): KpiItem[] {
    return [
        {
            /* На актуализации под моей ответственностью */
            labelKey: "home.kpi.myResponsibleActualizations",
            value: summary?.myResponsibleActualizations ?? 0,
            col: "#7a5ce0", tint: "#efeafe", bd: "#ddd0fa"
        },
        {
            /* Просроченные мной согласования в этом месяце */
            labelKey: "home.kpi.myTimeoutApprovalsThisMonth",
            value: summary?.myTimeoutApprovalsThisMonth ?? 0,
            col: "#c0392b", tint: "#fbe7e4", bd: "#f1c9c2"
        },
        {
            /* Мои ВНД, ожидающие согласования */
            labelKey: "home.kpi.myVndAwaitingApproval",
            value: summary?.myVndAwaitingApproval ?? 0,
            col: "#b3730a", tint: "#fdf3e0", bd: "#f0dcae"
        },
        {
            /* ВНД, которые мне необходимо согласовать */
            labelKey: "home.kpi.pendingMyApproval",
            value: summary?.pendingMyApproval ?? 0,
            col: "var(--app-accent, #2f68f5)",
            tint: "var(--app-soft, #e9f0ff)",
            bd: "var(--app-bd, #cbddff)"
        },
    ];
}

interface HomeKpiGridProps {
    summary: VndHomeSummary | null | undefined;
}

export function HomeKpiGrid({summary}: HomeKpiGridProps) {
    const {t} = useTranslation();
    const kpis = buildKpis(summary);

    return (
        <div className="mb-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
                <button
                    key={k.labelKey}
                    className="cursor-pointer relative overflow-hidden rounded-[14px] border p-4 pb-[17px] text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(15,27,45,.34)]"
                    style={{background: k.tint, borderColor: k.bd}}
                >
                    <span className="absolute inset-y-0 left-0 w-1" style={{background: k.col}}/>
                    <div className="flex items-center justify-between">
                        <span className="min-h-8 text-[12px] font-medium leading-[1.35] text-[#5b6675]">{t(k.labelKey)}</span>
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
            ))}
        </div>
    );
}