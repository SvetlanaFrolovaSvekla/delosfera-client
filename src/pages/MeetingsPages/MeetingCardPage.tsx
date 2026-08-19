import {useCallback, useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
    agendaService,
    meetingsService,
    type Meeting,
    type MeetingNotifyResult,
} from "@/service/meetingsService/meetingsService.ts";
import {formatDate, formatTime} from "@/service/meetingsService/formatMeetingDate.ts";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {AgendaItemCard} from "@/components/meetings/AgendaItemCard.tsx";

/**
 * Карточка заседания: реквизиты и повестка дня.
 *
 * Повестка показывается только в доступной пользователю части — сервер отдаёт
 * лишь те вопросы, где сотрудник назван докладчиком, приглашённым или ответственным.
 */
export const MeetingCardPage = () => {
    const {id} = useParams();
    const navigate = useNavigate();
    const meetingId = Number(id);

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notified, setNotified] = useState<MeetingNotifyResult | null>(null);
    const [topic, setTopic] = useState("");

    const load = useCallback(async () => {
        try {
            setError(null);
            setMeeting(await meetingsService.get(meetingId));
        } catch {
            setError("Заседание не найдено или недоступно");
        }
    }, [meetingId]);

    useEffect(() => {
        void load();
        userService.getAll().then(setUsers).catch(() => undefined);
    }, [load]);

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

    const notify = () => run(async () => {
        setNotified(await meetingsService.notify(meetingId));
    });

    const addItem = () => run(async () => {
        await agendaService.addItem(meetingId, {topic: topic.trim()});
        setTopic("");
    });

    if (!meeting) {
        return (
            <div style={{padding: "22px 26px", color: error ? "#e0483d" : "#8b97ab", fontSize: 13}}>
                {error ?? "Загрузка…"}
            </div>
        );
    }

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap"}}>
                <div style={{flex: 1, minWidth: 260}}>
                    <button onClick={() => navigate("/meetings")} style={linkButton}>← Журнал заседаний</button>
                    <h1 style={{margin: "6px 0 0", fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                        {meeting.bodyTitle} · заседание № {String(meeting.number).padStart(2, "0")}
                    </h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {formatDate(meeting.date)} в {formatTime(meeting.time)} · {meeting.formTitle} ·
                        секретарь {meeting.secretaryName ?? "—"}
                        {meeting.secretaryUnitTitle && ` (${meeting.secretaryUnitTitle})`}
                    </div>
                </div>

                {meeting.canEdit && (
                    <button onClick={notify} disabled={busy} style={primaryButton}>
                        Отправить уведомление
                    </button>
                )}
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {notified && (
                <section style={{...card, borderColor: "#c9e2d1", background: "#f6fbf7"}}>
                    <div style={cardTitle}>Уведомление отправлено · {notified.recipientCount} получателей</div>
                    <div style={{fontSize: 13, fontWeight: 600, color: "#26324a"}}>{notified.subject}</div>
                    <div style={{marginTop: 6, fontSize: 12.5, color: "#55617a", lineHeight: 1.6}}>
                        {notified.body}
                    </div>
                    <div style={{marginTop: 8, fontSize: 11.5, color: "#8b97ab"}}>
                        {notified.recipients.join(" · ")}
                    </div>
                </section>
            )}

            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12}}>
                <Tile label="Вопросов в повестке" value={String(meeting.items.length)}/>
                <Tile label="Поручений" value={String(meeting.assignmentCount)}/>
                <Tile label="Просрочено" value={meeting.overdueCount ? String(meeting.overdueCount) : "нет"}
                      danger={meeting.overdueCount > 0}/>
                <Tile label="Материалы"
                      value={meeting.materialsUrl ? "по ссылке" : "не заданы"}
                      note={meeting.materialsUrl ?? undefined}/>
            </div>

            {meeting.items.map(item => (
                <AgendaItemCard
                    key={item.id}
                    item={item}
                    users={users}
                    canEdit={meeting.canEdit}
                    canReport={meeting.canReport}
                    onChanged={load}
                />
            ))}

            {meeting.items.length === 0 && (
                <section style={card}>
                    <div style={{fontSize: 13, color: "#55617a"}}>
                        Повестка пуста. Доступны только те вопросы, где вы указаны докладчиком,
                        приглашённым или ответственным.
                    </div>
                </section>
            )}

            {meeting.canEdit && (
                <section style={card}>
                    <div style={cardTitle}>Добавить вопрос повестки</div>
                    <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                        <input value={topic} onChange={e => setTopic(e.target.value)}
                               placeholder="Тема вопроса" style={{...input, flex: 1, minWidth: 260}}/>
                        <button onClick={addItem} disabled={busy || !topic.trim()} style={secondaryButton}>
                            Добавить
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
};

const Tile = ({label, value, note, danger}: {label: string; value: string; note?: string; danger?: boolean}) => (
    <div style={{
        padding: "12px 14px", borderRadius: 12,
        background: danger ? "#fdf6f5" : "#fff",
        border: `1px solid ${danger ? "#f3c9c2" : "#e5e9f0"}`,
    }}>
        <div style={{fontSize: 11.5, color: "#8b97ab"}}>{label}</div>
        <div style={{marginTop: 4, fontSize: 17, fontWeight: 700, color: danger ? "#c0392b" : "#0f1b2d"}}>{value}</div>
        {note && (
            <div style={{marginTop: 2, fontSize: 11, color: "#8b97ab", overflow: "hidden", textOverflow: "ellipsis"}}>
                {note}
            </div>
        )}
    </div>
);

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

const linkButton: React.CSSProperties = {
    border: "none", background: "none", padding: 0, color: "#8b97ab",
    font: "inherit", fontSize: 12, cursor: "pointer",
};
