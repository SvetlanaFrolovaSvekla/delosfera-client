import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    bodyOptions,
    meetingsService,
    type MeetingBody,
    type MeetingForm,
    type MeetingListItem,
} from "@/service/meetingsService/meetingsService.ts";
import {formatDate, formatTime} from "@/service/meetingsService/formatMeetingDate.ts";

/**
 * Журнал заседаний Правления, КПА и комитетов.
 *
 * Сортировка по дате вниз и колонка просроченных поручений: журнал открывают,
 * чтобы понять, что горит по протоколам, а не чтобы полистать историю.
 */

const currentYear = new Date().getFullYear();

export const MeetingRegistryPage = () => {
    const navigate = useNavigate();

    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [body, setBody] = useState<MeetingBody | "">("");
    const [year, setYear] = useState(currentYear);
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<{
        body: MeetingBody;
        form: MeetingForm;
        date: string;
        time: string;
        number: string;
        materialsUrl: string;
    }>({body: "Kpa", form: "InPerson", date: "", time: "10:00", number: "", materialsUrl: ""});

    const load = useCallback(async () => {
        try {
            setError(null);
            setMeetings(await meetingsService.list({
                body: body || undefined,
                year,
                overdueOnly: overdueOnly || undefined,
            }));
        } catch {
            setError("Не удалось загрузить журнал заседаний");
        }
    }, [body, year, overdueOnly]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async () => {
        try {
            setBusy(true);
            setError(null);

            const meeting = await meetingsService.create({
                body: form.body,
                form: form.form,
                date: form.date,
                time: form.time,
                number: form.number ? Number(form.number) : undefined,
                materialsUrl: form.materialsUrl.trim() || undefined,
            });

            navigate(`/meetings/${meeting.id}`);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? "Заседание не заведено");
        } finally {
            setBusy(false);
        }
    };

    const exportRegistry = async () => {
        try {
            setBusy(true);
            setError(null);

            const from = `${year}-01-01`;
            const to = `${year}-12-31`;
            const blob = await meetingsService.downloadRegistry(from, to, body || undefined);

            // Реестр отдаётся файлом, а не таблицей на экране: по ТЗ его выгружают
            // за период и отправляют дальше как документ.
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Реестр решений ${year}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setError("Выгрузка реестра доступна секретарям Правления и КПА");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap"}}>
                <div style={{flex: 1, minWidth: 240}}>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Заседания</h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        Протоколы Правления, КПА и комитетов · исполнение решений
                    </div>
                </div>

                <select value={body} onChange={e => setBody(e.target.value as MeetingBody | "")}
                        style={{...input, width: 180}}>
                    <option value="">Все органы</option>
                    {bodyOptions.map(o => <option key={o.value} value={o.value}>{o.title}</option>)}
                </select>

                <select value={year} onChange={e => setYear(Number(e.target.value))} style={{...input, width: 110}}>
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <button onClick={() => setOverdueOnly(v => !v)}
                        style={overdueOnly ? {...secondaryButton, ...activeFilter} : secondaryButton}>
                    Только с просрочкой
                </button>

                <button onClick={exportRegistry} disabled={busy} style={secondaryButton}>Реестр в Excel</button>
                <button onClick={() => setCreating(v => !v)} style={primaryButton}>Создать</button>
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {creating && (
                <section style={card}>
                    <div style={cardTitle}>Новое заседание</div>
                    <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                        <select value={form.body} onChange={e => setForm({...form, body: e.target.value as MeetingBody})}
                                style={{...input, width: 190}}>
                            {bodyOptions.map(o => <option key={o.value} value={o.value}>{o.title}</option>)}
                        </select>

                        <select value={form.form} onChange={e => setForm({...form, form: e.target.value as MeetingForm})}
                                style={{...input, width: 130}}>
                            <option value="InPerson">Очно</option>
                            <option value="Absentee">Заочно</option>
                        </select>

                        <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                               style={{...input, width: 165}} title="Дата заседания"/>
                        <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})}
                               style={{...input, width: 120}} title="Время заседания"/>
                        <input value={form.number} onChange={e => setForm({...form, number: e.target.value})}
                               placeholder="№ (авто)" style={{...input, width: 110}}
                               title="Номер заседания. Пусто — следующий свободный в году"/>
                        <input value={form.materialsUrl} onChange={e => setForm({...form, materialsUrl: e.target.value})}
                               placeholder="Ссылка на материалы" style={{...input, flex: 1, minWidth: 200}}/>

                        <button onClick={create} disabled={busy || !form.date} style={primaryButton}>Завести</button>
                    </div>
                </section>
            )}

            <section style={{...card, padding: 0, overflow: "hidden"}}>
                <div style={{overflowX: "auto"}}>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                        <thead>
                            <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                <th style={th}>Орган</th>
                                <th style={th}>№</th>
                                <th style={th}>Дата и время</th>
                                <th style={th}>Форма</th>
                                <th style={th}>Секретарь</th>
                                <th style={{...th, textAlign: "right"}}>Вопросов</th>
                                <th style={{...th, textAlign: "right"}}>Поручений</th>
                                <th style={{...th, textAlign: "right"}}>Просрочено</th>
                                <th style={th}>Уведомление</th>
                            </tr>
                        </thead>
                        <tbody>
                            {meetings.map(m => (
                                <tr key={m.id}
                                    onClick={() => navigate(`/meetings/${m.id}`)}
                                    style={{
                                        borderTop: "1px solid #eef2f7",
                                        cursor: "pointer",
                                        background: m.overdueCount > 0 ? "#fdf6f5" : undefined,
                                    }}>
                                    <td style={{...td, fontWeight: 600}}>{m.bodyTitle}</td>
                                    <td style={td}>{String(m.number).padStart(2, "0")}</td>
                                    <td style={td}>
                                        {formatDate(m.date)}
                                        <div style={{fontSize: 11, color: "#8b97ab"}}>{formatTime(m.time)}</div>
                                    </td>
                                    <td style={td}>{m.formTitle}</td>
                                    <td style={td}>{m.secretaryName ?? "—"}</td>
                                    <td style={{...td, textAlign: "right"}}>{m.itemCount}</td>
                                    <td style={{...td, textAlign: "right"}}>{m.assignmentCount}</td>
                                    <td style={{
                                        ...td, textAlign: "right", fontWeight: m.overdueCount > 0 ? 700 : 400,
                                        color: m.overdueCount > 0 ? "#c0392b" : "#8b97ab",
                                    }}>
                                        {m.overdueCount || "—"}
                                    </td>
                                    <td style={{...td, color: m.notifiedAt ? "#1f8a4c" : "#8b97ab"}}>
                                        {m.notifiedAt ? "отправлено" : "не отправлено"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {meetings.length === 0 && (
                    <div style={{padding: 26, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        Заседаний за выбранный период нет
                    </div>
                )}
            </section>
        </div>
    );
};

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab",
    textTransform: "uppercase", marginBottom: 10,
};

const input: React.CSSProperties = {
    height: 36, padding: "0 11px", border: "1px solid #e5e9f0", borderRadius: 9,
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

const activeFilter: React.CSSProperties = {
    borderColor: "#f3c9c2", background: "#fdf6f5", color: "#c0392b",
};

const th: React.CSSProperties = {padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 12px", verticalAlign: "top", color: "#26324a"};
