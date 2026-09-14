import {useEffect, useState} from "react";
import {ChartCard} from "@/components/componentsReport/ChartCard.tsx";
import {HorizontalBarList, type BarDatum} from "@/components/componentsReport/HorizontalBarList.tsx";
import type {ContourReport} from "@/service/analyticsService/contourReportsService.ts";

/**
 * Отчёт по контуру (АН-1..4): KPI-плашки сверху, распределения ниже. Единый вид для
 * закупок, заседаний, кадрового ДО и канцелярии — данные приходят в общем формате.
 */
interface Props {
    load: () => Promise<ContourReport>;
}

const toneColor: Record<string, string> = {
    normal: "#0f1b2d",
    warning: "#b3730a",
    danger: "#c0392b",
};

export function ContourReportView({load}: Props) {
    const [report, setReport] = useState<ContourReport | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        setReport(null);
        setError(false);
        load()
            .then(r => alive && setReport(r))
            .catch(() => alive && setError(true));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) return <div className="mt-2 text-[13px] text-[#c0392b]">Не удалось загрузить отчёт</div>;
    if (!report) return <div className="mt-2 text-[13px] text-[#8b97ab]">Загрузка…</div>;

    return (
        <div className="mt-2 flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {report.kpis.map((k, i) => (
                    <div key={i} className="bg-white border border-[#e9edf3] rounded-2xl p-4 min-w-0">
                        <div className="text-[20px] font-bold leading-tight truncate" style={{color: toneColor[k.tone] ?? toneColor.normal}}>
                            {k.value}
                        </div>
                        <div className="text-[12px] text-[#8b97ab] font-medium truncate">{k.label}</div>
                        {k.note && <div className="text-[11px] text-[#a3adbd] mt-[2px] truncate">{k.note}</div>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {report.charts.map((ch, i) => {
                    const data: BarDatum[] = ch.points.map(p => ({label: p.label, value: p.value, percent: p.percent}));
                    return (
                        <ChartCard key={i} title={ch.title} minHeight={200}>
                            <HorizontalBarList data={data}/>
                        </ChartCard>
                    );
                })}
            </div>
        </div>
    );
}
