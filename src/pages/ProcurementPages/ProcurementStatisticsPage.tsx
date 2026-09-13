import {useCallback, useEffect, useMemo, useState} from "react";
import type {CSSProperties} from "react";
import {colors} from "@/design/tokens";
import {
    PROCUREMENT_STATUS_LABEL,
    procurementService,
    type ProcurementCounters,
    type ProcurementListItem,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";
import {planService, type Plan} from "@/service/procurementService/planService.ts";

/**
 * Аналитика «Заявки и закупки».
 *
 * Собрана из уже существующих эндпоинтов (без отдельного сервера статистики,
 * как у служебных записок — см. SzStatisticsPage.tsx): счётчики по статусам —
 * с сервера, разрезы по способу/подразделению/месяцам — агрегированы на
 * фронте по полному реестру заявок. Плюс исполнение годового Плана закупок:
 * план/факт и перерасход по позициям.
 */

const PAGE_SIZE = 200;
const MAX_PAGES = 20; // защита от бесконечного цикла — до 4000 заявок хватит с запасом

function money(value: number): string {
    return `${Math.round(value).toLocaleString("ru-RU")} сом`;
}

function formatMonth(key: string): string {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("ru-RU", {month: "short", year: "numeric"});
}

/** Открытый/закрытый конкурс — конкурентный способ; прямая закупка и упрощённый
 * способ — нет. Признак не приходит с сервера отдельным полем, поэтому определяется
 * по названию способа — все конкурсные методы в системе называются "...конкурс...". */
function isCompetitiveMethod(title: string): boolean {
    return /конкурс/i.test(title);
}

interface Bucket {
    count: number;
    amount: number;
}

function addToBucket(map: Map<string, Bucket>, key: string, amount: number) {
    const bucket = map.get(key) ?? {count: 0, amount: 0};
    bucket.count += 1;
    bucket.amount += amount;
    map.set(key, bucket);
}

function sortedBuckets(map: Map<string, Bucket>): [string, Bucket][] {
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
}

interface BreakdownTableProps {
    title: string;
    rows: [string, Bucket][];
    nameHeader: string;
    totalCount: number;
}

function BreakdownTable({title, rows, nameHeader, totalCount}: BreakdownTableProps) {
    return (
        <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>{title}</h2>
            <div style={{overflowX: "auto"}}>
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <thead>
                        <tr style={{background: colors.surfaceAlt, color: colors.inkMuted, textAlign: "left"}}>
                            <th style={th}>{nameHeader}</th>
                            <th style={{...th, textAlign: "right", width: 90}}>Заявок</th>
                            <th style={{...th, textAlign: "right", width: 90}}>Доля</th>
                            <th style={{...th, textAlign: "right", width: 150}}>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{...td, textAlign: "center", color: colors.inkSubtle, padding: "20px 14px"}}>
                                    Данных нет
                                </td>
                            </tr>
                        ) : rows.map(([name, bucket]) => (
                            <tr key={name} style={{borderTop: `1px solid ${colors.borderSoft}`}}>
                                <td style={td}>{name}</td>
                                <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{bucket.count}</td>
                                <td style={{...td, textAlign: "right", color: colors.inkSubtle, fontVariantNumeric: "tabular-nums"}}>
                                    {totalCount > 0 ? `${Math.round((bucket.count / totalCount) * 100)}%` : "—"}
                                </td>
                                <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{money(bucket.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/** embedded — страница показывается вкладкой раздела «Аналитика», без своей шапки. */
export function ProcurementStatisticsPage({embedded}: {embedded?: boolean} = {}) {
    const [counters, setCounters] = useState<ProcurementCounters | null>(null);
    const [items, setItems] = useState<ProcurementListItem[]>([]);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [planYear, setPlanYear] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [countersResult, years] = await Promise.all([
                procurementService.counters(),
                planService.years().catch(() => [] as number[]),
            ]);
            setCounters(countersResult);

            // Собираем полный реестр постранично — счётчики по способу/подразделению/
            // месяцам нужен весь список, а не одна страница таблицы.
            const all: ProcurementListItem[] = [];
            let page = 1;
            for (; page <= MAX_PAGES; page++) {
                const result = await procurementService.search({page, pageSize: PAGE_SIZE});
                all.push(...result.items);
                if (all.length >= result.total || result.items.length === 0) break;
            }
            setItems(all);

            const latestYear = years.length > 0 ? Math.max(...years) : null;
            setPlanYear(latestYear);
            setPlan(latestYear ? await planService.get(latestYear) : null);
        } catch {
            setError("Не удалось построить аналитику по закупкам");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.amount, 0), [items]);

    const byStatus = useMemo(() => {
        if (!counters) return [];
        return (Object.entries(counters.byStatus) as [ProcurementStatusCode, number][])
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);
    }, [counters]);

    const byMethod = useMemo(() => {
        const map = new Map<string, Bucket>();
        items.forEach((i) => addToBucket(map, i.methodShortTitle || "Не определён", i.amount));
        return sortedBuckets(map);
    }, [items]);

    const byUnit = useMemo(() => {
        const map = new Map<string, Bucket>();
        items.forEach((i) => addToBucket(map, i.initiatorUnit || "Не указано", i.amount));
        return sortedBuckets(map);
    }, [items]);

    const byMonth = useMemo(() => {
        const map = new Map<string, Bucket>();
        items.forEach((i) => {
            const d = new Date(i.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            addToBucket(map, key, i.amount);
        });
        // По месяцам смотрят хронологически, а не по величине, как остальные разрезы.
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    const maxMonthCount = useMemo(() => Math.max(...byMonth.map(([, b]) => b.count), 1), [byMonth]);

    const competitiveCount = useMemo(
        () => items.filter((i) => isCompetitiveMethod(i.methodShortTitle)).length,
        [items]
    );
    const competitiveShare = items.length > 0 ? Math.round((competitiveCount / items.length) * 100) : null;

    const affiliatedCount = useMemo(() => items.filter((i) => i.isAffiliated).length, [items]);

    const overrunItems = useMemo(
        () => (plan?.items ?? []).filter((i) => i.isOverrun).sort((a, b) => (b.deviationPercent ?? 0) - (a.deviationPercent ?? 0)),
        [plan]
    );

    const tiles = [
        {label: "Всего заявок", value: counters ? String(counters.all) : "—", color: colors.ink},
        {label: "Сумма заявок", value: items.length > 0 ? money(totalAmount) : "—", color: colors.ink},
        {label: "В закупке", value: counters ? String(counters.inProcurement) : "—", color: colors.accent},
        {label: "Завершено", value: counters ? String(counters.completed) : "—", color: colors.status.active.fg},
        {
            label: "Доля конкурсных способов",
            value: competitiveShare !== null ? `${competitiveShare}%` : "—",
            color: colors.status.consol.fg,
        },
        {
            label: "С аффилированными лицами",
            value: String(affiliatedCount),
            color: affiliatedCount > 0 ? colors.status.onact.fg : colors.inkSubtle,
        },
    ];

    return (
        <div style={embedded ? containerStyle : {...containerStyle, padding: "22px 26px"}}>
            {!embedded && (
                <div>
                    <div style={{fontSize: 12.5, color: colors.inkSubtle}}>Заявки и закупки</div>
                    <h1 style={{margin: 0, marginTop: 3, fontSize: 19, fontWeight: 700, color: colors.ink}}>Аналитика</h1>
                </div>
            )}

            {error && (
                <div style={{
                    borderRadius: 9, border: `1px solid ${colors.ryg.red.bd}`, background: colors.ryg.red.bg,
                    padding: "10px 16px", fontSize: 13, color: colors.ryg.red.fg,
                }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{padding: 28, textAlign: "center", color: colors.inkSubtle, fontSize: 13}}>
                    Загрузка…
                </div>
            ) : (
                <>
                    <section style={{
                        display: "grid", gap: 1, overflow: "hidden", borderRadius: 12,
                        border: `1px solid ${colors.border}`, background: colors.border,
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    }}>
                        {tiles.map((tile) => (
                            <div key={tile.label} style={{display: "flex", flexDirection: "column", gap: 4, background: colors.surface, padding: "14px 16px"}}>
                                <span style={{fontSize: 27, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: tile.color}}>
                                    {tile.value}
                                </span>
                                <span style={{fontSize: 12.5, color: colors.inkSubtle}}>{tile.label}</span>
                            </div>
                        ))}
                    </section>

                    <section style={cardStyle}>
                        <h2 style={sectionTitleStyle}>По статусам</h2>
                        <div style={{overflowX: "auto"}}>
                            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                                <thead>
                                    <tr style={{background: colors.surfaceAlt, color: colors.inkMuted, textAlign: "left"}}>
                                        <th style={th}>Статус</th>
                                        <th style={{...th, textAlign: "right", width: 90}}>Заявок</th>
                                        <th style={{...th, textAlign: "right", width: 90}}>Доля</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byStatus.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} style={{...td, textAlign: "center", color: colors.inkSubtle, padding: "20px 14px"}}>
                                                Заявок пока нет
                                            </td>
                                        </tr>
                                    ) : byStatus.map(([status, count]) => (
                                        <tr key={status} style={{borderTop: `1px solid ${colors.borderSoft}`}}>
                                            <td style={td}>{PROCUREMENT_STATUS_LABEL[status] ?? status}</td>
                                            <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{count}</td>
                                            <td style={{...td, textAlign: "right", color: colors.inkSubtle, fontVariantNumeric: "tabular-nums"}}>
                                                {counters && counters.all > 0 ? `${Math.round((count / counters.all) * 100)}%` : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <BreakdownTable title="По способу закупки" nameHeader="Способ" rows={byMethod} totalCount={items.length}/>
                    <BreakdownTable title="По подразделениям-инициаторам" nameHeader="Подразделение" rows={byUnit} totalCount={items.length}/>

                    <section style={cardStyle}>
                        <h2 style={sectionTitleStyle}>По месяцам</h2>
                        <div style={{overflowX: "auto"}}>
                            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                                <thead>
                                    <tr style={{background: colors.surfaceAlt, color: colors.inkMuted, textAlign: "left"}}>
                                        <th style={th}>Месяц</th>
                                        <th style={{...th, textAlign: "right", width: 90}}>Заявок</th>
                                        <th style={{...th, textAlign: "right", width: 150}}>Сумма</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byMonth.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} style={{...td, textAlign: "center", color: colors.inkSubtle, padding: "20px 14px"}}>
                                                Данных нет
                                            </td>
                                        </tr>
                                    ) : byMonth.map(([key, bucket]) => {
                                        return (
                                            <tr key={key} style={{borderTop: `1px solid ${colors.borderSoft}`}}>
                                                <td style={td}>
                                                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                                                        <span style={{width: 62, flexShrink: 0}}>{formatMonth(key)}</span>
                                                        <span style={{
                                                            display: "block", height: 8, borderRadius: 4,
                                                            background: colors.accent,
                                                            width: `${Math.max((bucket.count / maxMonthCount) * 100, 4)}%`,
                                                            maxWidth: 160,
                                                        }}/>
                                                    </div>
                                                </td>
                                                <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{bucket.count}</td>
                                                <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{money(bucket.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section style={cardStyle}>
                        <h2 style={sectionTitleStyle}>
                            Исполнение Плана закупок{planYear ? ` — ${planYear}` : ""}
                        </h2>
                        {!plan ? (
                            <p style={{margin: 0, fontSize: 13, color: colors.inkSubtle}}>
                                {planYear
                                    ? "Не удалось загрузить план на этот год."
                                    : "План закупок ни на один год ещё не заведён."}
                            </p>
                        ) : (
                            <>
                                <div style={{
                                    display: "grid", gap: 1, overflow: "hidden", borderRadius: 12,
                                    border: `1px solid ${colors.border}`, background: colors.border,
                                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 16,
                                }}>
                                    {[
                                        {label: "План на год", value: money(plan.plannedTotal)},
                                        {label: "Фактически по заявкам", value: money(plan.actualTotal)},
                                        {
                                            label: "Исполнение плана",
                                            value: plan.plannedTotal > 0
                                                ? `${Math.round((plan.actualTotal / plan.plannedTotal) * 100)}%`
                                                : "—",
                                        },
                                        {label: "Внеплановых заявок", value: `${plan.unplannedRequestCount} · ${money(plan.unplannedAmount)}`},
                                        {label: "Позиций с перерасходом", value: String(overrunItems.length), color: overrunItems.length > 0 ? colors.ryg.red.fg : colors.inkSubtle},
                                    ].map((tile) => (
                                        <div key={tile.label} style={{display: "flex", flexDirection: "column", gap: 4, background: colors.surface, padding: "14px 16px"}}>
                                            <span style={{fontSize: 22, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: tile.color ?? colors.ink}}>
                                                {tile.value}
                                            </span>
                                            <span style={{fontSize: 12.5, color: colors.inkSubtle}}>{tile.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {overrunItems.length > 0 && (
                                    <div style={{overflowX: "auto"}}>
                                        <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                                            <thead>
                                                <tr style={{background: colors.surfaceAlt, color: colors.inkMuted, textAlign: "left"}}>
                                                    <th style={th}>Позиция плана</th>
                                                    <th style={{...th, textAlign: "right", width: 130}}>План</th>
                                                    <th style={{...th, textAlign: "right", width: 130}}>Факт</th>
                                                    <th style={{...th, textAlign: "right", width: 100}}>Отклонение</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overrunItems.slice(0, 8).map((item) => (
                                                    <tr key={item.id} style={{borderTop: `1px solid ${colors.borderSoft}`}}>
                                                        <td style={td}>
                                                            <span style={{fontWeight: 600}}>{item.code}</span> {item.subject}
                                                        </td>
                                                        <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{money(item.plannedAmount)}</td>
                                                        <td style={{...td, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{money(item.actualAmount)}</td>
                                                        <td style={{...td, textAlign: "right", fontWeight: 600, color: colors.ryg.red.fg, fontVariantNumeric: "tabular-nums"}}>
                                                            +{Math.round(item.deviationPercent ?? 0)}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    <p style={{margin: 0, maxWidth: "68ch", fontSize: 12.5, color: colors.inkSubtle}}>
                        «Конкурсные способы» — открытый и закрытый конкурс; остальные способы (прямая закупка,
                        упрощённый способ) в долю не входят. Разрезы по способу, подразделению и месяцам считаются
                        по всем загруженным заявкам ({items.length}
                        {counters && items.length < counters.all ? ` из ${counters.all}` : ""}).
                    </p>
                </>
            )}
        </div>
    );
}

const containerStyle: CSSProperties = {display: "flex", flexDirection: "column", gap: 16, maxWidth: 1080};

const cardStyle: CSSProperties = {
    borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.surface, padding: 20,
};

const sectionTitleStyle: CSSProperties = {margin: 0, marginBottom: 12, fontSize: 15, fontWeight: 600, color: colors.ink};

const th: CSSProperties = {padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap"};
const td: CSSProperties = {padding: "10px 14px", verticalAlign: "top", color: colors.ink};
