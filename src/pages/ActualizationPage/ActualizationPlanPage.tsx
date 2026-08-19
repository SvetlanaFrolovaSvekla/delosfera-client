import {useCallback, useEffect, useRef, useState} from "react";
import {
    actualizationPlanService,
    type ActualizationSettings,
    type Plan,
    type PlanImportResult,
    type PlanItem,
    type PlanItemEvent,
} from "@/service/actualizationPlanService/actualizationPlanService.ts";
import {getAccessToken} from "@/service/tokenStore.ts";

/**
 * Годовой план актуализации ВНД (PLN-01..07).
 *
 * Верх страницы — светофор Отдела методологии: сколько позиций в спокойной зоне,
 * сколько подходит к сроку и сколько горит. Ниже — сам план строками.
 */

const currentYear = new Date().getFullYear();

function formatDate(value: string | null): string {
    if (!value) return "—";
    const [y, m, d] = value.split("T")[0].split("-");
    return y && m && d ? `${d}.${m}.${y}` : value;
}

/** Скачивание файла с токеном: обычная ссылка ушла бы без заголовка авторизации. */
async function download(url: string, fallbackName: string) {
    const response = await fetch(url, {headers: {Authorization: `Bearer ${getAccessToken()}`}});
    if (!response.ok) throw new Error(String(response.status));

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fallbackName;
    link.click();
    URL.revokeObjectURL(objectUrl);
}

export const ActualizationPlanPage = () => {
    const [year, setYear] = useState(currentYear);
    const [years, setYears] = useState<number[]>([]);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [settings, setSettings] = useState<ActualizationSettings | null>(null);
    const [history, setHistory] = useState<{item: PlanItem; events: PlanItemEvent[]} | null>(null);
    const [imported, setImported] = useState<PlanImportResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "red" | "unmatched">("all");

    const fileInput = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            setPlan(await actualizationPlanService.get(year));
        } catch {
            setError("Не удалось загрузить план актуализации");
        }
    }, [year]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        actualizationPlanService.years().then(setYears).catch(() => undefined);
        actualizationPlanService.settings().then(setSettings).catch(() => undefined);
    }, []);

    const run = async (action: () => Promise<unknown>) => {
        try {
            setBusy(true);
            setError(null);
            await action();
            await load();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";

        return run(async () => {
            setImported(await actualizationPlanService.import(year, file));
        });
    };

    const startActualization = (item: PlanItem) => run(async () => {
        await actualizationPlanService.startActualization(item.id, true);
    });

    const reschedule = (item: PlanItem) => {
        const date = window.prompt("Новый срок актуализации (ГГГГ-ММ-ДД):", item.dueDate.slice(0, 10));
        if (!date) return;

        const reason = window.prompt("Причина переноса срока:");
        if (!reason?.trim()) return;

        return run(() => actualizationPlanService.reschedule(item.id, date, reason.trim()));
    };

    const exclude = (item: PlanItem) => {
        const reason = window.prompt("Причина снятия позиции с плана:");
        if (!reason?.trim()) return;

        return run(() => actualizationPlanService.exclude(item.id, reason.trim()));
    };

    const openHistory = async (item: PlanItem) => {
        try {
            setHistory({item, events: await actualizationPlanService.history(item.id)});
        } catch {
            setError("Не удалось загрузить журнал позиции");
        }
    };

    const saveSettings = async (next: ActualizationSettings) => {
        try {
            setBusy(true);
            setSettings(await actualizationPlanService.saveSettings(next));
            await load();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? "Пороги не сохранены");
        } finally {
            setBusy(false);
        }
    };

    const visible = (plan?.items ?? []).filter(i =>
        filter === "all" ? true : filter === "red" ? i.urgency === "Red" : i.isUnmatched);

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap"}}>
                <div style={{flex: 1, minWidth: 240}}>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                        План актуализации ВНД
                    </h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        Годовой план Отдела методологии · сроки, ответственные, исполнение
                    </div>
                </div>

                <select value={year} onChange={e => setYear(Number(e.target.value))} style={{...input, width: 110}}>
                    {[...new Set([currentYear + 1, currentYear, currentYear - 1, ...years])]
                        .sort((a, b) => b - a)
                        .map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <button onClick={() => download(actualizationPlanService.templateUrl(), "Шаблон плана актуализации.xlsx")}
                        style={secondaryButton}>
                    Шаблон
                </button>

                <button onClick={() => fileInput.current?.click()} disabled={busy} style={secondaryButton}>
                    Импорт из Excel
                </button>
                <input ref={fileInput} type="file" accept=".xlsx" onChange={importFile} style={{display: "none"}}/>

                {plan && (
                    <button
                        onClick={() => download(actualizationPlanService.reportUrl(year), `Исполнительская дисциплина ${year}.xlsx`)}
                        style={secondaryButton}
                    >
                        Отчёт по дисциплине
                    </button>
                )}

                {plan?.status === "Draft" && (
                    <button
                        onClick={() => {
                            const note = window.prompt("Чем утверждён план (протокол, распоряжение):");
                            if (!note?.trim()) return;
                            return run(() => actualizationPlanService.approve(plan.id, note.trim()));
                        }}
                        disabled={busy}
                        style={primaryButton}
                    >
                        Утвердить план
                    </button>
                )}
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {imported && (
                <section style={{...card, borderColor: "#c9e2d1", background: "#f6fbf7"}}>
                    <div style={cardTitle}>Импорт выполнен</div>
                    <div style={{fontSize: 12.5, color: "#26324a"}}>
                        Прочитано строк: {imported.rowsRead} · заведено: {imported.created} ·
                        обновлено: {imported.updated} · сопоставлено с базой ВНД: {imported.matched}
                    </div>
                    {imported.skipped.length > 0 && (
                        <div style={{marginTop: 8, fontSize: 12, color: "#c0392b"}}>
                            Пропущено:
                            {imported.skipped.map((s, i) => <div key={i}>· {s}</div>)}
                        </div>
                    )}
                    {imported.unmatched.length > 0 && (
                        <div style={{marginTop: 8, fontSize: 12, color: "#8b6d3f"}}>
                            Без пары в базе ВНД — привяжите документ вручную:
                            {imported.unmatched.map((s, i) => <div key={i}>· {s}</div>)}
                        </div>
                    )}
                    <button onClick={() => setImported(null)} style={{...smallButton, marginTop: 10}}>Скрыть</button>
                </section>
            )}

            {!plan ? (
                <section style={card}>
                    <div style={{fontSize: 13, color: "#55617a", lineHeight: 1.7}}>
                        План актуализации на {year} год не заведён. Его можно создать пустым и наполнить
                        вручную либо сразу загрузить заполненный шаблон Excel.
                    </div>
                    <button onClick={() => run(() => actualizationPlanService.create(year))}
                            disabled={busy} style={{...primaryButton, marginTop: 12}}>
                        Завести план на {year} год
                    </button>
                </section>
            ) : (
                <>
                    <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12}}>
                        <Tile label="Всего позиций" value={String(plan.total)} note={plan.statusTitle}/>
                        <Tile label="Срок не близко" value={String(plan.green)} color="#1f8a4c"
                              onClick={() => setFilter("all")}/>
                        <Tile label="Подходит срок" value={String(plan.yellow)} color="#b8860b"
                              onClick={() => setFilter("all")}/>
                        <Tile label="Горит или просрочено" value={String(plan.red)} color="#c0392b"
                              onClick={() => setFilter("red")}/>
                        {/* Без этой плитки светофор не сходится с общим числом позиций:
                            закрытые в индикацию не попадают. */}
                        <Tile label="Актуализировано" value={String(plan.done)} color="#55617a"/>
                        <Tile label="Без пары в базе ВНД" value={String(plan.unmatched)} color="#8b6d3f"
                              onClick={() => setFilter("unmatched")}/>
                    </div>

                    {settings && (
                        <section style={card}>
                            <div style={cardTitle}>Пороги индикации и напоминаний</div>
                            <div style={{display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center"}}>
                                <Threshold label="Зелёный, если дней больше" value={settings.greenThresholdDays}
                                           onChange={v => setSettings({...settings, greenThresholdDays: v})}/>
                                <Threshold label="Красный, если дней меньше" value={settings.redThresholdDays}
                                           onChange={v => setSettings({...settings, redThresholdDays: v})}/>
                                <Threshold label="Критическое напоминание за, дней" value={settings.criticalReminderDays}
                                           onChange={v => setSettings({...settings, criticalReminderDays: v})}/>
                                <label style={{display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#55617a"}}>
                                    <input type="checkbox" checked={settings.monthlyDigestEnabled}
                                           onChange={e => setSettings({...settings, monthlyDigestEnabled: e.target.checked})}/>
                                    Сводка 1-го числа
                                </label>
                                <button onClick={() => saveSettings(settings)} disabled={busy} style={secondaryButton}>
                                    Сохранить пороги
                                </button>
                            </div>
                        </section>
                    )}

                    {filter !== "all" && (
                        <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                            Показаны{filter === "red" ? " горящие позиции" : " позиции без пары в базе ВНД"} ·{" "}
                            <button onClick={() => setFilter("all")} style={linkButton}>показать все</button>
                        </div>
                    )}

                    <section style={{...card, padding: 0, overflow: "hidden"}}>
                        <div style={{overflowX: "auto"}}>
                            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                                <thead>
                                    <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                        <th style={th}>№</th>
                                        <th style={th}>ВНД</th>
                                        <th style={th}>Ответственное СП</th>
                                        <th style={th}>Куратор</th>
                                        <th style={th}>Срок</th>
                                        <th style={th}>Статус</th>
                                        <th style={th}/>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map(item => (
                                        <tr key={item.id} style={{
                                            borderTop: "1px solid #eef2f7",
                                            background: item.urgency === "Red" ? "#fdf6f5"
                                                : item.urgency === "Yellow" ? "#fffaf0" : undefined,
                                        }}>
                                            <td style={td}>{item.order}</td>
                                            <td style={td}>
                                                <div style={{fontWeight: 600, color: "#26324a"}}>{item.title}</div>
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>
                                                    {item.vndCode
                                                        ? `код ${item.vndCode}`
                                                        : "нет пары в базе ВНД — актуализацию не запустить"}
                                                </div>
                                            </td>
                                            <td style={td}>{item.responsibleUnitTitle ?? "—"}</td>
                                            <td style={td}>{item.curatorName ?? "—"}</td>
                                            <td style={td}>
                                                {formatDate(item.dueDate)}
                                                <div style={{
                                                    fontSize: 11,
                                                    color: item.urgency === "Red" ? "#c0392b"
                                                        : item.urgency === "Yellow" ? "#b8860b" : "#8b97ab",
                                                }}>
                                                    {item.status === "Actual"
                                                        ? `следующая ${formatDate(item.nextDueDate)}`
                                                        : item.daysLeft < 0
                                                            ? `просрочено на ${-item.daysLeft} дн.`
                                                            : `осталось ${item.daysLeft} дн.`}
                                                </div>
                                            </td>
                                            <td style={td}>{item.statusTitle}</td>
                                            <td style={{...td, whiteSpace: "nowrap"}}>
                                                {item.status === "Planned" && !item.isUnmatched && (
                                                    <button onClick={() => startActualization(item)}
                                                            disabled={busy} style={smallButton}>
                                                        Создать ТИД
                                                    </button>
                                                )}
                                                {item.status !== "Actual" && item.status !== "Excluded" && (
                                                    <>
                                                        <button onClick={() => reschedule(item)}
                                                                disabled={busy} style={{...smallButton, marginLeft: 4}}>
                                                            Перенести
                                                        </button>
                                                        <button onClick={() => exclude(item)}
                                                                disabled={busy} style={{...smallButton, marginLeft: 4}}>
                                                            Снять
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => openHistory(item)}
                                                        style={{...smallButton, marginLeft: 4}}>
                                                    Журнал
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {visible.length === 0 && (
                            <div style={{padding: 24, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                                Позиций нет
                            </div>
                        )}
                    </section>
                </>
            )}

            {history && (
                <section style={card}>
                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        <div style={cardTitle}>Журнал позиции · {history.item.title}</div>
                        <div style={{flex: 1}}/>
                        <button onClick={() => setHistory(null)} style={smallButton}>Закрыть</button>
                    </div>

                    {history.events.map(e => (
                        <div key={e.id} style={{padding: "8px 0", borderTop: "1px solid #eef2f7", fontSize: 12.5}}>
                            <span style={{color: "#8b97ab"}}>
                                {new Date(e.at).toLocaleString("ru-RU", {dateStyle: "short", timeStyle: "short"})}
                            </span>
                            {" · "}
                            <span style={{color: "#26324a"}}>{e.description}</span>
                            {e.userName && <span style={{color: "#8b97ab"}}> · {e.userName}</span>}
                        </div>
                    ))}

                    {history.events.length === 0 && (
                        <div style={{fontSize: 12.5, color: "#8b97ab"}}>Записей нет</div>
                    )}
                </section>
            )}
        </div>
    );
};

const Tile = ({label, value, note, color, onClick}: {
    label: string; value: string; note?: string; color?: string; onClick?: () => void;
}) => (
    <div onClick={onClick} style={{
        padding: "12px 14px", borderRadius: 12, background: "#fff",
        border: "1px solid #e5e9f0", cursor: onClick ? "pointer" : "default",
    }}>
        <div style={{fontSize: 11.5, color: "#8b97ab"}}>{label}</div>
        <div style={{marginTop: 4, fontSize: 19, fontWeight: 700, color: color ?? "#0f1b2d"}}>{value}</div>
        {note && <div style={{marginTop: 2, fontSize: 11.5, color: "#8b97ab"}}>{note}</div>}
    </div>
);

const Threshold = ({label, value, onChange}: {label: string; value: number; onChange: (v: number) => void}) => (
    <label style={{display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#55617a"}}>
        {label}
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)}
               style={{...input, width: 80}}/>
    </label>
);

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab",
    textTransform: "uppercase", marginBottom: 10,
};

const input: React.CSSProperties = {
    height: 34, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const primaryButton: React.CSSProperties = {
    height: 36, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 36, padding: "0 14px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const smallButton: React.CSSProperties = {
    height: 28, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
};

const linkButton: React.CSSProperties = {
    border: "none", background: "none", padding: 0, color: "#2f68f5",
    font: "inherit", fontSize: 12.5, cursor: "pointer",
};

const th: React.CSSProperties = {padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 12px", verticalAlign: "top", color: "#26324a"};
