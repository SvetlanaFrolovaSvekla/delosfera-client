import {STATUS_META} from "@/constants/vndStatus.ts";
import type {VndOrgUnitStatusMatrixItem} from "@/service/analyticsService/vndAnalyticsServiceType.ts";

const STATUS_ORDER: Array<VndOrgUnitStatusMatrixItem["status"]> = ["active", "onact", "review", "consol", "draft", "arch"];

interface StatusHeatmapProps {
    items: VndOrgUnitStatusMatrixItem[];
    maxRows?: number;
}

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function StatusHeatmap({items, maxRows = 12}: StatusHeatmapProps) {
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-[12.5px] text-[#a3adbd] py-8">
                Нет данных
            </div>
        );
    }

    const orgUnits = Array.from(new Set(items.map((i) => i.orgUnitId))).map((id) => {
        const found = items.find((i) => i.orgUnitId === id)!;
        const total = items.filter((i) => i.orgUnitId === id).reduce((s, i) => s + i.count, 0);
        return {id, label: found.orgUnitLabel, total};
    });

    orgUnits.sort((a, b) => b.total - a.total);
    const rows = orgUnits.slice(0, maxRows);

    const maxCount = Math.max(...items.map((i) => i.count), 1);

    const cellFor = (orgUnitId: number, status: string) =>
        items.find((i) => i.orgUnitId === orgUnitId && i.status === status)?.count ?? 0;

    return (
        <div className="overflow-x-auto">
            <table className="border-collapse w-full min-w-[560px]">
                <thead>
                <tr>
                    <th className="text-left text-[11.5px] font-semibold text-[#8b97ab] pb-2 pr-2 sticky left-0 bg-white">
                        Подразделение
                    </th>
                    {STATUS_ORDER.map((s) => (
                        <th key={s} className="text-center text-[11px] font-semibold text-[#8b97ab] pb-2 px-1 whitespace-nowrap">
                            {STATUS_META[s].label}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={row.id}>
                        <td className="text-[12.5px] text-[#3a4560] py-1 pr-2 max-w-[180px] truncate sticky left-0 bg-white" title={row.label}>
                            {row.label}
                        </td>
                        {STATUS_ORDER.map((s) => {
                            const count = cellFor(row.id, s);
                            const [r, g, b] = hexToRgb(STATUS_META[s].color);
                            const alpha = count === 0 ? 0 : 0.12 + (count / maxCount) * 0.68;
                            return (
                                <td key={s} className="p-1 text-center">
                                    <div
                                        className="rounded-[7px] h-8 min-w-[42px] flex items-center justify-center text-[12px] font-semibold"
                                        style={{
                                            background: `rgba(${r},${g},${b},${alpha})`,
                                            color: alpha > 0.4 ? "#fff" : "#8b97ab",
                                        }}
                                        title={`${row.label} — ${STATUS_META[s].label}: ${count}`}
                                    >
                                        {count > 0 ? count : ""}
                                    </div>
                                </td>
                            );
                        })}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
