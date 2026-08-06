export interface TimeSeries {
    name: string;
    color: string;
    values: number[];
    area?: boolean;
}

interface TimeSeriesChartProps {
    labels: string[];
    series: TimeSeries[];
    height?: number;
}

const PAD_LEFT = 34;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;

export function TimeSeriesChart({labels, series, height = 240}: TimeSeriesChartProps) {
    const width = Math.max(labels.length * 56, 320);
    const plotW = width - PAD_LEFT - PAD_RIGHT;
    const plotH = height - PAD_TOP - PAD_BOTTOM;

    const allValues = series.flatMap((s) => s.values);
    const maxVal = Math.max(...allValues, 1);
    const niceMax = Math.ceil(maxVal / 4) * 4 || 4;

    if (labels.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-[12.5px] text-[#a3adbd] py-8">
                Нет данных за выбранный период
            </div>
        );
    }

    const xStep = labels.length > 1 ? plotW / (labels.length - 1) : 0;
    const yFor = (v: number) => PAD_TOP + plotH - (v / niceMax) * plotH;
    const xFor = (i: number) => PAD_LEFT + (labels.length > 1 ? i * xStep : plotW / 2);

    const gridLines = [0, 1, 2, 3, 4].map((i) => niceMax - (niceMax / 4) * i);

    return (
        <div className="overflow-x-auto">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{minWidth: "100%"}}>
                {gridLines.map((val, i) => (
                    <g key={i}>
                        <line
                            x1={PAD_LEFT}
                            x2={width - PAD_RIGHT}
                            y1={yFor(val)}
                            y2={yFor(val)}
                            stroke="#eef2f7"
                            strokeWidth={1}
                        />
                        <text x={0} y={yFor(val) + 3} fontSize={10} fill="#a3adbd">
                            {Math.round(val)}
                        </text>
                    </g>
                ))}

                {labels.map((l, i) => (
                    <text
                        key={i}
                        x={xFor(i)}
                        y={height - 6}
                        fontSize={10}
                        fill="#8b97ab"
                        textAnchor="middle"
                    >
                        {l.length > 9 ? `${l.slice(0, 8)}…` : l}
                    </text>
                ))}

                {series.map((s, si) => {
                    const points = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
                    const areaPoints = `${PAD_LEFT},${yFor(0)} ${points} ${xFor(labels.length - 1)},${yFor(0)}`;
                    return (
                        <g key={si}>
                            {s.area && (
                                <polygon points={areaPoints} fill={s.color} opacity={0.08} stroke="none"/>
                            )}
                            <polyline
                                points={points}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={2.25}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                            {s.values.map((v, i) => (
                                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3} fill="#fff" stroke={s.color} strokeWidth={2}>
                                    <title>{`${s.name} · ${labels[i]}: ${v}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}
            </svg>

            <div className="flex items-center gap-4 flex-wrap mt-2 px-1">
                {series.map((s, i) => (
                    <div key={i} className="flex items-center gap-[6px] text-[12px] text-[#55617a]">
                        <span className="w-[9px] h-[9px] rounded-full" style={{background: s.color}}/>
                        {s.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
