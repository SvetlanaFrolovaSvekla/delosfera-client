import {useState} from "react";
import {
    agendaService,
    statusOptions,
    type AgendaAssignment,
    type AgendaItem,
    type ExecutionStatus,
    type MeetingFileKind,
} from "@/service/meetingsService/meetingsService.ts";
import {formatDate} from "@/service/meetingsService/formatMeetingDate.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";

/**
 * Вопрос повестки дня: тема, протокол, решение, приглашённые и поручения.
 *
 * Приглашённые стоят первыми — по ТЗ они открывают карточку вопроса: состав
 * присутствующих определяет, законно ли рассмотрение.
 *
 * Секретарь правит вопрос целиком, исполнитель — только статус и отчёт своего
 * поручения, поэтому редактируемые поля разведены по разным блокам.
 */

interface Props {
    item: AgendaItem;
    users: UserResponse[];
    canEdit: boolean;
    canReport: boolean;
    onChanged: () => void | Promise<void>;
}

export const AgendaItemCard = ({item, users, canEdit, canReport, onChanged}: Props) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(true);

    const [guestId, setGuestId] = useState("");
    const [assignee, setAssignee] = useState({userId: "", text: "", dueDate: ""});
    const [edit, setEdit] = useState({
        protocolNumber: item.protocolNumber ?? "",
        decision: item.decision ?? "",
        speakerUserId: item.speakerUserId ? String(item.speakerUserId) : "",
        speakerHeadUserId: item.speakerHeadUserId ? String(item.speakerHeadUserId) : "",
        deputySecretaryUserId: item.deputySecretaryUserId ? String(item.deputySecretaryUserId) : "",
        controllerUserId: item.controllerUserId ? String(item.controllerUserId) : "",
        documentsUrl: item.documentsUrl ?? "",
    });

    const run = async (action: () => Promise<unknown>) => {
        try {
            setBusy(true);
            setError(null);
            await action();
            await onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    const save = () => run(() => agendaService.updateItem(item.id, {
        topic: item.topic,
        protocolNumber: edit.protocolNumber.trim(),
        decision: edit.decision.trim(),
        speakerUserId: edit.speakerUserId ? Number(edit.speakerUserId) : null,
        speakerHeadUserId: edit.speakerHeadUserId ? Number(edit.speakerHeadUserId) : null,
        deputySecretaryUserId: edit.deputySecretaryUserId ? Number(edit.deputySecretaryUserId) : null,
        controllerUserId: edit.controllerUserId ? Number(edit.controllerUserId) : null,
        documentsUrl: edit.documentsUrl.trim(),
    }));

    const report = (assignmentId: number, status: ExecutionStatus) => {
        const text = window.prompt("Отчёт об исполнении:");
        if (text === null) return;
        return run(() => agendaService.report(assignmentId, status, text.trim() || undefined));
    };

    const attach = (kind: MeetingFileKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        return run(() => agendaService.attach(item.id, kind, file));
    };

    return (
        <section style={card}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 10}}>
                <div style={{flex: 1}}>
                    <div style={{fontSize: 11.5, color: "#8b97ab"}}>
                        Вопрос {item.order} · протокол {item.protocolNumber || "не задан"}
                        {item.protocolDate && ` от ${formatDate(item.protocolDate)}`}
                    </div>
                    <div style={{marginTop: 3, fontSize: 14.5, fontWeight: 600, color: "#0f1b2d"}}>
                        {item.topic}
                    </div>
                </div>
                <button onClick={() => setOpen(v => !v)} style={smallButton}>
                    {open ? "свернуть" : "развернуть"}
                </button>
                {canEdit && (
                    <button onClick={() => run(() => agendaService.removeItem(item.id))}
                            disabled={busy} style={smallButton}>
                        удалить
                    </button>
                )}
            </div>

            {error && <div style={{marginTop: 8, color: "#e0483d", fontSize: 12.5}}>{error}</div>}

            {open && (
                <>
                    {/* Приглашённые — первыми: по ним видно, кто участвовал в рассмотрении. */}
                    <div style={block}>
                        <div style={blockTitle}>Приглашённые лица</div>
                        <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                            {item.guests.map(g => (
                                <span key={g.id} style={chip}>
                                    {g.userName}
                                    {g.orgUnitTitle && <span style={{color: "#8b97ab"}}> · {g.orgUnitTitle}</span>}
                                    {canEdit && (
                                        <button onClick={() => run(() => agendaService.removeGuest(g.id))}
                                                disabled={busy} style={chipClose}>×</button>
                                    )}
                                </span>
                            ))}
                            {item.guests.length === 0 && <span style={{fontSize: 12.5, color: "#8b97ab"}}>—</span>}
                        </div>

                        {canEdit && (
                            <div style={{display: "flex", gap: 6, marginTop: 8}}>
                                <select value={guestId} onChange={e => setGuestId(e.target.value)}
                                        style={{...input, width: 260}}>
                                    <option value="">— пригласить сотрудника —</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                </select>
                                <button
                                    onClick={() => run(async () => {
                                        await agendaService.addGuest(item.id, Number(guestId));
                                        setGuestId("");
                                    })}
                                    disabled={busy || !guestId} style={smallButton}>
                                    Пригласить
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={block}>
                        <div style={blockTitle}>Основное</div>

                        {canEdit ? (
                            <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                                <input value={edit.protocolNumber}
                                       onChange={e => setEdit({...edit, protocolNumber: e.target.value})}
                                       placeholder="№ протокола [гггг-хх-х]" style={{...input, width: 190}}/>
                                <UserSelect label="Докладчик" users={users} value={edit.speakerUserId}
                                            onChange={v => setEdit({...edit, speakerUserId: v})}/>
                                <UserSelect label="Руководитель докладчика" users={users} value={edit.speakerHeadUserId}
                                            onChange={v => setEdit({...edit, speakerHeadUserId: v})}/>
                                <UserSelect label="Дублёр секретаря" users={users} value={edit.deputySecretaryUserId}
                                            onChange={v => setEdit({...edit, deputySecretaryUserId: v})}/>
                                <UserSelect label="Контроль" users={users} value={edit.controllerUserId}
                                            onChange={v => setEdit({...edit, controllerUserId: v})}/>
                                <input value={edit.documentsUrl}
                                       onChange={e => setEdit({...edit, documentsUrl: e.target.value})}
                                       placeholder="Ссылка на документы" style={{...input, flex: 1, minWidth: 200}}/>
                                <textarea value={edit.decision}
                                          onChange={e => setEdit({...edit, decision: e.target.value})}
                                          placeholder="Принятые решения"
                                          style={{...input, height: 74, width: "100%", padding: "8px 11px", resize: "vertical"}}/>
                                <button onClick={save} disabled={busy} style={secondaryButton}>Сохранить</button>
                            </div>
                        ) : (
                            <div style={{fontSize: 12.5, color: "#26324a", lineHeight: 1.7}}>
                                <Field label="Докладчик" value={item.speakerName}/>
                                <Field label="Руководитель докладчика" value={item.speakerHeadName}/>
                                <Field label="Управление докладчика" value={item.speakerUnitTitle}/>
                                <Field label="Контроль" value={item.controllerName}/>
                                <Field label="Принятые решения" value={item.decision}/>
                            </div>
                        )}
                    </div>

                    <div style={block}>
                        <div style={blockTitle}>Ответственные и исполнение</div>

                        {item.assignments.map(a => (
                            <div key={a.id} style={{
                                padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                                background: a.isOverdue ? "#fdf6f5" : "#f6f8fb",
                            }}>
                                <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap"}}>
                                    <span style={{fontWeight: 600, color: "#26324a", fontSize: 12.5}}>{a.userName}</span>
                                    {a.orgUnitTitle && (
                                        <span style={{fontSize: 11.5, color: "#8b97ab"}}>{a.orgUnitTitle}</span>
                                    )}
                                    {a.text && (
                                        <span style={{fontSize: 12.5, color: "#26324a", flexBasis: "100%"}}>
                                            {a.text}
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: 12, fontWeight: 600,
                                        color: a.isOverdue ? "#c0392b" : "#55617a",
                                    }}>
                                        {a.statusTitle}
                                    </span>
                                    <div style={{flex: 1}}/>

                                    {(canReport || canEdit) && (
                                        <select
                                            value=""
                                            onChange={e => e.target.value && report(a.id, e.target.value as ExecutionStatus)}
                                            disabled={busy}
                                            style={{...input, height: 28, width: 210, fontSize: 11.5}}
                                        >
                                            <option value="">изменить статус…</option>
                                            {statusOptions.map(s => (
                                                <option key={s.value} value={s.value}>{s.title}</option>
                                            ))}
                                        </select>
                                    )}

                                    {canEdit && (
                                        <button onClick={() => run(() => agendaService.removeAssignment(a.id))}
                                                disabled={busy} style={smallButton}>снять</button>
                                    )}
                                </div>

                                <div style={{marginTop: 4, fontSize: 11.5, color: a.isOverdue ? "#c0392b" : "#8b97ab"}}>
                                    {dueLine(a)}
                                </div>

                                {a.report && (
                                    <div style={{marginTop: 5, fontSize: 12, color: "#26324a"}}>
                                        {a.report}
                                        {a.reportedAt && (
                                            <span style={{color: "#8b97ab"}}>
                                                {" "}· {new Date(a.reportedAt).toLocaleDateString("ru-RU")}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {item.assignments.length === 0 && (
                            <div style={{fontSize: 12.5, color: "#8b97ab"}}>Поручений нет</div>
                        )}

                        {canEdit && (
                            <div style={{display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap"}}>
                                <select value={assignee.userId}
                                        onChange={e => setAssignee({...assignee, userId: e.target.value})}
                                        style={{...input, width: 260}}>
                                    <option value="">— ответственный —</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                </select>
                                <input
                                    value={assignee.text}
                                    onChange={e => setAssignee({...assignee, text: e.target.value})}
                                    placeholder="Что поручено"
                                    style={{...input, flex: 1, minWidth: 220}}
                                    title="Пусто — поручение по решению целиком"
                                />
                                <input type="date" value={assignee.dueDate}
                                       onChange={e => setAssignee({...assignee, dueDate: e.target.value})}
                                       style={{...input, width: 165}} title="Срок исполнения"/>
                                <button
                                    onClick={() => run(async () => {
                                        await agendaService.addAssignment(item.id, {
                                            userId: Number(assignee.userId),
                                            text: assignee.text.trim() || undefined,
                                            dueDate: assignee.dueDate || undefined,
                                        });
                                        setAssignee({userId: "", text: "", dueDate: ""});
                                    })}
                                    disabled={busy || !assignee.userId} style={smallButton}>
                                    Назначить
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={block}>
                        <div style={blockTitle}>Файлы</div>
                        <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                            {item.files.map(f => (
                                <span key={f.id} style={chip}>
                                    <a href={agendaService.fileUrl(f.id)} style={{color: "#2f68f5", textDecoration: "none"}}>
                                        {f.fileName}
                                    </a>
                                    <span style={{color: "#8b97ab"}}> · {f.kindTitle}</span>
                                    {f.canDelete && (
                                        <button onClick={() => run(() => agendaService.detach(f.id))}
                                                disabled={busy} style={chipClose}>×</button>
                                    )}
                                </span>
                            ))}
                            {item.files.length === 0 && <span style={{fontSize: 12.5, color: "#8b97ab"}}>—</span>}
                        </div>

                        <div style={{display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#55617a"}}>
                            {canEdit && (
                                <>
                                    <label style={fileLabel}>
                                        + служебная записка
                                        <input type="file" onChange={attach("Sz")} style={{display: "none"}}/>
                                    </label>
                                    <label style={fileLabel}>
                                        + протокол
                                        <input type="file" onChange={attach("Protocol")} style={{display: "none"}}/>
                                    </label>
                                </>
                            )}
                            <label style={fileLabel}>
                                + файл об исполнении
                                <input type="file" onChange={attach("Execution")} style={{display: "none"}}/>
                            </label>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
};

/**
 * Строка срока. Обратный отсчёт показывается только у открытого поручения:
 * у закрытого «осталось 5 дн.» читается как незакрытая работа, хотя отчёт уже принят.
 */
function dueLine(a: AgendaAssignment): string {
    if (!a.dueDate) return "срок не задан";

    const due = `срок ${formatDate(a.dueDate)}`;
    const isOpen = a.status === "New" || a.status === "InProgress";

    if (!isOpen) return due;
    if (a.isOverdue) return `${due} — просрочено на ${-(a.daysLeft ?? 0)} дн.`;

    return `${due} · осталось ${a.daysLeft} дн.`;
}

const Field = ({label, value}: {label: string; value: string | null}) => (
    <div>
        <span style={{color: "#8b97ab"}}>{label}: </span>
        {value || "—"}
    </div>
);

const UserSelect = ({label, users, value, onChange}: {
    label: string;
    users: UserResponse[];
    value: string;
    onChange: (v: string) => void;
}) => (
    <select value={value} onChange={e => onChange(e.target.value)} title={label} style={{...input, width: 230}}>
        <option value="">— {label.toLowerCase()} —</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
    </select>
);

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const block: React.CSSProperties = {marginTop: 14};

const blockTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab",
    textTransform: "uppercase", marginBottom: 8,
};

const chip: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "5px 9px", borderRadius: 8, background: "#f6f8fb",
    fontSize: 12, color: "#26324a",
};

const chipClose: React.CSSProperties = {
    border: "none", background: "none", color: "#8b97ab",
    font: "inherit", fontSize: 13, cursor: "pointer", padding: "0 0 0 3px",
};

const input: React.CSSProperties = {
    height: 34, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const secondaryButton: React.CSSProperties = {
    height: 34, padding: "0 13px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const smallButton: React.CSSProperties = {
    height: 28, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
};

const fileLabel: React.CSSProperties = {cursor: "pointer", color: "#2f68f5", fontWeight: 600};
