import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {Plus} from "lucide-react";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {substitutionService, STATUS_LABEL, type SubstitutionListItem, type SubstitutionStatus}
    from "@/service/substitutionService/substitutionService.ts";

const STATUS_TONE: Record<SubstitutionStatus, string> = {
    Draft: "#5b6472", OnApproval: "#2f68f5", OnExecution: "#b3730a",
    Executed: "#1c7a4d", Rejected: "#c0392b", Withdrawn: "#8b97ab",
};

function period(a: string | null, b: string | null): string {
    if (!a && !b) return "—";
    const f = (d: string | null) => d ? new Date(d).toLocaleDateString("ru-RU") : "…";
    return `${f(a)} — ${f(b)}`;
}

export function SubstitutionRequestsPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<SubstitutionListItem[]>([]);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<SubstitutionStatus | "">("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        substitutionService.search({query: query.trim() || undefined, status: status || undefined, pageSize: 200})
            .then((p) => setRows(p.items))
            .finally(() => setLoading(false));
    }, [status]);

    function runSearch() {
        setLoading(true);
        substitutionService.search({query: query.trim() || undefined, status: status || undefined, pageSize: 200})
            .then((p) => setRows(p.items))
            .finally(() => setLoading(false));
    }

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Заявки на замещение"
                description="Оформление замещения на время отсутствия работника: комиссия приёма-передачи, приказ УЧР"
                actions={(
                    <Link to="/substitutions/new"
                          className="flex items-center gap-2 rounded-[10px] bg-[#2f68f5] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#2554cc] no-underline">
                        <Plus size={17}/> Создать заявку
                    </Link>
                )}
            />

            <div className="flex items-center gap-2 flex-wrap">
                <input
                    className="h-9 flex-1 min-w-[240px] px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5]"
                    placeholder="Поиск: тема, ФИО, номер…" value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                />
                <select className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px]"
                        value={status} onChange={(e) => setStatus(e.target.value as SubstitutionStatus | "")}>
                    <option value="">Все статусы</option>
                    {(Object.keys(STATUS_LABEL) as SubstitutionStatus[]).map((s) =>
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
            </div>

            <div className="rounded-[13px] border border-[#e5e9f0] bg-white overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-[#f6f8fb] text-[#8b97ab] text-left">
                            <th className="px-4 py-2.5 font-semibold">Номер</th>
                            <th className="px-4 py-2.5 font-semibold">Тема / причина</th>
                            <th className="px-4 py-2.5 font-semibold">Отсутствующий</th>
                            <th className="px-4 py-2.5 font-semibold">Замещающий</th>
                            <th className="px-4 py-2.5 font-semibold">Период</th>
                            <th className="px-4 py-2.5 font-semibold">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} onClick={() => navigate(`/substitutions/${r.id}`)}
                                className="border-t border-[#eef2f7] cursor-pointer hover:bg-[#f9fbfe]">
                                <td className="px-4 py-2.5 font-mono text-[12px] text-[#2f68f5]">{r.regNumber ?? "черновик"}</td>
                                <td className="px-4 py-2.5">
                                    <div className="font-medium text-[#1c2740]">{r.subject || "—"}</div>
                                    <div className="text-[11.5px] text-[#8b97ab]">{r.reasonTitle}</div>
                                </td>
                                <td className="px-4 py-2.5 text-[#374253]">{r.absentName || "—"}</td>
                                <td className="px-4 py-2.5 text-[#374253]">{r.substituteName || "—"}</td>
                                <td className="px-4 py-2.5 text-[#55617a] whitespace-nowrap">{period(r.startsOn, r.endsOn)}</td>
                                <td className="px-4 py-2.5">
                                    <span className="text-[12px] font-semibold" style={{color: STATUS_TONE[r.status]}}>{r.statusTitle}</span>
                                </td>
                            </tr>
                        ))}
                        {!loading && rows.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8b97ab]">Заявок нет.</td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8b97ab]">Загрузка…</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
