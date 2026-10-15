/**
 * Реестр «Заявки и закупки» (экран v8 isPrc). Вкладки — срезы по статусу,
 * строка ведёт в карточку закупки.
 */
import React, {useCallback, useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {
    // PROCUREMENT_STATUS_LABEL,
    procurementService,
    type ProcurementCounters,
    type ProcurementListItem,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Download} from "lucide-react";
import {Icon} from "@/assets/icons/Icon.tsx";
import {toast} from "@/service/toastService.ts";
import {HighlightTerms} from "@/utils/highlightText.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {useRowSelection} from "@/hooks/useRowSelection.ts";
import {colors} from "@/design/tokens";

type ScopeId = "all" | "mine" | "drafts" | "approval" | "inprocurement" | "completed";

const SCOPES: { id: ScopeId; statuses?: ProcurementStatusCode[]; mineOnly?: boolean }[] = [
    {id: "all"},                                                                // "Все закупки"
    {id: "mine", mineOnly: true},                                               // "Инициирую я"
    {id: "drafts", statuses: ["Draft"], mineOnly: true},                        // "Черновики"
    {id: "approval", statuses: ["OnApproval"]},                                 // "На согласовании"
    {id: "inprocurement", statuses: ["InProcurement", "Approved"]},             // "В закупке"
    {id: "completed", statuses: ["Completed"]},                                 // "Завершённые"
];

const STATUS_TONE: Partial<Record<ProcurementStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    Approved: colors.status.active,
    InProcurement: colors.status.consol,
    Completed: colors.status.active,
    OnRevision: colors.status.onact,
    Rejected: colors.status.arch,
    Cancelled: colors.status.draft,
};

function money(value: number, t: TFunction): string {
    // return `${value.toLocaleString("ru-RU")} сом`;
    return `${value.toLocaleString("ru-RU")} ${t("procurementRegistry.som")}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ru-RU");
}

export const ProcurementRegistryPage = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [scope, setScope] = useState<ScopeId>("all");
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<ProcurementListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [counters, setCounters] = useState<ProcurementCounters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {selected, toggleRow, toggleAll, allOnPageSelected, clear} = useRowSelection(items);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        clear();
    }, [scope, query, clear]);


    const doExport = useCallback(async (ids?: number[]) => {
        const current = SCOPES.find((s) => s.id === scope)!;
        setExporting(true);
        try {
            await procurementService.exportRegistry({
                query: query.trim() || undefined,
                statuses: current.statuses,
                mineOnly: current.mineOnly,
                ids,
            });
            // Всплывающее уведомление об успешной выгрузке
            toast.success(
                ids ? t("procurementRegistry.exportSelectedDone", {count: ids.length}) : t("procurementRegistry.exportDone"),
                t("procurementRegistry.exportDoneHint"),
            );
        } catch {
            // setError("Не удалось выгрузить реестр");
            toast.error(t("procurementRegistry.exportError"), t("procurementRegistry.exportErrorHint"));
        } finally {
            setExporting(false);
        }
    }, [scope, query, t]);

    const load = useCallback(async () => {
        const current = SCOPES.find(s => s.id === scope)!;
        try {
            setLoading(true);
            setError(null);
            const page = await procurementService.search({
                query: query.trim() || undefined,
                statuses: current.statuses,
                mineOnly: current.mineOnly,
                page: 1,
                pageSize: 50,
            });
            setItems(page.items);
            setTotal(page.total);
        } catch {
            // setError("Не удалось загрузить реестр закупок");
            setError(t("procurementRegistry.loadError"));
        } finally {
            setLoading(false);
        }
    }, [scope, query, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        procurementService.counters().then(setCounters).catch(() => undefined);
    }, [items.length]);

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "center", gap: 16}}>
                <div style={{flex: 1}}>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                        {/* Заявки и закупки */}
                        {t("procurementRegistry.title")}
                    </h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {counters
                            // ? `Всего ${counters.all} · на согласовании ${counters.onApproval} · в закупке ${counters.inProcurement}`
                            ? t("procurementRegistry.summary", {
                                all: counters.all,
                                onApproval: counters.onApproval,
                                inProcurement: counters.inProcurement,
                            })
                            // : "Реестр закупок"}
                            : t("procurementRegistry.subtitle")}
                    </div>
                </div>

                <button
                    onClick={() => void doExport()}
                    disabled={exporting || total === 0}
                    style={{
                        display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 13px",
                        border: "1px solid #e5e9f0", borderRadius: 10, background: "#fff", color: "#3a4560",
                        font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        opacity: exporting || total === 0 ? 0.5 : 1,
                    }}
                >
                    <Download size={16}/>
                    {/* {exporting ? "Готовим…" : "Выгрузить в Excel"} */}
                    {exporting ? t("procurementRegistry.exporting") : t("procurementRegistry.exportExcel")}
                </button>

                {/* Стиль кнопки — как у "Создать СЗ" в реестре служебных записок */}
                <button
                    onClick={() => navigate("/prc/new")}
                    className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] border-none bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]"
                >
                    <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                    {/* Новая заявка */}
                    {t("procurementRegistry.create")}
                </button>
            </div>

            {selected.size > 0 && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                    borderRadius: 12, border: "1px solid #dbe4fb", background: "#eef3ff", padding: "8px 14px",
                }}>
                    <span style={{fontSize: 12.5, fontWeight: 600, color: "#2f68f5"}}>
                        {/* Выбрано: {selected.size} */}
                        {t("procurementRegistry.selected", {count: selected.size})}
                    </span>
                    <button
                        onClick={() => void doExport([...selected])} disabled={exporting}
                        style={{height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #c9d6f5", background: "#fff", color: "#2f68f5", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer"}}
                    >
                        {/* Экспорт выбранных */}
                        {t("procurementRegistry.exportSelected")}
                    </button>
                    <button
                        onClick={clear}
                        style={{fontSize: 12, color: "#8b97ab", background: "none", border: "none", cursor: "pointer"}}
                    >
                        {/* Снять выбор */}
                        {t("procurementRegistry.clearSelection")}
                    </button>
                </div>
            )}

            <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                {SCOPES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setScope(s.id)}
                        style={{
                            padding: "7px 13px", borderRadius: 9, font: "inherit", fontSize: 12.5, fontWeight: 600,
                            cursor: "pointer",
                            border: `1px solid ${scope === s.id ? "#2f68f5" : "#e5e9f0"}`,
                            background: scope === s.id ? "#eef3ff" : "#fff",
                            color: scope === s.id ? "#2f68f5" : "#55617a",
                        }}
                    >
                        {/* s.label */}
                        {t(`procurementRegistry.scopes.${s.id}`)}
                    </button>
                ))}

                <SearchBar
                    variant="white"
                    value={query}
                    onChange={setQuery}
                    /* placeholder="Поиск по предмету или номеру…" */
                    placeholder={t("procurementRegistry.searchPlaceholder")}
                    className="flex-1 min-w-[220px]"
                />
            </div>

            {/* Сохранённые фильтры (БП-16) для реестра закупок. */}
            <div style={{marginTop: 10}}>
                <SavedFiltersBar
                    scope="procurement"
                    current={{scope, query}}
                    onApply={(p) => {
                        const f = p as {scope?: ScopeId; query?: string};
                        if (f.scope) setScope(f.scope);
                        setQuery(f.query ?? "");
                    }}
                />
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            <section style={{background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, overflow: "hidden"}}>
                <div style={{overflowX: "auto"}}>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                        <thead>
                        <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                            <th style={{...th, width: 34}}>
                                {/* <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} aria-label="Выбрать все"/> */}
                                <PlainCheckbox checked={allOnPageSelected} onChange={toggleAll} tone="brand">
                                    <span className="sr-only">{t("procurementRegistry.selectAll")}</span>
                                </PlainCheckbox>
                            </th>
                            <th style={th}>
                                {/* Номер */}
                                {t("procurementRegistry.cols.number")}
                            </th>
                            <th style={th}>
                                {/* Предмет закупки */}
                                {t("procurementRegistry.cols.subject")}
                            </th>
                            <th style={th}>
                                {/* Способ */}
                                {t("procurementRegistry.cols.method")}
                            </th>
                            <th style={{...th, textAlign: "right"}}>
                                {/* Сумма */}
                                {t("procurementRegistry.cols.amount")}
                            </th>
                            <th style={th}>
                                {/* Инициатор */}
                                {t("procurementRegistry.cols.initiator")}
                            </th>
                            <th style={th}>
                                {/* Создана */}
                                {t("procurementRegistry.cols.created")}
                            </th>
                            <th style={th}>
                                {/* Статус */}
                                {t("procurementRegistry.cols.status")}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map(item => {
                            const tone = STATUS_TONE[item.statusCode] ?? colors.status.draft;
                            return (
                                <tr key={item.id} style={{borderTop: "1px solid #eef2f7"}}>
                                    <td style={{...td, width: 34}}>
                                        {/* <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleRow(item.id)} aria-label="Выбрать"/> */}
                                        <PlainCheckbox checked={selected.has(item.id)} onChange={() => toggleRow(item.id)} tone="brand">
                                            <span className="sr-only">{t("procurementRegistry.selectRow")}</span>
                                        </PlainCheckbox>
                                    </td>
                                    <td style={td}>
                                        <Link to={`/prc/${item.id}`} style={{color: "#2f68f5", fontWeight: 600, textDecoration: "none"}}>
                                            {/* item.regNumber ?? "б/н" */}
                                            {item.regNumber
                                                ? <HighlightTerms text={item.regNumber} query={query}/>
                                                : t("procurementRegistry.noNumber")}
                                        </Link>
                                        {item.sourceSzRegNumber && (
                                            <div style={{fontSize: 11, color: "#8b97ab"}}>
                                                {/* по записке {item.sourceSzRegNumber} */}
                                                {t("procurementRegistry.fromMemo")} <HighlightTerms text={item.sourceSzRegNumber} query={query}/>
                                            </div>
                                        )}
                                    </td>
                                    <td style={td}>
                                        <HighlightTerms text={item.subject} query={query}/>
                                        {item.isAffiliated && (
                                            <span style={{marginLeft: 6, fontSize: 11, color: "#c77700"}}>
                                                    {/* аффилированное лицо */}
                                                {t("procurementRegistry.affiliated")}
                                                </span>
                                        )}
                                    </td>
                                    <td style={td}><HighlightTerms text={item.methodShortTitle} query={query}/></td>
                                    <td style={{...td, textAlign: "right", whiteSpace: "nowrap"}}>
                                        {money(item.amount, t)}
                                        {!item.hasBudget && (
                                            <div style={{fontSize: 11, color: "#c77700"}}>
                                                {/* вне бюджета */}
                                                {t("procurementRegistry.offBudget")}
                                            </div>
                                        )}
                                    </td>
                                    <td style={td}>
                                        {item.initiatorName ? <HighlightTerms text={item.initiatorName} query={query}/> : "—"}
                                        <div style={{fontSize: 11, color: "#8b97ab"}}>
                                            {item.initiatorUnit ? <HighlightTerms text={item.initiatorUnit} query={query}/> : ""}
                                        </div>
                                    </td>
                                    <td style={{...td, whiteSpace: "nowrap"}}>{formatDate(item.createdAt)}</td>
                                    <td style={td}>
                                            <span style={{
                                                padding: "4px 9px", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                                                color: tone.fg, background: tone.bg,
                                            }}>
                                                {/* PROCUREMENT_STATUS_LABEL[item.statusCode] */}
                                                {t(`procurementRegistry.statuses.${item.statusCode}`, {defaultValue: item.statusCode})}
                                            </span>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {!loading && items.length === 0 && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        {/* Заявок в этом срезе нет */}
                        {t("procurementRegistry.empty")}
                    </div>
                )}
                {loading && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        {/* Загрузка… */}
                        {t("general.loading")}
                    </div>
                )}
            </section>

            <div style={{fontSize: 11.5, color: "#8b97ab"}}>
                {/* Показано {items.length} из {total} */}
                {t("procurementRegistry.shown", {shown: items.length, total})}
            </div>
        </div>
    );
};

const th: React.CSSProperties = {padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 14px", verticalAlign: "top", color: "#26324a"};