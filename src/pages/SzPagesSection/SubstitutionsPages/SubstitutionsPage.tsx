// Страница "Заявки на замещение"
import {useEffect, useMemo, useState} from "react";
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
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {
    type PickableUser,
} from "@/constants/pickableUser.ts";
import {DateFilterGroup, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {toDateRangeFilter} from "@/utils/dateUtils.ts";
import {userService} from "@/service/userService/userService.ts";
import {Icon} from "@/assets/icons/Icon.tsx";
import {ChevronDown, ChevronUp, SlidersHorizontal} from "lucide-react";
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

/** Период из DateFilterGroup → границы для сервера: точная дата — заявки, действующие в этот день. */
function periodBounds(v: DateFilterValue): { periodFrom?: string; periodTo?: string } {
    const r = toDateRangeFilter(v);
    if (!r) return {};
    if (r.exact) return {periodFrom: r.exact, periodTo: r.exact};
    return {periodFrom: r.from ?? undefined, periodTo: r.to ?? undefined};
}

const FILTER_LABEL_CLASS = "block text-[11.5px] text-[#8b97ab] mb-[5px]";

/** Условия расширенного поиска: черновик в панели и применённые к реестру. */
interface AdvancedFilters {
    absentUserId: number | null;
    substituteUserId: number | null;
    period: DateFilterValue;
}

const EMPTY_ADVANCED: AdvancedFilters = {absentUserId: null, substituteUserId: null, period: EMPTY_DATE_FILTER};

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
    /** Применённые условия расширенного поиска (по ним строится реестр). */
    const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_ADVANCED);
    /** То, что набрано в открытой панели, — применяется кнопкой "Найти". */
    const [draft, setDraft] = useState<AdvancedFilters>(EMPTY_ADVANCED);
    const [advOpen, setAdvOpen] = useState(false);
    const {absentUserId, substituteUserId, period} = advanced;
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Справочник сотрудников для фильтров "Отсутствующий" / "Замещающий".
    useEffect(() => {
        userService.lookup().then((list) => setUsers(list.map((u) => ({
            id: u.id, fullName: u.fullName, position: u.position ?? null,
            orgUnit: u.orgUnit ?? null, orgUnitId: u.orgUnitId ?? null,
            isBoardMember: u.isBoardMember ?? false, isUnitHead: u.isUnitHead ?? false,
        })))).catch(() => {
        });
    }, []);

    // Границы периода как строки — чтобы эффект ниже не перезапускался от нового объекта с теми же датами.
    const {periodFrom, periodTo} = useMemo(() => periodBounds(period), [period]);

    const hasAdvancedActive = absentUserId != null || substituteUserId != null || !!periodFrom || !!periodTo;

    const updateDraft = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) =>
        setDraft((d) => ({...d, [key]: value}));

    /** Открываем панель с уже применёнными условиями, а не с тем, что было набрано и не применено. */
    const toggleAdv = () => {
        if (!advOpen) setDraft(advanced);
        setAdvOpen((v) => !v);
    };
    const applyAdvanced = () => {
        setAdvanced(draft);
        setAdvOpen(false);
    };
    const resetAdvanced = () => {
        setDraft(EMPTY_ADVANCED);
        setAdvanced(EMPTY_ADVANCED);
    };

    useEffect(() => {
        let cancelled = false;
        // Небольшая задержка, чтобы не слать запрос на каждую букву; устаревший ответ отбрасываем.
        const timer = setTimeout(() => {
            const q = query.trim();
            setLoading(true);
            setError(null);
            substitutionService
                .search({
                    query: q || undefined,
                    status: status || undefined,
                    mineOnly: mineOnly || undefined,
                    absentUserId: absentUserId ?? undefined,
                    substituteUserId: substituteUserId ?? undefined,
                    periodFrom,
                    periodTo,
                    pageSize: 200,
                })
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
    }, [query, status, mineOnly, absentUserId, substituteUserId, periodFrom, periodTo, t]);

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
                    searchable
                    searchPlaceholder={t("substitutionRequests.statusSearchPlaceholder")}
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

            {/* Сохраненные фильтры + кнопка расширенного поиска справа от них */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <SavedFiltersBar
                    scope="substitution"
                    current={{query, status: status || null, mineOnly, absentUserId, substituteUserId, period}}
                    onApply={(p) => {
                        const f = p as {
                            query?: string;
                            status?: SubstitutionStatus | null;
                            mineOnly?: boolean;
                            absentUserId?: number | null;
                            substituteUserId?: number | null;
                            period?: DateFilterValue | null;
                        };
                        setQuery(f.query ?? "");
                        setStatus(f.status ?? "");
                        setMineOnly(!!f.mineOnly);
                        const next: AdvancedFilters = {
                            absentUserId: f.absentUserId ?? null,
                            substituteUserId: f.substituteUserId ?? null,
                            period: f.period ?? EMPTY_DATE_FILTER,
                        };
                        setAdvanced(next);
                        setDraft(next);
                    }}
                    onReset={() => {
                        setQuery("");
                        setStatus("");
                        setMineOnly(false);
                        resetAdvanced();
                    }}
                />
                {/* Расширенный поиск */}
                <button
                    type="button"
                    onClick={toggleAdv}
                    className={`relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] border px-3 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] ${
                        advOpen
                            ? "border-[#2f68f5] bg-[#f6f8fb] ring-[3px] ring-[#e9f0ff]"
                            : "border-[#e5e9f0] bg-white"
                    }`}
                >
                    <SlidersHorizontal className="h-[15px] w-[15px]" strokeWidth={1.8}/>
                    {t("registry.filters.advancedSearch")}
                    <ChevronDown
                        className={`h-[15px] w-[15px] flex-none text-[#a3adbd] transition-transform ${advOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                    />
                    {/* Зелёная точка — расширенный поиск применён */}
                    {hasAdvancedActive && (
                        <span
                            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white"/>
                    )}
                </button>
            </div>

            {/* Панель расширенного поиска: отсутствующий, замещающий, период */}
            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out ${
                    advOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="rounded-2xl border border-[#e9edf3] bg-white px-[22px] py-5">
                        <div
                            className="mb-[18px] grid gap-x-[18px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                            <div>
                                <span className={FILTER_LABEL_CLASS}>{t("substitutionRequests.filters.absent")}</span>
                                <UserPickerField
                                    people={users}
                                    value={draft.absentUserId}
                                    onChange={(id) => updateDraft("absentUserId", id)}
                                    clearable
                                    onClear={() => updateDraft("absentUserId", null)}
                                    excludeId={draft.substituteUserId ?? undefined}
                                    accent="blue"
                                    placeholder={t("substitutionRequests.filters.anyEmployee")}
                                    modalTitle={t("substitutionRequests.filters.absentModalTitle")}
                                    searchPlaceholder={t("substitutionRequests.filters.employeeSearchPlaceholder")}
                                />
                            </div>
                            <div>
                                <span
                                    className={FILTER_LABEL_CLASS}>{t("substitutionRequests.filters.substitute")}</span>
                                <UserPickerField
                                    people={users}
                                    value={draft.substituteUserId}
                                    onChange={(id) => updateDraft("substituteUserId", id)}
                                    clearable
                                    onClear={() => updateDraft("substituteUserId", null)}
                                    excludeId={draft.absentUserId ?? undefined}
                                    accent="blue"
                                    placeholder={t("substitutionRequests.filters.anyEmployee")}
                                    modalTitle={t("substitutionRequests.filters.substituteModalTitle")}
                                    searchPlaceholder={t("substitutionRequests.filters.employeeSearchPlaceholder")}
                                />
                            </div>
                        </div>

                        <div className="mb-[18px] rounded-xl border border-[#eef2f7] p-3.5">
                            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                {t("substitutionRequests.filters.period")}
                            </div>
                            <DateFilterGroup
                                accent="blue"
                                rows={[{
                                    key: "period",
                                    label: t("substitutionRequests.filters.periodRow"),
                                    value: draft.period,
                                    onChange: (v) => updateDraft("period", v),
                                }]}
                            />
                        </div>

                        <div className="flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setAdvOpen(false)}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb]"
                            >
                                <ChevronUp className="h-[15px] w-[15px]" strokeWidth={2}/>
                                {t("registry.filters.advanced.collapse")}
                            </button>
                            <button
                                type="button"
                                onClick={resetAdvanced}
                                className="h-10 cursor-pointer rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb]"
                            >
                                {t("registry.filters.advanced.reset")}
                            </button>
                            <button
                                type="button"
                                onClick={applyAdvanced}
                                className="h-10 cursor-pointer rounded-[10px] border-none bg-[#2f68f5] px-5 text-[12.5px] font-semibold text-white hover:brightness-[1.06]"
                            >
                                {t("registry.filters.advanced.apply")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
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
                        <tr>
                            <td colSpan={6}
                                className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("general.loading")}</td>
                        </tr>
                    ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={6}
                                className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{t("substitutionRequests.empty")}</td>
                        </tr>
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
                                    <Link to={`/substitutions/${r.id}`}
                                          className="text-[#1c2740] no-underline hover:underline">
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
                                    {r.substituteName ?
                                        <HighlightText text={r.substituteName} query={appliedQuery}/> : "—"}
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
