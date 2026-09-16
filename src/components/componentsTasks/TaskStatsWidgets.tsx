import {useTranslation} from "react-i18next";
import type {TaskStatGroup} from "@/service/workflowService/taskInboxService.ts";

interface KpiProps {
    label: string;
    value: number;
    tone?: "bad" | "warn";
}

/** Плитка с одним числом статистики (например, "Просрочено: 4"). */
export function Kpi({label, value, tone}: KpiProps) {
    const color = tone === "bad" ? "#c0392b" : tone === "warn" ? "#b3730a" : "#0f1b2d";
    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white px-4 py-3.5">
            <div className="text-[22px] font-bold leading-none" style={{color}}>{value}</div>
            <div className="mt-1.5 text-[12px] text-[#8b97ab]">{label}</div>
        </div>
    );
}

interface GroupCardProps {
    title: string;
    groups: TaskStatGroup[];
}

/** Карточка с разбивкой по группам (контурам/типам) и горизонтальными полосками. */
export function GroupCard({title, groups}: GroupCardProps) {
    const {t} = useTranslation();
    const max = Math.max(1, ...groups.map((g) => g.count));

    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white p-5">
            <div className="text-[14px] font-semibold text-[#0f1b2d]">{title}</div>
            {groups.length === 0 ? (
                <div className="mt-3 text-[13px] text-[#8b97ab]">{t("tasks.stats.noOpenTasks")}</div>
            ) : (
                <div className="mt-4 flex flex-col gap-3">
                    {groups.map((g) => (
                        <div key={g.key}>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[13px] text-[#374253]">{g.title}</span>
                                <span className="text-[13px] tabular-nums text-[#6b7688]">
                                    {g.count}
                                    {g.overdue > 0 && (
                                        <span className="ml-1.5 text-[#c0392b]">
                                            · {t("tasks.stats.overdueSuffix", {count: g.overdue})}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[#eef2f7]">
                                <div
                                    className="h-full rounded-full bg-[#4e57d6]"
                                    style={{width: `${Math.round((g.count / max) * 100)}%`}}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
