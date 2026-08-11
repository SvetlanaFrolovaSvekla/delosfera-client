import {useCallback, useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {Plus} from "lucide-react";
import {colors} from "@/design/tokens";
import {
    SZ_STATUS_LABEL,
    szService,
    type SzCounters,
    type SzKind,
    type SzListItem,
    type SzStatusCode,
} from "@/service/szService/szService.ts";
import {
    ASSIGNMENT_STATE_LABEL,
    szExecutionService,
    type SzAssignment,
} from "@/service/szService/szExecutionService.ts";
import {szPaperService, type SzOriginal} from "@/service/szService/szPaperService.ts";

type ScopeId = "all" | "inbox" | "assignments" | "originals" | "mine" | "drafts" | "pending" | "archive";

const SCOPES: { id: ScopeId; label: string; statuses?: SzStatusCode[]; mineOnly?: boolean }[] = [
    {id: "all", label: "Реестр"},
    {id: "inbox", label: "СЗ, согласую я"},
    {id: "assignments", label: "Мои поручения"},
    {id: "originals", label: "Оригиналы на руках"},
    {id: "mine", label: "СЗ, инициирую я", mineOnly: true},
    {id: "drafts", label: "Черновики", statuses: ["Draft"], mineOnly: true},
    {id: "pending", label: "Ждут регистрации", statuses: ["PendingRegistration"]},
    {id: "archive", label: "Архив", statuses: ["Archived"]},
];

const STATUS_TONE: Partial<Record<SzStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    PendingRegistration: colors.status.onact,
    Registered: colors.status.review,
    OnRevision: colors.status.onact,
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
    const navigate = useNavigate();
    const [scope, setScope] = useState<ScopeId>("all");
    const [query, setQuery] = useState("");
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

    useEffect(() => {
        szService.kinds().then(setKinds).catch(() => {});
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
        } catch {
            setError("Не удалось загрузить реестр служебных записок");
        } finally {
            setLoading(false);
        }
    }, [scope, query, kindId, overdueOnly]);

    useEffect(() => {
        void load();
    }, [load]);

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
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">Служебные записки</h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        Реестр СЗ · регистрация, сроки исполнения и статусы согласования
                    </p>
                </div>
                <button
                    onClick={() => navigate("/sz/new")}
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#2f68f5] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06]"
                >
                    <Plus className="w-4 h-4"/> Создать СЗ
                </button>
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
                                {s.label}
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
            <div className={`mt-4 flex flex-wrap items-center gap-2.5 ${scope === "inbox" || scope === "assignments" || scope === "originals" ? "hidden" : ""}`}>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по номеру, заголовку и тексту…"
                    className="h-10 min-w-[280px] flex-1 rounded-[10px] border border-[#e5e9f0] bg-white px-3.5 text-[13px] outline-none focus:border-[#2f68f5]"
                />
                <select
                    value={kindId}
                    onChange={(e) => setKindId(e.target.value ? Number(e.target.value) : "")}
                    className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-3 text-[13px] font-semibold text-[#3a4560]"
                >
                    <option value="">Все виды</option>
                    {kinds.map((k) => <option key={k.id} value={k.id}>{k.titleRu}</option>)}
                </select>
                <label className="inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#55617a] cursor-pointer">
                    <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)}/>
                    Только просроченные
                </label>
                <div className="text-[12.5px] text-[#8b97ab]">
                    Найдено: <b className="font-mono text-[#3a4560]">{total}</b>
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {scope === "originals" ? (
                <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                        <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            <th className="px-4 py-2.5 text-left w-[140px]">Записка</th>
                            <th className="px-4 py-2.5 text-left">Заголовок</th>
                            <th className="px-4 py-2.5 text-left w-[190px]">У кого</th>
                            <th className="px-4 py-2.5 text-left w-[170px]">Место хранения</th>
                            <th className="px-4 py-2.5 text-left w-[160px]">Вернуть до</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</td></tr>
                        ) : originals.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">Все оригиналы в деле</td></tr>
                        ) : originals.map((o) => (
                            <tr key={o.szId} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${o.szId}`}
                                          className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                        {o.regNumber ?? "— без номера"}
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
                                                {o.isOverdue ? `−${Math.abs(o.daysLeft ?? 0)} дн` : `через ${o.daysLeft} дн`}
                                            </span>
                                        </span>
                                    ) : "срок не задан"}
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
                            <th className="px-4 py-2.5 text-left w-[140px]">Записка</th>
                            <th className="px-4 py-2.5 text-left">Поручение</th>
                            <th className="px-4 py-2.5 text-left w-[150px]">Срок</th>
                            <th className="px-4 py-2.5 text-left w-[150px]">Состояние</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</td></tr>
                        ) : assignments.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">Поручений нет</td></tr>
                        ) : assignments.map((a) => (
                            <tr key={a.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${a.szDocumentId}`}
                                          className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                        {a.szRegNumber ?? "— без номера"}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${a.szDocumentId}`} className="text-[#1c2740] no-underline hover:underline">
                                        {a.text}
                                    </Link>
                                    <div className="text-[12px] text-[#8b97ab]">{a.szTitle}</div>
                                    {a.returnReason && (
                                        <div className="text-[12px] text-[#b3730a]">Возвращено: {a.returnReason}</div>
                                    )}
                                </td>
                                <td className="px-4 py-2.5">
                                    {a.dueDate ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span>{formatDate(a.dueDate)}</span>
                                            <span className="text-[11.5px] font-semibold"
                                                  style={{color: a.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                                {a.isOverdue ? `−${Math.abs(a.daysLeft ?? 0)} дн` : `через ${a.daysLeft} дн`}
                                            </span>
                                        </span>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-[12.5px]"
                                    style={{color: a.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                    {a.isOverdue ? "Просрочено" : ASSIGNMENT_STATE_LABEL[a.state]}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
            <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                    <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        <th className="px-4 py-2.5 text-left w-[140px]">Номер</th>
                        <th className="px-4 py-2.5 text-left">Заголовок</th>
                        <th className="px-4 py-2.5 text-left w-[130px]">Вид</th>
                        <th className="px-4 py-2.5 text-left w-[170px]">Автор</th>
                        <th className="px-4 py-2.5 text-left w-[150px]">Срок исполнения</th>
                        <th className="px-4 py-2.5 text-left w-[180px]">Статус</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">Записок нет</td></tr>
                    ) : items.map((i) => {
                        const tone = STATUS_TONE[i.statusCode] ?? colors.status.draft;
                        return (
                            <tr key={i.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${i.id}`} className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                        {i.regNumber ?? "— без номера"}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5">
                                    <Link to={`/sz/${i.id}`} className="text-[#1c2740] no-underline hover:underline">{i.title}</Link>
                                    {i.isPaperCarrier && (
                                        <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-[.03em] text-[#b3730a]">бумага</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-[#55617a]">{i.kind}</td>
                                <td className="px-4 py-2.5 text-[#55617a]">{i.author ?? "—"}</td>
                                <td className="px-4 py-2.5">
                                    {i.dueDate ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span>{formatDate(i.dueDate)}</span>
                                            <span className="text-[11.5px] font-semibold"
                                                  style={{color: i.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                                {i.isOverdue ? `−${Math.abs(i.daysLeft ?? 0)} дн` : `через ${i.daysLeft} дн`}
                                            </span>
                                        </span>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                          style={{color: tone.fg, background: tone.bg}}>
                                        {SZ_STATUS_LABEL[i.statusCode]}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
            )}
        </div>
    );
}
