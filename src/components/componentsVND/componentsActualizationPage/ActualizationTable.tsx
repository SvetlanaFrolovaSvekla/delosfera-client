import {Link} from "react-router-dom";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {ColDef} from "@/constants/columnsFilters/vndColumns.ts";
import {ACTUALIZATION_BUCKET_META} from "@/constants/actualizationBucket.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {daysUntil} from "@/utils/dateUtils.ts";

interface ActualizationTableProps {
    columns: ColDef[];
    rows: VndResponse[];
    gridTemplate: string;
    responsibleExecutorNames: (ids: number[]) => string;
    keywordNames: (ids: number[]) => string;
    secrecyLevelName: (id?: number) => string;
    userGroupNames: (ids: number[]) => string;
    rubricNames: (ids: number[]) => string;
    onResetFilters: () => void;
}

const LAST_ACT_STATUS_LABEL = {
    true: "С изменениями",
    false: "Без изменений",
} as const;

export function ActualizationTable({
                                       columns, rows, gridTemplate,
                                       responsibleExecutorNames, keywordNames, secrecyLevelName, userGroupNames, rubricNames,
                                       onResetFilters,
                                   }: ActualizationTableProps) {
    if (rows.length === 0) {
        return (
            <EmptyState
                title="Ничего не найдено"
                description="Попробуйте изменить фильтры или поисковый запрос."
                actionLabel="Сбросить фильтры"
                onAction={onResetFilters}
            />
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
                        <div key={c.key} className="whitespace-nowrap">{c.label}</div>
                    ))}
                </div>

                {rows.map((r) => {
                    const meta = STATUS_META[r.status];
                    const StatusIcon = meta.icon;
                    const bucketMeta = r.actualizationBucket ? ACTUALIZATION_BUCKET_META[r.actualizationBucket] : null;
                    const days = daysUntil(r.dueActualizationDate);
                    // Последняя актуализация или дата создания, если актуализаций ещё не было
                    const lastActDisplay = r.lastActualizationDate ?? r.createdAt?.slice(0, 10) ?? null;

                    return (
                        <Link
                            key={r.id}
                            to={`/base-vnd/${r.id}`}
                            onClick={(e) => {
                                const selection = window.getSelection();
                                if (selection && selection.toString().length > 0) {
                                    e.preventDefault();
                                }
                            }}
                            className="group no-underline w-full grid gap-3 items-start px-5 py-3.5 border-b border-[#f3f6f9] bg-transparent text-left cursor-pointer hover:bg-[#f8fafc] select-text"
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
                                    case "code":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="font-mono text-[12px] font-semibold text-[#4e57d6]">{r.code}</span>
                                            </div>
                                        );
                                    case "name":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[13.5px] font-medium text-[#1c2740] whitespace-normal break-words line-clamp-5 group-hover:underline decoration-1 underline-offset-1">
                                                    {r.name}
                                                </span>
                                            </div>
                                        );
                                    case "type":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{r.typeName || "—"}</span>
                                            </div>
                                        );
                                    case "developer":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{r.developerName || "—"}</span>
                                            </div>
                                        );
                                    case "organ":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{r.organName || "—"}</span>
                                            </div>
                                        );
                                    case "rubric":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{rubricNames(r.rubricIds)}</span>
                                            </div>
                                        );
                                    case "responsibleExecutors":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{responsibleExecutorNames(r.responsibleExecutorIds)}</span>
                                            </div>
                                        );
                                    case "adoptionDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{r.adoptionDate || "—"}</span>
                                            </div>
                                        );
                                    case "adoptionCode":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{r.adoptionCode || "—"}</span>
                                            </div>
                                        );
                                    case "effectiveDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{r.effectiveDate || "—"}</span>
                                            </div>
                                        );
                                    case "requisitesChangedDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{r.requisitesChangedDate || "—"}</span>
                                            </div>
                                        );
                                    case "revisionChangedDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{r.revisionChangedDate || "—"}</span>
                                            </div>
                                        );
                                    case "keywords":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{keywordNames(r.keywordIds)}</span>
                                            </div>
                                        );
                                    case "secrecyLevel":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{secrecyLevelName(r.secrecyLevelId)}</span>
                                            </div>
                                        );
                                    case "userGroups":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">{userGroupNames(r.userGroupIds)}</span>
                                            </div>
                                        );
                                    case "dueActualizationDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                {r.dueActualizationDate ? (
                                                    <>
                                                        <span className="flex items-center gap-[7px]">
                                                            <span
                                                                className="w-[9px] h-[9px] flex-none rounded-full"
                                                                style={{background: bucketMeta?.color ?? "#a3adbd"}}
                                                            />
                                                            <span className="text-[12px] text-[#55617a] whitespace-nowrap">{r.dueActualizationDate}</span>
                                                        </span>
                                                        {days !== null && (
                                                            <span
                                                                className="block text-[11px] font-semibold mt-0.5"
                                                                style={{color: bucketMeta?.color ?? "#a3adbd"}}
                                                            >
                                                                {days < 0 ? `−${Math.abs(days)} дн` : `через ${days} дн`}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[12px] text-[#a3adbd]">—</span>
                                                )}
                                            </div>
                                        );
                                    case "lastActualizationDate":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="text-[12px] text-[#55617a]">{lastActDisplay || "—"}</span>
                                                {!r.lastActualizationDate && lastActDisplay && (
                                                    <span className="block text-[10.5px] text-[#a3adbd] mt-0.5">дата создания</span>
                                                )}
                                            </div>
                                        );
                                    case "lastActualizationStatus":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                {r.lastActualizationDate ? (
                                                    <span
                                                        className={
                                                            r.lastActualizationHadChanges
                                                                ? "text-[12px] font-semibold text-[#35373d]"
                                                                : "text-[12px] text-[#55617a]"
                                                        }
                                                    >
                                                        {LAST_ACT_STATUS_LABEL[String(r.lastActualizationHadChanges) as "true" | "false"]}
                                                    </span>
                                                ) : (
                                                    <span className="text-[12px] text-[#55617a]">—</span>
                                                )}
                                            </div>
                                        );
                                    case "actualizationBucket":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                {bucketMeta ? (
                                                    <span
                                                        className="inline-flex items-center text-[11px] font-semibold py-0.5 px-[9px] rounded-full whitespace-nowrap"
                                                        style={{color: bucketMeta.color, background: bucketMeta.bg}}
                                                    >
                                                        {bucketMeta.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-[12px] text-[#a3adbd]">—</span>
                                                )}
                                            </div>
                                        );
                                    default:
                                        return <div key={c.key}/>;
                                }
                            })}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}