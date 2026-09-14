import {useEffect, useState} from "react";
import {AlertTriangle, Clock, ListChecks, ShieldCheck} from "lucide-react";
import {ChartCard} from "@/components/componentsReport/ChartCard.tsx";
import {KpiCard} from "@/components/componentsReport/KpiCard.tsx";
import {HorizontalBarList, type BarDatum} from "@/components/componentsReport/HorizontalBarList.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {
    slaAnalyticsService,
    type SlaOverviewResponse,
    type SlaViolatorItem,
} from "@/service/analyticsService/slaAnalyticsService.ts";

/**
 * Дашборд соблюдения сроков (СК-2): срез по всей организации, для руководства.
 *
 * Рабочий стол отвечает «что в моей очереди», этот дашборд — «где по банку горят
 * сроки»: сколько задач открыто, сколько просрочено, в каком контуре хуже всего и
 * кто накопил больше всего просрочек. Источники — те же, что у единого реестра
 * задач: записки, закупки, согласование ВНД, ознакомление.
 */

/** Цвет по доле соблюдения: зелёный — норма, жёлтый — тревога, красный — плохо. */
function complianceColor(percent: number): string {
    if (percent >= 90) return "#16a34a";
    if (percent >= 75) return "#d97706";
    return "#dc2626";
}

export function SlaDashboardPage() {
    const [overview, setOverview] = useState<SlaOverviewResponse | null>(null);
    const [violators, setViolators] = useState<SlaViolatorItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [o, v] = await Promise.all([
                    slaAnalyticsService.getOverview(),
                    slaAnalyticsService.getTopOverdue(15),
                ]);
                if (!alive) return;
                setOverview(o);
                setViolators(v);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    if (loading) return <Loader/>;
    if (!overview) return null;

    const complianceHue = complianceColor(overview.compliancePercent);

    const overdueBars: BarDatum[] = overview.contours.map(c => ({
        label: c.label,
        value: c.overdue,
        percent: overview.overdue > 0 ? Math.round((c.overdue / overview.overdue) * 100) : 0,
        color: "#dc2626",
    }));

    const complianceBars: BarDatum[] = [...overview.contours]
        .sort((a, b) => a.compliancePercent - b.compliancePercent)
        .map(c => ({
            label: c.label,
            value: c.compliancePercent,
            color: complianceColor(c.compliancePercent),
        }));

    const violatorBars: BarDatum[] = violators.map(v => ({
        label: v.orgUnitLabel ? `${v.fullName} · ${v.orgUnitLabel}` : v.fullName,
        value: v.overdue,
        percent: v.open > 0 ? Math.round((v.overdue / v.open) * 100) : 0,
        color: "#dc2626",
    }));

    return (
        <div className="mt-2 flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    label="Открытых задач" value={overview.openTasks}
                    icon={ListChecks} color="#4e57d6" bg="#eef0ff"
                    hint="по всем контурам"
                />
                <KpiCard
                    label="Просрочено" value={overview.overdue}
                    icon={AlertTriangle} color="#dc2626" bg="#fdecec"
                    hint={overview.openTasks > 0
                        ? `${Math.round((overview.overdue / overview.openTasks) * 100)}% от открытых`
                        : undefined}
                />
                <KpiCard
                    label="Срок в ближайшие 24 ч" value={overview.dueSoon}
                    icon={Clock} color="#d97706" bg="#fef3e2"
                    hint="ещё не нарушен"
                />
                <KpiCard
                    label="Соблюдение SLA" value={`${overview.compliancePercent}%`}
                    icon={ShieldCheck} color={complianceHue} bg="#eef7f0"
                    hint="задач в срок"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Просрочка по контурам" subtitle="Число задач с нарушенным сроком" minHeight={220}>
                    <HorizontalBarList data={overdueBars}/>
                </ChartCard>

                <ChartCard title="Соблюдение SLA по контурам" subtitle="Доля задач в срок, %" minHeight={220}>
                    <HorizontalBarList data={complianceBars} valueSuffix="%"/>
                </ChartCard>
            </div>

            <ChartCard title="Топ по просрочке" subtitle="Сотрудники с наибольшим числом просроченных задач" minHeight={200}>
                <HorizontalBarList data={violatorBars}/>
            </ChartCard>
        </div>
    );
}
