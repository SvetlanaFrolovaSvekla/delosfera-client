import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {useActualizationBucketMeta} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import {HighlightText} from "@/utils/HighlightText.tsx";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {getSimplifiedVndStatus, getVndDisplayMeta, SIMPLE_STATUS_META} from "@/constants/vndStatus.ts";
import {LINKED_TO_ME_RELATION_META, type LinkedToMeRelationKey} from "@/constants/linkedToMeRelations.ts";
import type {ColDef} from "@/constants/columnsFilters/vndColumns.ts";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Clock} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

interface VndTableProps {
    columns: ColDef[];
    rows: VndResponse[];
    gridTemplate: string;
    daysUntil: (dateStr: string | null | undefined) => number | null;
    responsibleExecutorNames: (ids: number[]) => string;
    keywordNames: (ids: number[]) => string;
    secrecyLevelName: (id?: number) => string;
    userGroupNames: (ids: number[]) => string;
    onResetFilters: () => void;
    rubricNames: (ids: number[]) => string;
    searchQuery: string;
    /** Право ViewVndRegistryExtended — без него значок статуса упрощается до
     * действующий/архивированный/черновик, без деталей о стадии жизненного цикла */
    canViewExtended: boolean;
}

export function VndTable({
                             columns,
                             rows,
                             gridTemplate,
                             daysUntil,
                             responsibleExecutorNames,
                             keywordNames,
                             secrecyLevelName,
                             userGroupNames,
                             onResetFilters,
                             rubricNames,
                             searchQuery,
                             canViewExtended
                         }: VndTableProps) {
    const {t} = useTranslation();
    const bucketMetaMap = useActualizationBucketMeta();

    const lastActualizationStatusLabel = (hadChanges: boolean) =>
        hadChanges
            ? t("vnd.lastActualizationStatus.withChanges")
            : t("vnd.lastActualizationStatus.withoutChanges");

    if (rows.length === 0) {
        return (
            <EmptyState
                title={t("vnd.emptyState.title")}
                description={t("vnd.emptyState.description")}
                actionLabel={t("vnd.emptyState.resetFilters")}
                onAction={onResetFilters}
            />
        );
    }

    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-x-auto">
            <div className="w-full">
                <div
                    className="grid gap-3 px-5 py-3 border-b border-[#f0f0f0] bg-[#fafbfd] text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]"
                    style={{gridTemplateColumns: gridTemplate}}
                >
                    {columns.map((c) => (
                        <div key={c.key} className="whitespace-nowrap">
                            {c.label}
                        </div>
                    ))}
                </div>

                {rows.map((r) => {
                    // Без права ViewVndRegistryExtended значок первой колонки показывает только
                    // упрощённый статус ВНД (действующий/архивированный/черновик), без деталей
                    // о стадии жизненного цикла (на актуализации/согласовании/консолидации)
                    const meta = canViewExtended
                        ? getVndDisplayMeta(r.status, r.effectiveDate)
                        : SIMPLE_STATUS_META[getSimplifiedVndStatus(r.status)];
                    const StatusIcon = meta.icon;
                    const days = daysUntil(r.dueActualizationDate);
                    const bucketMeta = r.actualizationBucket ? bucketMetaMap[r.actualizationBucket] : null;
                    const dot = bucketMeta?.color ?? "#a3adbd";

                    return (
                        <Link
                            to={`/base-vnd/${r.id}`}
                            onClick={(e) => {
                                // Не переходим, если пользователь выделял текст (копировал) обычным левым кликом
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
                                    case "code":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span className="font-mono text-[12px] font-semibold text-[#4e57d6]">
                                                    <HighlightText text={r.code} query={searchQuery} />
                                                </span>
                                            </div>
                                        );
                                    case "name":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <Tooltip content={r.name} side="top" className="w-full">
                                                    <span
                                                        className="text-[13.5px] font-medium text-[#1c2740] whitespace-normal break-words line-clamp-[7] group-hover:underline decoration-1 underline-offset-1">
                                                        <HighlightText text={r.name} query={searchQuery}/>
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        );
                                    case "type":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] capitalize whitespace-normal break-words line-clamp-5">
                                                    {r.typeName || "—"}
                                                </span>
                                            </div>
                                        );
                                    case "developer":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {r.developerName || "—"}
                                                </span>
                                            </div>
                                        );
                                    case "organ":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
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
                                                                    ? t("vnd.overdueByDays", {count: Math.abs(days)})
                                                                    : t("vnd.dueInDays", {count: days})}
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
                                                    {r.daysInArchive ?? "—"} {t("vnd.daysUnit")}
                                                </span>
                                            </div>
                                        );
                                    case "status":
                                        return (
                                            <div key={c.key} className="min-w-0 flex justify-center">
                                                <span
                                                    className="inline-flex items-center text-[11px] font-semibold py-0.5 px-[9px] rounded-full whitespace-nowrap"
                                                    style={{color: meta.color, background: meta.bg}}
                                                >
                                                    {meta.label}
                                                </span>
                                            </div>
                                        );
                                    case "linkedToMe": {
                                        const relations = (r.linkedToMeRelations ?? []) as LinkedToMeRelationKey[];
                                        const sorted = [...relations].sort(
                                            (a, b) => (LINKED_TO_ME_RELATION_META[a]?.order ?? 0) - (LINKED_TO_ME_RELATION_META[b]?.order ?? 0)
                                        );
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                {sorted.length === 0 ? (
                                                    <span className="text-[12px] text-[#a3adbd]">—</span>
                                                ) : (
                                                    <span className="block text-[12px] whitespace-normal break-words line-clamp-5">
                                                        {sorted.map((key, i) => {
                                                            const relMeta = LINKED_TO_ME_RELATION_META[key];
                                                            if (!relMeta) return null;
                                                            return (
                                                                <span key={key}>
                                                                    <span style={{color: relMeta.color}} className="font-semibold">
                                                                        {relMeta.label}
                                                                    </span>
                                                                    {i < sorted.length - 1 && (
                                                                        <span className="text-[#a3adbd]">{"; "}</span>
                                                                    )}
                                                                </span>
                                                            );
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }
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
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
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
                                                        ? lastActualizationStatusLabel(r.lastActualizationHadChanges)
                                                        : "—"}
                                                </span>
                                            </div>
                                        );
                                    case "keywords":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
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
                                    case "redactionCount":
                                        return (
                                            <div key={c.key} className="min-w-0 flex justify-center">
                                                <Tooltip content="Кол-во редакций (актуальных и нет)" side="top">
                                                    <span
                                                        className="inline-flex items-center justify-center rounded-full bg-[#f2f5f9] text-[#55617a] text-[11px] font-bold"
                                                        style={{minWidth: 22, height: 22, padding: "0 6px"}}
                                                    >
                                                        {r.redactionIds.length}
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        );
                                    case "userGroups":
                                        return (
                                            <div key={c.key} className="min-w-0">
                                                <span
                                                    className="block text-[12.5px] text-[#55617a] whitespace-normal break-words line-clamp-5">
                                                    {userGroupNames(r.userGroupIds)}
                                                </span>
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