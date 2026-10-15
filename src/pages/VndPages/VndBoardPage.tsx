/**
 * "Доска ВНД" — личная витрина нормативных документов пользователя.
 *
 * Реестр отвечает на вопрос «какие ВНД вообще есть», доска — «что из этого касается меня и где
 * оно сейчас»: документы, у которых СП пользователя — разработчик или ответственный исполнитель
 * (подбираются сервером автоматически), плюс добавленные вручную, разложенные по статусу
 * последней редакции. Отдельная панель — личное "Избранное".
 */
import {useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {AlertTriangle, Building2, Info, List, Network, Pin, Plus, RefreshCw, Search, X} from "lucide-react";

import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {
    getVndBoardPanels, VND_BOARD_REASON_META, VND_BOARD_REASON_ORDER, vndBoardPanelOf,
    type VndBoardPanelKey, type VndBoardSourceFilter,
} from "@/constants/vndBoard.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {vndBoardService, type VndBoardReason} from "@/service/vndService/vndBoardService.ts";
import {toast} from "@/service/toastService.ts";
import {useVndBoard} from "@/hooks/vndHooks/useVndBoard.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {VndBoardPanel, type VndBoardPanelRow} from "@/components/componentsVND/componentsVndBoard/VndBoardPanel.tsx";
import type {VndBoardRemoveKind} from "@/components/componentsVND/componentsVndBoard/VndBoardCard.tsx";
import {VndBoardAddModal} from "@/components/componentsVND/componentsVndBoard/VndBoardAddModal.tsx";
import {VndBoardHiddenSection} from "@/components/componentsVND/componentsVndBoard/VndBoardHiddenSection.tsx";

const SOURCE_STORAGE_KEY = "vndBoard.sourceFilter";
const SOURCE_FILTERS: VndBoardSourceFilter[] = ["all", "unit", "pinned"];

function readSourceFilter(): VndBoardSourceFilter {
    try {
        const value = localStorage.getItem(SOURCE_STORAGE_KEY);
        return SOURCE_FILTERS.includes(value as VndBoardSourceFilter) ? value as VndBoardSourceFilter : "all";
    } catch {
        return "all";
    }
}

function matchesSource(reasons: VndBoardReason[], source: VndBoardSourceFilter): boolean {
    if (source === "all") return true;
    if (source === "pinned") return reasons.includes("pinned");
    return reasons.includes("developer") || reasons.includes("executor");
}

function matchesSearch(vnd: VndResponse, query: string): boolean {
    if (!query) return true;
    const q = query.toLocaleLowerCase();
    return vnd.code.toLocaleLowerCase().includes(q) || vnd.name.toLocaleLowerCase().includes(q);
}

/** Действующие — сначала самые срочные по плановой актуализации; остальные — свежие сверху. */
function sortForPanel(rows: VndBoardPanelRow[], key: VndBoardPanelKey): VndBoardPanelRow[] {
    if (key !== "active") return rows;
    return [...rows].sort((a, b) => {
        const da = a.vnd.dueActualizationDate ?? "9999-12-31";
        const db = b.vnd.dueActualizationDate ?? "9999-12-31";
        return da.localeCompare(db);
    });
}

export function VndBoardPage() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canViewExtended = hasPermission(PermissionCode.ViewVndRegistryExtended);

    const {data, loading, error, reload} = useVndBoard();
    const [search, setSearch] = useState("");
    const [source, setSourceState] = useState<VndBoardSourceFilter>(readSourceFilter);
    const [addOpen, setAddOpen] = useState(false);
    const [busyIds, setBusyIds] = useState<Set<number>>(() => new Set());

    const setSource = (value: VndBoardSourceFilter) => {
        setSourceState(value);
        try {
            localStorage.setItem(SOURCE_STORAGE_KEY, value);
        } catch {
            // приватный режим / запрет хранилища — фильтр просто не запомнится
        }
    };

    const panels = useMemo(() => getVndBoardPanels(canViewExtended), [canViewExtended]);
    const query = search.trim();

    // Раскладка по панелям: всё (для счётчиков) и видимое (после поиска и фильтра "откуда")
    const layout = useMemo(() => {
        const all = new Map<VndBoardPanelKey, VndBoardPanelRow[]>(panels.map((p) => [p.key, []]));
        const reasonsById = new Map<number, VndBoardReason[]>();

        for (const entry of data?.items ?? []) {
            reasonsById.set(entry.vnd.id, entry.reasons);
            const removeKind: VndBoardRemoveKind =
                entry.reasons.includes("developer") || entry.reasons.includes("executor") ? "hide" : "unpin";
            all.get(vndBoardPanelOf(entry.vnd, canViewExtended))
                ?.push({vnd: entry.vnd, reasons: entry.reasons, removeKind});
        }
        for (const vnd of data?.favorites ?? []) {
            all.get("favorites")?.push({vnd, reasons: reasonsById.get(vnd.id) ?? [], removeKind: null});
        }

        const visible = new Map<VndBoardPanelKey, VndBoardPanelRow[]>();
        for (const [key, rows] of all) {
            visible.set(key, sortForPanel(
                rows.filter((r) => matchesSearch(r.vnd, query) && matchesSource(r.reasons, source)),
                key,
            ));
        }
        return {all, visible};
    }, [data, panels, canViewExtended, query, source]);

    const boardIds = useMemo(() => new Set((data?.items ?? []).map((e) => e.vnd.id)), [data]);
    const hiddenIds = useMemo(() => new Set((data?.hidden ?? []).map((v) => v.id)), [data]);
    const unitCount = data?.items.filter((e) => matchesSource(e.reasons, "unit")).length ?? 0;
    const pinnedCount = data?.items.filter((e) => e.reasons.includes("pinned")).length ?? 0;
    const statusPanels = panels.filter((p) => p.key !== "favorites");
    const boardTotal = data?.items.length ?? 0;

    const withBusy = useCallback(async (id: number, action: () => Promise<void>) => {
        setBusyIds((prev) => new Set(prev).add(id));
        try {
            await action();
            await reload();
        } catch (e) {
            toast.error(t("vndBoard.toasts.actionError"), e instanceof Error ? e.message : undefined);
        } finally {
            setBusyIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [reload, t]);

    const toggleFavorite = (vnd: VndResponse) => withBusy(vnd.id, async () => {
        if (vnd.isFavorite) await vndService.removeFromFavorites(vnd.id);
        else await vndService.addToFavorites(vnd.id);
    });

    const removeFromBoard = (vnd: VndResponse, kind: VndBoardRemoveKind) => withBusy(vnd.id, async () => {
        if (kind === "unfavorite") {
            await vndService.removeFromFavorites(vnd.id);
            return;
        }
        await vndBoardService.remove(vnd.id);
        // Отмена — одним кликом по тосту: вернёт документ ровно туда, где он был
        toast.success(
            t(kind === "hide" ? "vndBoard.toasts.hidden" : "vndBoard.toasts.unpinned", {code: vnd.code}),
            t("vndBoard.toasts.undoHint"),
            6000,
            () => void withBusy(vnd.id, () => vndBoardService.add(vnd.id)),
        );
    });

    const restore = (vnd: VndResponse) => withBusy(vnd.id, async () => {
        await vndBoardService.add(vnd.id);
        toast.success(t("vndBoard.toasts.restored", {code: vnd.code}));
    });

    const addFromModal = async (vndId: number) => {
        try {
            await vndBoardService.add(vndId);
            await reload();
            toast.success(t("vndBoard.toasts.added"));
        } catch (e) {
            toast.error(t("vndBoard.toasts.actionError"), e instanceof Error ? e.message : undefined);
        }
    };

    const closeAdd = useCallback(() => setAddOpen(false), []);

    const scrollToPanel = (key: VndBoardPanelKey) =>
        document.getElementById(`vnd-board-panel-${key}`)?.scrollIntoView({behavior: "smooth", block: "start"});

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("vndBoard.title")}
                description={t("vndBoard.description")}
                actions={
                    <>
                        <Link
                            to="/base-vnd"
                            className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border border-[#e5e9f0] bg-white text-[13px] font-semibold text-[#3a4560] no-underline hover:bg-[#f6f8fb]"
                        >
                            <List className="w-[17px] h-[17px]" strokeWidth={2}/>
                            {t("vndBoard.registryLink")}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                        >
                            <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                            {t("vndBoard.addButton")}
                        </button>
                    </>
                }
            />

            {loading && !data && <Loader label={t("vndBoard.loading")}/>}

            {error && !data && (
                <EmptyState
                    variant="error"
                    title={t("vndBoard.errorTitle")}
                    description={error}
                    actionLabel={t("vndBoard.retry")}
                    actionIcon={RefreshCw}
                    onAction={() => void reload()}
                />
            )}

            {data && (
                <>
                    {/* --- Откуда берутся документы: СП пользователя и легенда причин --- */}
                    <section className="mb-4 grid gap-4 rounded-2xl border border-[#e9edf3] bg-white p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                        <div className="flex gap-4">
                            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[#ececfc] text-[#4e57d6]">
                                <Network className="h-[22px] w-[22px]" strokeWidth={1.9}/>
                            </span>
                            <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8b97ab]">
                                    {t("vndBoard.intro.eyebrow")}
                                </div>
                                {data.scopeUnit ? (
                                    <>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="text-[16px] font-bold tracking-[-0.01em] text-[#0f1b2d]">
                                                {data.scopeUnit.name}
                                            </span>
                                            {data.scopeUnitCount > 1 && (
                                                <Tooltip content={t("vndBoard.intro.subtreeTooltip")}>
                                                    <span className="rounded-full bg-[#f2f5f9] px-2 py-[2px] text-[11px] font-semibold text-[#55617a]">
                                                        {t("vndBoard.intro.subtree", {count: data.scopeUnitCount - 1})}
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </div>
                                        {data.ownUnit && data.ownUnit.id !== data.scopeUnit.id && (
                                            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                                                <Building2 className="h-3.5 w-3.5" strokeWidth={2}/>
                                                {t("vndBoard.intro.ownUnit", {name: data.ownUnit.name})}
                                            </div>
                                        )}
                                        <p className="m-0 mt-2.5 max-w-[620px] text-[12.5px] leading-[1.55] text-[#55617a]">
                                            {t("vndBoard.intro.text")}
                                        </p>
                                    </>
                                ) : (
                                    <div className="mt-1.5 flex items-start gap-2 rounded-xl bg-[#fdf3d9] px-3 py-2.5 text-[12.5px] leading-snug text-[#8a5a06]">
                                        <AlertTriangle className="mt-px h-4 w-4 flex-none" strokeWidth={2}/>
                                        {t("vndBoard.intro.noUnit")}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl bg-[#f7f9fc] p-4">
                            <div className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#26324a]">
                                <Info className="h-3.5 w-3.5 text-[#8b97ab]" strokeWidth={2}/>
                                {t("vndBoard.intro.legendTitle")}
                            </div>
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {VND_BOARD_REASON_ORDER.map((r) => {
                                    const meta = VND_BOARD_REASON_META[r];
                                    return (
                                        <li key={r} className="flex items-start gap-2.5 text-[12px] leading-snug text-[#55617a]">
                                            <span className="mt-px flex-none rounded-md px-1.5 py-[1px] text-[10.5px] font-semibold leading-[16px]"
                                                  style={{color: meta.color, background: meta.bg}}>
                                                {t(meta.label)}
                                            </span>
                                            {t(meta.tooltip)}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </section>

                    {/* --- Сводка по стадиям: полоса-распределение и быстрый переход к панели --- */}
                    {boardTotal > 0 && (
                        <section className="mb-4 rounded-2xl border border-[#e9edf3] bg-white px-5 py-4">
                            <div className="mb-3 flex items-baseline justify-between gap-3">
                                <span className="text-[13px] font-semibold text-[#26324a]">
                                    {t("vndBoard.overview.title", {count: boardTotal})}
                                </span>
                                <span className="text-[12px] text-[#8b97ab]">
                                    {t("vndBoard.overview.split", {unit: unitCount, pinned: pinnedCount})}
                                </span>
                            </div>
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#eef2f7]" aria-hidden>
                                {statusPanels.map((p) => {
                                    const count = layout.all.get(p.key)?.length ?? 0;
                                    if (count === 0) return null;
                                    return (
                                        <span key={p.key} className="h-full border-r-2 border-white last:border-r-0"
                                              style={{width: `${(count / boardTotal) * 100}%`, background: p.color}}/>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {panels.map((p) => {
                                    const count = layout.all.get(p.key)?.length ?? 0;
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => scrollToPanel(p.key)}
                                            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#eef2f7] bg-[#fafbfd] px-2.5 text-[12px] font-medium text-[#3a4560] cursor-pointer hover:border-[#dfe5ee] hover:bg-white"
                                        >
                                            <span className="h-2 w-2 rounded-full" style={{background: p.color}}/>
                                            {t(p.title)}
                                            <span className="font-mono text-[12px] font-bold"
                                                  style={{color: count ? p.color : "#a3adbd"}}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* --- Поиск по доске и фильтр "откуда документ" --- */}
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 focus-within:border-[#4e57d6] focus-within:shadow-[0_0_0_3px_#ececfc] sm:max-w-[420px]">
                            <Search className="h-4 w-4 flex-none text-[#8b97ab]" strokeWidth={2}/>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("vndBoard.searchPlaceholder")}
                                className="h-full min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-[#a3adbd]"
                            />
                            {search && (
                                <button type="button" onClick={() => setSearch("")} aria-label={t("general.clearFilter")}
                                        className="grid h-6 w-6 place-items-center rounded-md border-none bg-transparent text-[#a3adbd] cursor-pointer hover:bg-[#f2f5f9]">
                                    <X className="h-3.5 w-3.5" strokeWidth={2.2}/>
                                </button>
                            )}
                        </label>

                        <div role="radiogroup" aria-label={t("vndBoard.source.label")}
                             className="inline-flex h-10 items-center gap-0.5 rounded-[10px] border border-[#e5e9f0] bg-white p-1">
                            {SOURCE_FILTERS.map((key) => {
                                const active = source === key;
                                const count = key === "all" ? boardTotal : key === "unit" ? unitCount : pinnedCount;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => setSource(key)}
                                        className={`inline-flex h-full items-center gap-1.5 rounded-[7px] border-none px-3 text-[12.5px] font-semibold cursor-pointer ${
                                            active ? "bg-[#ececfc] text-[#4e57d6]" : "bg-transparent text-[#55617a] hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                        {key === "unit" && <Building2 className="h-3.5 w-3.5" strokeWidth={2}/>}
                                        {key === "pinned" && <Pin className="h-3.5 w-3.5" strokeWidth={2}/>}
                                        {t(`vndBoard.source.${key}`)}
                                        <span className={`font-mono text-[11.5px] ${active ? "text-[#4e57d6]" : "text-[#a3adbd]"}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- Панели: на широком экране все в один ряд (канбан), при нехватке места — горизонтальная
                        прокрутка; на узком — друг под другом --- */}
                    <div className="grid items-start gap-3 max-lg:grid-cols-1 lg:auto-cols-[minmax(200px,1fr)] lg:grid-flow-col lg:overflow-x-auto lg:pb-2 [scrollbar-width:thin]">
                        {panels.map((p) => (
                            <VndBoardPanel
                                key={p.key}
                                meta={p}
                                rows={layout.visible.get(p.key) ?? []}
                                totalCount={layout.all.get(p.key)?.length ?? 0}
                                searchQuery={query}
                                canViewExtended={canViewExtended}
                                busyIds={busyIds}
                                onToggleFavorite={(vnd) => void toggleFavorite(vnd)}
                                onRemove={(vnd, kind) => void removeFromBoard(vnd, kind)}
                            />
                        ))}
                    </div>

                    <VndBoardHiddenSection items={data.hidden} busyIds={busyIds} onRestore={(vnd) => void restore(vnd)}/>
                </>
            )}

            <VndBoardAddModal
                open={addOpen}
                onClose={closeAdd}
                boardIds={boardIds}
                hiddenIds={hiddenIds}
                canViewExtended={canViewExtended}
                onAdd={addFromModal}
            />
        </div>
    );
}
