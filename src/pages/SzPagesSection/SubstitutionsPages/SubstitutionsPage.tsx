// Страница "Заявки на замещение"
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link, useNavigate} from "react-router-dom";
import {
    substitutionService,
    REASON_LABEL,
    STATUS_LABEL,
    type SubstitutionListItem,
    type SubstitutionReason,
    type SubstitutionStatus,
} from "@/service/substitutionService/substitutionService.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {Icon} from "@/assets/icons/Icon.tsx";
import {colors} from "@/design/tokens.ts";

const STATUSES = Object.keys(STATUS_LABEL) as SubstitutionStatus[];

const STATUS_TONE: Record<SubstitutionStatus, { fg: string; bg: string }> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    OnExecution: colors.status.onact,
    Executed: colors.status.active,
    Rejected: colors.status.arch,
    Withdrawn: colors.status.draft,
};

/** Бэкенд отдаёт причину русской строкой; по ней находим код, чтобы показать перевод. */
const REASON_CODE_BY_TITLE = Object.fromEntries(
    (Object.entries(REASON_LABEL) as [SubstitutionReason, string][]).map(([code, title]) => [title, code]),
) as Record<string, SubstitutionReason>;

function formatDate(iso: string | null): string {
    if (!iso) return "…";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

export function SubstitutionRequestsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [rows, setRows] = useState<SubstitutionListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [query, setQuery] = useState("");
    /** Запрос, по которому получены строки в таблице: подсвечиваем его, а не то что набрано прямо сейчас. */
    const [appliedQuery, setAppliedQuery] = useState("");
    const [status, setStatus] = useState<SubstitutionStatus | "">("");
    const [mineOnly, setMineOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // Небольшая задержка, чтобы не слать запрос на каждую букву; устаревший ответ отбрасываем.
        const timer = setTimeout(() => {
            const q = query.trim();
            setLoading(true);
            setError(null);
            substitutionService
                .search({query: q || undefined, status: status || undefined, mineOnly: mineOnly || undefined, pageSize: 200})
                .then((p) => {
                    if (cancelled) return;
                    setRows(p.items);
                    setTotal(p.total);
                    setAppliedQuery(q);
                })
                .catch(() => {
                    if (!cancelled) setError(t("substitutionRequests.loadError"));
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, status, mineOnly, t]);

    const reasonText = (title: string): string => {
        const code = REASON_CODE_BY_TITLE[title];
        return code ? t(`substitutionRequests.reason.${code}`) : title;
    };

    return (
        <div className="px-7 py-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">{t("substitutionRequests.title")}</h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">{t("substitutionRequests.subtitle")}</p>
                </div>
                <button
                    onClick={() => navigate("/substitutions/new")}
                    className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]">
                    <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                    {t("substitutionRequests.create")}
                </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <SearchBar
                    variant="white"
                    value={query}
                    onChange={setQuery}
                    placeholder={t("substitutionRequests.searchPlaceholder")}
                    className="min-w-[280px] flex-1"
                />
                {/* Статус */}
                <SelectDropdown
                    options={[
                        {value: "", label: t("substitutionRequests.allStatuses")},
                        ...STATUSES.map((s) => ({value: s, label: t(`substitutionRequests.status.${s}`)})),
                    ]}
                    value={status}
                    onChange={(v) => setStatus(v as SubstitutionStatus | "")}
                    minWidth="170px"
                    accent="blue"
                />
                {/* Только мои */}
                <CheckBoxOne checked={mineOnly} onChange={setMineOnly} tone="brand">
                    {t("substitutionRequests.mineOnly")}
                </CheckBoxOne>
                <div className="text-[12.5px] text-[#8b97ab]">
                    {t("substitutionRequests.found")}: <b className="font-mono text-[#3a4560]">{total}</b>
                </div>
            </div>

            {/* Сохраненные фильтры */}
            <div className="mt-2.5">
                <SavedFiltersBar
                    scope="substitution"
                    current={{query, status: status || null, mineOnly}}
                    onApply={(p) => {
                        const f = p as { query?: string; status?: SubstitutionStatus | null; mineOnly?: boolean };
                        setQuery(f.query ?? "");
                        setStatus(f.status ?? "");
                        setMineOnly(!!f.mineOnly);
                    }}
                />
            </div>

            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                    <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        <th className="px-4 py-2.5 text-left w-[140px]">{t("substitutionRequests.cols.number")}</th>
                        <th className="px-4 py-2.5 text-left">{t("substitutionRequests.cols.subject")}</th>
                        <th className="px-4 py-2.5 text-left w-[190px]">{t("substitutionRequests.cols.absent")}</th>
                        <th className="px-4 py-2.5 text-left w-[190px]">{t("substitutionRequests.cols.substitute")}</th>
                        <th className="px-4 py-2.5 text-left w-[190px]">{t("substitutionRequests.cols.period")}</th>
                        <th className="px-4 py-2.5 text-left w-[170px]">{t("substitutionRequests.cols.status")}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("general.loading")}</td></tr>
                    ) : rows.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("substitutionRequests.empty")}</td></tr>
                    ) : rows.map((r) => {
                        const tone = STATUS_TONE[r.status] ?? colors.status.draft;
                        return (
                            <tr key={r.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                                <td className="px-4 py-2.5">
                                    <Link to={`/substitutions/${r.id}`}
                                          className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                        {r.regNumber
                                            ? <HighlightText text={r.regNumber} query={appliedQuery}/>
                                            : t("substitutionRequests.draftNumber")}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5">
                                    <Link to={`/substitutions/${r.id}`} className="text-[#1c2740] no-underline hover:underline">
                                        {r.subject
                                            ? <HighlightText text={r.subject} query={appliedQuery}/>
                                            : "—"}
                                    </Link>
                                    <div className="text-[12px] text-[#8b97ab]">{reasonText(r.reasonTitle)}</div>
                                </td>
                                <td className="px-4 py-2.5 text-[#55617a]">
                                    {r.absentName ? <HighlightText text={r.absentName} query={appliedQuery}/> : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-[#55617a]">
                                    {r.substituteName ? <HighlightText text={r.substituteName} query={appliedQuery}/> : "—"}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-[#55617a]">
                                    {!r.startsOn && !r.endsOn ? "—" : `${formatDate(r.startsOn)} — ${formatDate(r.endsOn)}`}
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                          style={{color: tone.fg, background: tone.bg}}>
                                        {t(`substitutionRequests.status.${r.status}`)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
