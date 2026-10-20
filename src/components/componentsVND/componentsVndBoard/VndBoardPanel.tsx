// Панель "Доски ВНД" - одна стадия жизненного цикла (или "Избранное"): шапка с цветом статуса и
// счётчиком, карточки документов, "Показать ещё" для длинных списков.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import type {VndBoardPanelMeta} from "@/constants/vndBoard.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {VndBoardReason} from "@/service/vndService/vndBoardService.ts";
import {VndBoardCard, type VndBoardRemoveKind} from "./VndBoardCard.tsx";
import {ChevronDown, ChevronUp} from "lucide-react";

export interface VndBoardPanelRow {
    vnd: VndResponse;
    reasons: VndBoardReason[];
    removeKind: VndBoardRemoveKind | null;
}

interface VndBoardPanelProps {
    meta: VndBoardPanelMeta;
    rows: VndBoardPanelRow[];
    /** Сколько документов в панели без учёта поиска/фильтра (для "3 из 12") */
    totalCount: number;
    searchQuery: string;
    canViewExtended: boolean;
    busyIds: Set<number>;
    onToggleFavorite: (vnd: VndResponse) => void;
    onRemove: (vnd: VndResponse, kind: VndBoardRemoveKind) => void;
}

const COLLAPSED_LIMIT = 4;

export function VndBoardPanel({
                                  meta, rows, totalCount, searchQuery, canViewExtended, busyIds,
                                  onToggleFavorite, onRemove,
                              }: VndBoardPanelProps) {
    const {t} = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const Icon = meta.icon;
    const filtered = rows.length !== totalCount;
    const visible = expanded ? rows : rows.slice(0, COLLAPSED_LIMIT);
    const rest = rows.length - visible.length;

    return (
        <section
            id={`vnd-board-panel-${meta.key}`}
            aria-labelledby={`vnd-board-panel-${meta.key}-title`}
            className="flex min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-[#e9edf3] bg-[#f7f9fc]"
        >
            {/* Цветная кромка — тот же цвет, что у "таблетки" статуса в реестре */}
            <div className="h-[3px]" style={{background: meta.color}}/>

            {/* Шапка рассчитана на узкие колонки канбана: иконка и счётчик сверху, название и пояснение —
                на всю ширину колонки под ними (иначе длинные названия рвутся посреди слова) */}
            <header className="px-4 pb-3 pt-3.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px]"
                          style={{background: meta.bg, color: meta.color}}>
                        <Icon className="h-[17px] w-[17px]" strokeWidth={2}/>
                    </span>
                    <span
                        className="flex-none rounded-full px-2 py-[1px] font-mono text-[12px] font-bold"
                        style={{color: meta.color, background: meta.bg}}
                    >
                        {filtered ? t("vndBoard.panelCountFiltered", {shown: rows.length, total: totalCount}) : totalCount}
                    </span>
                </div>
                <h2 id={`vnd-board-panel-${meta.key}-title`}
                    className="m-0 mt-2.5 text-[14px] font-bold leading-tight tracking-[-0.01em] text-[#0f1b2d]">
                    {t(meta.title)}
                </h2>
                <p className="m-0 mt-1 text-[11.5px] leading-snug text-[#8b97ab]">{t(meta.hint)}</p>
            </header>

            <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5">
                {rows.length === 0 ? (
                    <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-[#dfe5ee] px-4 py-7 text-center text-[12px] leading-snug text-[#a3adbd]">
                        {filtered ? t("vndBoard.panelEmptyFiltered") : t(meta.empty)}
                    </div>
                ) : (
                    visible.map((row) => (
                        <VndBoardCard
                            key={row.vnd.id}
                            vnd={row.vnd}
                            panelKey={meta.key}
                            reasons={row.reasons}
                            searchQuery={searchQuery}
                            canViewExtended={canViewExtended}
                            busy={busyIds.has(row.vnd.id)}
                            onToggleFavorite={onToggleFavorite}
                            removeKind={row.removeKind}
                            onRemove={onRemove}
                        />
                    ))
                )}

                {(rest > 0 || (expanded && rows.length > COLLAPSED_LIMIT)) && (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-0.5 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border-none bg-transparent text-[12px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#ececfc]"
                    >
                        {expanded ? (
                            <><ChevronUp className="h-3.5 w-3.5" strokeWidth={2.2}/>{t("vndBoard.collapse")}</>
                        ) : (
                            <><ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2}/>{t("vndBoard.showMore", {count: rest})}</>
                        )}
                    </button>
                )}
            </div>
        </section>
    );
}
