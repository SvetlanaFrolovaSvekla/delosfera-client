// Read-only блок норматива (уже установленное значение по запущенному согласованию)
import React from "react";
import {formatDateTime} from "@/utils/dateUtils.ts";

export type NormPhaseStatus = "passed" | "current" | "upcoming";

interface NormBlockViewProps {
    label: string;
    /** Суммарное значение норматива в минутах */
    value: number;
    phaseStatus: NormPhaseStatus;
    blockRef?: React.Ref<HTMLDivElement>;
    /** Дата и время начала этой фазы - показывается только у уже начавшихся фаз (passed/current),
     * для "upcoming" фаза ещё не наступила и даты начала попросту нет. */
    startedAt?: string | null;
}

const PHASE_STYLES: Record<
NormPhaseStatus,
    { container: string; text: string; badgeBorder: string; badgeText: string }
    > = {
        passed: {
            container: "border border-[#d7e5da] bg-white shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]",
            text: "text-[#6f9179]",
            badgeBorder: "border-[#d7e5da]",
            badgeText: "text-[#6f9179]",
        },
        current: {
            container: "border border-[#f0dcae] bg-gradient-to-b from-[#fdf6e8] to-white shadow-[0_2px_5px_-2px_rgba(179,115,10,0.25)]",
            text: "text-[#b3730a]",
            badgeBorder: "border-[#f0dcae]",
            badgeText: "text-[#b3730a]",
        },
        upcoming: {
            container: "border border-slate-200 bg-white shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]",
            text: "text-[#8b97ab]",
            badgeBorder: "border-[#e5e9f0]",
            badgeText: "text-[#6b7488]",
        },
    };

function formatDuration(totalMinutes: number): string {
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} дн.`);
    if (hours > 0) parts.push(`${hours} ч.`);
    if (minutes > 0) parts.push(`${minutes} м.`);

    return parts.length > 0 ? parts.join(" ") : "0 м.";
}

export function NormBlockView({label, value, phaseStatus, blockRef, startedAt}: NormBlockViewProps) {
    const style = PHASE_STYLES[phaseStatus];

    return (
        <div
            ref={blockRef}
            className={`relative flex w-[280px] flex-none items-start gap-3 rounded-2xl p-4 ${style.container}`}
        >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-[12px] font-medium leading-tight ${style.text}`}>
                    {label}
                </span>
                {startedAt && (
                    <span className="text-[10.5px] leading-tight text-[#a3adbd]">
                        Этап начался {formatDateTime(startedAt)}
                    </span>
                )}
            </span>
            <span
                className={`flex-none whitespace-nowrap rounded-[8px] border bg-white px-2.5 py-1 text-[12.5px] font-semibold ${style.badgeBorder} ${style.badgeText}`}
            >
                {formatDuration(value)}
            </span>
        </div>
    );
}