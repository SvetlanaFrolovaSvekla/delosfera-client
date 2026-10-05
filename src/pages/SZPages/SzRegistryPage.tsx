import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link, useNavigate} from "react-router-dom";
import {Archive, ChartLine, Download} from "lucide-react";
import {toast} from "@/service/toastService.ts";
import {SzBulkArchiveModal} from "@/components/componentsSz/SzBulkArchiveModal.tsx";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {colors} from "@/design/tokens.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {
    szService,
    type SzCounters,
    type SzKind,
    type SzListItem,
    type SzStatusCode,
} from "@/service/szService/szService.ts";
import {
    szExecutionService,
    type SzAssignment,
} from "@/service/szService/szExecutionService.ts";
import {szPaperService, type SzOriginal} from "@/service/szService/szPaperService.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Icon} from "@/assets/icons/Icon.tsx";

type ScopeId = "all" | "inbox" | "assignments" | "originals" | "mine" | "drafts"
    | "approval" | "pending" | "signing" | "archive";

const SCOPES: { id: ScopeId; statuses?: SzStatusCode[]; mineOnly?: boolean }[] = [
    {id: "all"},
    {id: "inbox"},
    {id: "assignments"},
    {id: "originals"},
    {id: "mine", mineOnly: true},
    {id: "drafts", statuses: ["Draft"], mineOnly: true},
    {id: "approval", statuses: ["OnApproval"]},
    {id: "pending", statuses: ["PendingRegistration"]},
    {id: "signing", statuses: ["OnSigning"]},
    {id: "archive", statuses: ["Archived"]},
];

const STATUS_TONE: Partial<Record<SzStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    PendingRegistration: colors.status.onact,
    OnSigning: colors.status.review,
    OnBoardReview: colors.status.review,
    Registered: colors.status.review,
    OnRevision: colors.status.onact,
    OnAddresseeDecision: colors.status.review,
    OnExecution: colors.status.consol,
    Executed: colors.status.active,
    Rejected: colors.status.arch,
    Withdrawn: colors.status.draft,
    Archived: colors.status.arch,
};

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

export function SzRegistryPage() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const [scope, setScope] = useState<ScopeId>("all");
    const [query, setQuery] = useState("");
    /** Запрос, по которому получены строки в таблице: подсвечиваем его, а не то, что набрано прямо сейчас. */
    const [appliedQuery, setAppliedQuery] = useState("");
    const [kindId, setKindId] = useState<number | "">("");
    const [overdueOnly, setOverdueOnly] = useState(false);

    const [items, setItems] = useState<SzListItem[]>([]);
    const [assignments, setAssignments] = useState<SzAssignment[]>([]);
    const [originals, setOriginals] = useState<SzOriginal[]>([]);
    const [total, setTotal] = useState(0);
    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [counters, setCounters] = useState<SzCounters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    /** Отмеченные строки реестра для массовых операций (СЗ-7). */
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

    /** Название вида записки на языке интерфейса; если перевода нет — русское. */
    const kindTitle = (k: SzKind): string => {
        if (i18n.language === "ky") return k.titleKg || k.titleRu;
        if (i18n.language === "en") return k.titleEn || k.titleRu;
        return k.titleRu;
    };
    const kindName = (id: number, fallback: string): string => {
        const k = kinds.find((x) => x.id === id);
        return k ? kindTitle(k) : fallback;
    };

    /** «−3 дн» / «через 5 дн» рядом со сроком. */
    const daysLabel = (overdue: boolean, daysLeft: number | null): string =>
        overdue
            ? t("szRegistry.daysOverdue", {n: Math.abs(daysLeft ?? 0)})
            : t("szRegistry.daysLeft", {n: daysLeft ?? 0});

    useEffect(() => {
        szService.kinds().then(setKinds).catch(() => {
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const s = SCOPES.find((x) => x.id === scope)!;
        try {
            // «Мои поручения» — список не записок, а поручений по ним: своя выдача и своя таблица.
            if (scope === "assignments") {
                const [list, c] = await Promise.all([szExecutionService.my(), szService.counters()]);
                setAssignments(list);
                setTotal(list.length);
                setCounters(c);
                return;
            }

            // Оригиналы на руках — реестр делопроизводства: кто держит бумагу и с какого числа.
            if (scope === "originals") {
                const [list, c] = await Promise.all([szPaperService.outstanding(), szService.counters()]);
                setOriginals(list);
                setTotal(list.length);
                setCounters(c);
                return;
            }

            // «Согласую я» приходит из отдельной ручки: там фильтр не по статусу,
            // а по активным задачам согласования текущего пользователя.
            const [page, c] = await Promise.all([
                scope === "inbox"
                    ? szService.inbox(1, 100)
                    : szService.search({
                        query: query.trim() || undefined,
                        statuses: s.statuses,
                        mineOnly: s.mineOnly,
                        kindIds: kindId ? [Number(kindId)] : undefined,
                        overdueOnly: overdueOnly || undefined,
                        page: 1,
                        pageSize: 100,
                    }),
                szService.counters(),
            ]);
            setItems(page.items);
            setTotal(page.total);
            setCounters(c);
            setAppliedQuery(scope === "inbox" ? "" : query.trim());
        } catch {
            setError(t("szRegistry.loadError"));
        } finally {
            setLoading(false);
        }
    }, [scope, query, kindId, overdueOnly, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // Смена вкладки или фильтра меняет набор строк — прежний выбор к ним не относится.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(new Set());
    }, [scope, query, kindId, overdueOnly]);

    const toggleRow = (id: number) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const allOnPageSelected = items.length > 0 && items.every((i) => selected.has(i.id));

    const toggleAll = () => setSelected((prev) => {
        const next = new Set(prev);
        if (items.every((i) => next.has(i.id))) items.forEach((i) => next.delete(i.id));
        else items.forEach((i) => next.add(i.id));
        return next;
    });

    // Экспорт отмеченных: тот же фильтр вкладки плюс список id, чтобы архивные строки
    // из вкладки «Архив» не отсеялись фильтром по статусу.
    const handleBulkExport = useCallback(async () => {
        const s = SCOPES.find((x) => x.id === scope)!;
        setExporting(true);
        try {
            await szService.exportRegistry({
                query: query.trim() || undefined,
                statuses: s.statuses,
                mineOnly: s.mineOnly,
                kindIds: kindId ? [Number(kindId)] : undefined,
                overdueOnly: overdueOnly || undefined,
                ids: [...selected],
            });
        } catch {
            toast.error(t("szRegistry.exportSelectedError"));
        } finally {
            setExporting(false);
        }
    }, [scope, query, kindId, overdueOnly, selected, t]);

    // Выгрузка реестра в Excel — по текущему фильтру, весь набор. Особые вкладки
    // (поручения, оригиналы, «согласую я») — не реестр, у них кнопки нет.
    const handleExport = useCallback(async () => {
        const s = SCOPES.find((x) => x.id === scope)!;
        setExporting(true);
        try {
            await szService.exportRegistry({
                query: query.trim() || undefined,
                statuses: s.statuses,
                mineOnly: s.mineOnly,
                kindIds: kindId ? [Number(kindId)] : undefined,
                overdueOnly: overdueOnly || undefined,
            });
        } catch {
            toast.error(t("szRegistry.exportError"), t("szRegistry.exportErrorHint"));
        } finally {
            setExporting(false);
        }
    }, [scope, query, kindId, overdueOnly, t]);

    const scopeCount = (id: ScopeId): number | undefined => {
        if (!counters) return undefined;
        if (id === "all") return counters.all;
        if (id === "drafts") return counters.drafts;
        if (id === "pending") return counters.pendingRegistration;
        if (id === "archive") return counters.archived;
        return undefined;
    };

    return (
        <div className="px-7 py-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">{t("szRegistry.title")}</h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        {t("szRegistry.subtitle")}
                    </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                    <button
                        onClick={() => navigate("/sz-analytics")}
                        className="inline-flex items-center gap-2 h-[42px] px-[18px] rounded-[11px] border-none bg-[#2f68f5] text-white font-semibold text-[13.5px] cursor-pointer shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]"
                    >
                        <ChartLine className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {/* Аналитика по СЗ */}
                        {t("szRegistry.analyticsButton")}
                    </button>
                    <button
                        onClick={() => navigate("/sz/new")}
                        className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]">
                        <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                        {/* Создать СЗ */}
                        {t("szRegistry.create")}
                    </button>
                </div>
            </div>

            <div className="mt-5 flex items-center gap-5 border-b border-[#e5e9f0]">
                {SCOPES.map((s) => {
                    const active = scope === s.id;
                    const n = scopeCount(s.id);
                    return (
                        <button
                            key={s.id}
                            onClick={() => setScope(s.id)}
                            className="relative inline-flex items-center gap-2 py-[9px] px-1 border-none bg-transparent text-[14px] cursor-pointer whitespace-nowrap"
                        >
                            <span className={active ? "text-[#2f68f5] font-bold" : "text-[#8b97ab] font-medium"}>
                                {t(`szRegistry.scopes.${s.id}`)}
                            </span>
                            {n != null && (
                                <span className={`font-mono text-[11px] font-bold py-[1px] px-[7px] rounded-full ${
                                    active ? "bg-[#e9f0ff] text-[#2f68f5]" : "bg-[#f2f5f9] text-[#a3adbd]"}`}>
                                    {n}
                                </span>
                            )}
                            {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2f68f5]"/>}
                        </button>
                    );
                })}
            </div>

            {/* В «Согласую я» фильтры не применяются — список формирует сам движок согласования. */}
            <div
                className={`mt-4 flex flex-wrap items-center gap-2.5 ${scope === "inbox" || scope === "assignments" || scope === "originals" ? "hidden" : ""}`}>
                <SearchBar
                    variant="white"
                    value={query}
                    onChange={setQuery}
                    placeholder={t("szRegistry.searchPlaceholder")}
                    className="min-w-[280px] flex-1"
                />
                <SelectDropdown
                    options={[
                        {value: "", label: t("szRegistry.allKinds")},
                        ...kinds.map((k) => ({value: String(k.id), label: kindTitle(k)})),
                    ]}
                    value={kindId === "" ? "" : String(kindId)}
                    onChange={(v) => setKindId(v ? Number(v) : "")}
                    searchable
                    searchPlaceholder={t("szRegistry.kindSearchPlaceholder")}
                    minWidth="150px"
                />
                <CheckBoxOne
                    checked={overdueOnly}
                    onChange={setOverdueOnly}
                    tone="brand"
                >
                    {t("szRegistry.overdueOnly")}
                </CheckBoxOne>
                <div className="text-[12.5px] text-[#8b97ab]">
                    {t("szRegistry.found")}: <b className="font-mono text-[#3a4560]">{total}</b>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting || total === 0}
                    className="inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download
                        className="w-4 h-4"/> {exporting ? t("szRegistry.exporting") : t("szRegistry.exportExcel")}
                </button>
            </div>

            {/* Сохранённые фильтры (БП-16): применить/сохранить именованную выборку. */}
            {!(scope === "inbox" || scope === "assignments" || scope === "originals") && (
                <div className="mt-2.5">
                    <SavedFiltersBar
                        scope="sz"
                        current={{scope, query, kindId: kindId === "" ? null : kindId, overdueOnly}}
                        onApply={(p) => {
                            const f = p as {
                                scope?: ScopeId;
                                query?: string;
                                kindId?: number | null;
                                overdueOnly?: boolean
                            };
                            if (f.scope) setScope(f.scope);
                            setQuery(f.query ?? "");
                            setKindId(f.kindId == null ? "" : f.kindId);
                            setOverdueOnly(!!f.overdueOnly);
                        }}
                    />
                </div>
            )}

            {error && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {scope === "originals" ? (
                <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                        <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            <th className="px-4 py-2.5 text-left w-[140px]">{t("szRegistry.cols.memo")}</th>
                            <th className="px-4 py-2.5 text-left">{t("szRegistry.cols.subject")}</th>
                            <th className="px-4 py-2.5 text-left w-[190px]">{t("szRegistry.cols.holder")}</th>
                            <th className="px-4 py-2.5 text-left w-[170px]">{t("szRegistry.cols.location")}</th>
                            <th className="px-4 py-2.5 text-left w-[160px]">{t("szRegistry.cols.returnBy")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5}
                                    className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("general.loading")}</td>
                            </tr>
                        ) : originals.length === 0 ? (
                            <tr>
                                <td colSpan={5}
                                    className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("szRegistry.originalsEmpty")}</td>
                            </tr>
                        ) : originals.map((o) => (
                            <tr key={o.szId} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${o.szId}`}
                                          className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                        {o.regNumber ?? t("szRegistry.noNumber")}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${o.szId}`} className="text-[#1c2740] no-underline hover:underline">
                                        {o.title ?? "—"}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5 text-[#55617a]">{o.holderName ?? "—"}</td>
                                <td className="px-4 py-2.5 text-[#55617a]">{o.location ?? "—"}</td>
                                <td className="px-4 py-2.5">
                                    {o.dueBackOn ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span>{formatDate(o.dueBackOn)}</span>
                                            <span className="text-[11.5px] font-semibold"
                                                  style={{color: o.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                                {daysLabel(o.isOverdue, o.daysLeft)}
                                            </span>
                                        </span>
                                    ) : t("szRegistry.noDueDate")}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : scope === "assignments" ? (
                <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                        <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            <th className="px-4 py-2.5 text-left w-[140px]">{t("szRegistry.cols.memo")}</th>
                            <th className="px-4 py-2.5 text-left">{t("szRegistry.cols.assignment")}</th>
                            <th className="px-4 py-2.5 text-left w-[150px]">{t("szRegistry.cols.due")}</th>
                            <th className="px-4 py-2.5 text-left w-[150px]">{t("szRegistry.cols.state")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4}
                                    className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("general.loading")}</td>
                            </tr>
                        ) : assignments.length === 0 ? (
                            <tr>
                                <td colSpan={4}
                                    className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("szRegistry.assignmentsEmpty")}</td>
                            </tr>
                        ) : assignments.map((a) => (
                            <tr key={a.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${a.szDocumentId}`}
                                          className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                        {a.szRegNumber ?? t("szRegistry.noNumber")}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${a.szDocumentId}`}
                                          className="text-[#1c2740] no-underline hover:underline">
                                        {a.text}
                                    </Link>
                                    <div className="text-[12px] text-[#8b97ab]">{a.szTitle}</div>
                                    {a.returnReason && (
                                        <div
                                            className="text-[12px] text-[#b3730a]">{t("szRegistry.returned", {reason: a.returnReason})}</div>
                                    )}
                                </td>
                                <td className="px-4 py-2.5">
                                    {a.dueDate ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span>{formatDate(a.dueDate)}</span>
                                            <span className="text-[11.5px] font-semibold"
                                                  style={{color: a.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                                {daysLabel(a.isOverdue, a.daysLeft)}
                                            </span>
                                        </span>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-[12.5px]"
                                    style={{color: a.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                    {a.isOverdue ? t("szRegistry.overdue") : t(`szRegistry.assignmentState.${a.state}`)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <>
                    {selected.size > 0 && (
                        <div
                            className="mt-3 flex flex-wrap items-center gap-3 rounded-[12px] border border-[#dbe4fb] bg-[#eef3ff] px-4 py-2.5">
                            <span
                                className="text-[12.5px] font-semibold text-[#2f68f5]">{t("szRegistry.selected", {count: selected.size})}</span>
                            <button
                                type="button" onClick={handleBulkExport} disabled={exporting}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#c9d6f5] bg-white text-[12.5px] font-semibold text-[#2f68f5] cursor-pointer disabled:opacity-60"
                            >
                                <Download className="w-3.5 h-3.5"/> {t("szRegistry.exportSelected")}
                            </button>
                            <button
                                type="button" onClick={() => setBulkArchiveOpen(true)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#c9d6f5] bg-white text-[12.5px] font-semibold text-[#2f68f5] cursor-pointer"
                            >
                                <Archive className="w-3.5 h-3.5"/> {t("szRegistry.sendToArchive")}
                            </button>
                            <button
                                type="button" onClick={() => setSelected(new Set())}
                                className="text-[12px] text-[#8b97ab] cursor-pointer bg-transparent border-none"
                            >
                                {t("szRegistry.clearSelection")}
                            </button>
                        </div>
                    )}
                    <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                        <table className="w-full border-collapse text-[13px]">
                            <thead>
                            <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                <th className="px-3 py-2.5 text-left w-[40px]">
                                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}
                                           aria-label={t("szRegistry.selectAll")}/>
                                </th>
                                <th className="px-4 py-2.5 text-left w-[140px]">{t("szRegistry.cols.number")}</th>
                                <th className="px-4 py-2.5 text-left w-[130px]">{t("szRegistry.cols.registeredOn")}</th>
                                <th className="px-4 py-2.5 text-left">{t("szRegistry.cols.subject")}</th>
                                <th className="px-4 py-2.5 text-left w-[130px]">{t("szRegistry.cols.kind")}</th>
                                <th className="px-4 py-2.5 text-left w-[170px]">{t("szRegistry.cols.author")}</th>
                                <th className="px-4 py-2.5 text-left w-[150px]">{t("szRegistry.cols.dueDate")}</th>
                                <th className="px-4 py-2.5 text-left w-[180px]">{t("szRegistry.cols.status")}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8}
                                        className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("general.loading")}</td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8}
                                        className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("szRegistry.memosEmpty")}</td>
                                </tr>
                            ) : items.map((i) => {
                                const tone = STATUS_TONE[i.statusCode] ?? colors.status.draft;
                                return (
                                    <tr key={i.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                        <td className="px-3 py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(i.id)}
                                                onChange={() => toggleRow(i.id)}
                                                aria-label={t("szRegistry.selectRow", {name: i.regNumber ?? i.title})}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Link to={`/sz/${i.id}`}
                                                  className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                                {i.regNumber
                                                    ? <HighlightText text={i.regNumber} query={appliedQuery}/>
                                                    : t("szRegistry.noNumber")}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-[#55617a]">{i.registeredOn ? formatDate(i.registeredOn) : "—"}</td>
                                        <td className="px-4 py-2.5">
                                            <Link to={`/sz/${i.id}`}
                                                  className="text-[#1c2740] no-underline hover:underline">
                                                <HighlightText text={i.title} query={appliedQuery}/>
                                            </Link>
                                            {i.isPaperCarrier && (
                                                <span
                                                    className="ml-2 text-[10.5px] font-semibold uppercase tracking-[.03em] text-[#b3730a]">{t("szRegistry.paper")}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-[#55617a]">{kindName(i.kindId, i.kind)}</td>
                                        <td className="px-4 py-2.5 text-[#55617a]">{i.author ?? "—"}</td>
                                        <td className="px-4 py-2.5">
                                            {i.dueDate ? (
                                                <span className="inline-flex items-center gap-2">
                                            <span>{formatDate(i.dueDate)}</span>
                                            <span className="text-[11.5px] font-semibold"
                                                  style={{color: i.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                                {daysLabel(i.isOverdue, i.daysLeft)}
                                            </span>
                                        </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                    <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                          style={{color: tone.fg, background: tone.bg}}>
                                        {t(`szRegistry.status.${i.statusCode}`)}
                                    </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {bulkArchiveOpen && (
                <SzBulkArchiveModal
                    ids={[...selected]}
                    onClose={() => setBulkArchiveOpen(false)}
                    onDone={(res) => {
                        if (res.succeeded > 0) {
                            toast.success(t("szRegistry.archivedToast", {count: res.succeeded}));
                            setSelected(new Set());
                            void load();
                        }
                    }}
                />
            )}
        </div>
    );
}
