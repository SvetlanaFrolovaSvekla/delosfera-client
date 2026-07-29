import {Clock, SearchX} from "lucide-react";
import {useTranslation} from "react-i18next";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import type {ColDef} from "@/constants/vndColumns.ts";

interface VndTableProps {
    columns: ColDef[];
    rows: VndResponse[];
    gridTemplate: string;
    daysUntil: (dateStr: string | null | undefined) => number | null;
    rygColor: (days: number) => string;
    responsibleExecutorNames: (ids: number[]) => string;
    keywordNames: (ids: number[]) => string;
    secrecyLevelName: (id?: number) => string;
    userGroupNames: (ids: number[]) => string;
    onResetFilters: () => void;
    rubricNames: (ids: number[]) => string;
}

const LAST_ACT_STATUS_LABEL = {
    true: "С изменениями",
    false: "Без изменений",
} as const;

export function VndTable({
                             columns,
                             rows,
                             gridTemplate,
                             daysUntil,
                             rygColor,
                             responsibleExecutorNames,
                             keywordNames,
                             secrecyLevelName,
                             userGroupNames,
                             onResetFilters,
                             rubricNames,
                         }: VndTableProps) {
    const {t} = useTranslation();

    if (rows.length === 0) {
        return (
            <div
                className="bg-white border border-[#e9edf3] rounded-2xl py-20 px-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f2f5f9] grid place-items-center mb-4">
                    <SearchX className="w-6 h-6 text-[#a3adbd]" strokeWidth={1.6}/>
                </div>
                <h3 className="m-0 text-[15px] font-semibold text-[#26324a]">
                    {t("vnd.emptyState.title")}
                </h3>
                <p className="mt-[6px] mb-5 text-[13px] text-[#8b97ab] max-w-[340px]">
                    {t("vnd.emptyState.description")}
                </p>
                <button
                    onClick={onResetFilters}
                    className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                >
                    {t("vnd.emptyState.resetFilters")}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-x-auto">
            <div className="w-full">
                <div
                    className="grid gap-3 px-5 py-3 border-b border-[#eef2f7] bg-[#fafbfd] text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]"
                    style={{gridTemplateColumns: gridTemplate}}
                >
                    {columns.map((c) => (
                        <div key={c.key} className="whitespace-nowrap">
                            {c.label}
                        </div>
                    ))}
                </div>

                {rows.map((r) => {
                    const meta = STATUS_META[r.status];
                    const StatusIcon = meta.icon;
                    const days = daysUntil(r.dueActualizationDate);
                    const dot = days !== null ? rygColor(days) : "#a3adbd";

                    return (
                        <button
                            key={r.id}
                            className="w-full grid gap-3 items-start px-5 py-3.5 border-none border-b border-[#f3f6f9] bg-transparent text-left cursor-pointer hover:bg-[#f8fafc]"
                            style={{gridTemplateColumns: gridTemplate}}
                        >
                            {columns.map((c) => {
                                switch (c.key) {
                                    case "statusIcon":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="w-7 h-7 rounded-lg grid place-items-center"
                                                    style={{background: meta.bg, color: meta.color}}
                                                    title={meta.label}
                                                >
                                                    <StatusIcon className="w-[15px] h-[15px]" strokeWidth={2}/>
                                                </span>
                                            </div>
                                        );
                                    case "code":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="font-mono text-[12px] font-semibold text-[#4e57d6]">
                                                    {r.code}
                                                </span>
                                            </div>
                                        );
                                    case "name":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[13.5px] font-medium text-[#1c2740] whitespace-normal break-words line-clamp-5">
                                                    {r.name}
                                                </span>
                                            </div>
                                        );
                                    case "type":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] capitalize whitespace-normal break-words line-clamp-5">
                                                    {r.typeName || "—"}
                                                </span>
                                            </div>
                                        );
                                    case "developer":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {r.developerName || "—"}
                                                </span>
                                            </div>
                                        );
                                    case "organ":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {r.organName || "—"}
                                                </span>
                                            </div>
                                        );
                                    case "rubric":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                 {rubricNames(r.rubricIds)}
                                                </span>
                                            </div>
                                        );
                                    case "act":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                {r.dueActualizationDate ? (
                                                    <>
                                                        <span className="flex items-center gap-[7px]">
                                                            <span
                                                                className="w-[9px] h-[9px] flex-none rounded-full"
                                                                style={{background: dot}}
                                                            />
                                                            <span
                                                                className="text-[12px] text-[#55617a] whitespace-nowrap">
                                                                {r.dueActualizationDate}
                                                            </span>
                                                        </span>
                                                        {days !== null && (
                                                            <span
                                                                className="block text-[11px] font-semibold mt-0.5"
                                                                style={{color: dot}}
                                                            >
                                                                {days < 0
                                                                    ? `−${Math.abs(days)} дн`
                                                                    : `через ${days} дн`}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[12px] text-[#a3adbd]">—</span>
                                                )}
                                            </div>
                                        );
                                    case "cancelInfo":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <div className="text-[12.5px] text-[#26324a]">
                                                    {r.cancelDate || "—"}
                                                </div>
                                                <div className="text-[11px] text-[#8b97ab] mt-px">
                                                    {r.cancelCode}
                                                </div>
                                            </div>
                                        );
                                    case "daysInArchive":
                                        return (
                                            <div key={c.key} className="min-w-0 flex items-center gap-[7px]">
                                                <Clock className="w-[14px] h-[14px] text-[#a3adbd]" strokeWidth={1.9}/>
                                                <span className="font-mono text-[12px] text-[#55617a]">
                                                    {r.daysInArchive ?? "—"} дн
                                                </span>
                                            </div>
                                        );
                                    case "status":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="inline-flex items-center text-[11px] font-semibold py-0.5 px-[9px] rounded-full whitespace-nowrap"
                                                    style={{color: meta.color, background: meta.bg}}
                                                >
                                                    {meta.label}
                                                </span>
                                            </div>
                                        );
                                    case "archivedDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.archivedDate || "—"}</span>
                                            </div>
                                        );
                                    case "responsibleExecutors":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {responsibleExecutorNames(r.responsibleExecutorIds)}
                                                </span>
                                            </div>
                                        );
                                    case "adoptionDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.adoptionDate || "—"}</span>
                                            </div>
                                        );
                                    case "adoptionCode":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.adoptionCode || "—"}</span>
                                            </div>
                                        );
                                    case "effectiveDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.effectiveDate || "—"}</span>
                                            </div>
                                        );
                                    case "requisitesChangedDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.requisitesChangedDate || "—"}</span>
                                            </div>
                                        );
                                    case "revisionChangedDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.revisionChangedDate || "—"}</span>
                                            </div>
                                        );
                                    case "cancelDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.cancelDate || "—"}</span>
                                            </div>
                                        );
                                    case "cancelCode":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.cancelCode || "—"}</span>
                                            </div>
                                        );
                                    case "dueActualizationDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.dueActualizationDate || "—"}</span>
                                            </div>
                                        );
                                    case "lastActualizationDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{r.lastActualizationDate || "—"}</span>
                                            </div>
                                        );
                                    case "lastActualizationStatus":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">
                                                    {r.lastActualizationDate
                                                        ? LAST_ACT_STATUS_LABEL[String(r.lastActualizationHadChanges) as "true" | "false"]
                                                        : "—"}
                                                </span>
                                            </div>
                                        );
                                    case "keywords":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {keywordNames(r.keywordIds)}
                                                </span>
                                            </div>
                                        );
                                    case "secrecyLevel":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="text-[12px] text-[#55617a]">{secrecyLevelName(r.secrecyLevelId)}</span>
                                            </div>
                                        );
                                    case "userGroups":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {userGroupNames(r.userGroupIds)}
                                                </span>
                                            </div>
                                        );
                                    default:
                                        return <div key={c.key}/>;
                                }
                            })}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}