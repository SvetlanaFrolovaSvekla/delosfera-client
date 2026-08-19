import {useCallback, useEffect, useState} from "react";
import {Trophy} from "lucide-react";
import {tenderService, type CommissionRole, type Tender} from "@/service/procurementService/tenderService.ts";
import {attachmentService, type Attachment} from "@/service/documentService/attachmentService.ts";
import {userService} from "@/service/userService/userService.ts";
import {publicationService, type PublicationPackage} from "@/service/procurementService/guaranteeService.ts";

/**
 * Конкурс по закупке (PRC-13..16) на карточке: комиссия, публикация, заявки,
 * вскрытие и определение победителя.
 *
 * Требования к составу и кворуму считает сервер — панель показывает их как есть,
 * чтобы правила Положения не расходились между интерфейсом и проверками.
 */

interface Props {
    requestId: number;

    /** Документ закупки — из его вложений эксперт выбирает файл заключения. */
    documentId?: number;

    onChanged?: () => void;
}

interface UserOption {
    id: number;
    fullName: string;
}

function money(value: number): string {
    return `${value.toLocaleString("ru-RU")} сом`;
}

export const TenderPanel = ({requestId, documentId, onChanged}: Props) => {
    const [tender, setTender] = useState<Tender | null>(null);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const [memberForm, setMemberForm] = useState({userId: 0, role: "Member", board: false, accountant: false});
    const [deadline, setDeadline] = useState("");
    const [bidForm, setBidForm] = useState({title: "", inn: "", price: 0, submittedOn: ""});
    /** Пакет публикации (INT-05): текст объявления собирается из карточки конкурса. */
    const [publication, setPublication] = useState<PublicationPackage | null>(null);

    /** Эксперт, чьё заключение сейчас редактируется, и его черновик. */
    const [conclusionFor, setConclusionFor] = useState<number | null>(null);
    const [conclusionDraft, setConclusionDraft] = useState({text: "", attachmentId: 0});
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const load = useCallback(async () => {
        try {
            setTender(await tenderService.get(requestId));
        } catch {
            setError("Не удалось загрузить конкурс");
        } finally {
            setLoaded(true);
        }
    }, [requestId]);

    useEffect(() => {
        void load();
        userService.getAll()
            .then(list => setUsers(list.map(u => ({id: u.id, fullName: u.fullName}))))
            .catch(() => undefined);
    }, [load]);

    /**
     * Заключение эксперта редактируется по месту: подставляем то, что уже сохранено,
     * и список вложений закупки — файл заключения берётся оттуда, а не загружается
     * отдельно, иначе он выпал бы из общего хранилища и подписей карточки.
     */
    const openConclusion = (memberId: number) => {
        const member = tender?.commission.find(m => m.id === memberId);
        setConclusionDraft({
            text: member?.conclusion ?? "",
            attachmentId: member?.conclusionAttachmentId ?? 0,
        });
        setConclusionFor(memberId);

        if (documentId) {
            attachmentService.list(documentId).then(setAttachments).catch(() => setAttachments([]));
        }
    };

    const run = async (action: () => Promise<Tender>) => {
        try {
            setBusy(true);
            setError(null);
            setTender(await action());
            onChanged?.();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    if (!loaded) return null;

    if (!tender) {
        return (
            <section style={card}>
                <div style={cardTitle}>Конкурс</div>
                <div style={{fontSize: 13, color: "#55617a", lineHeight: 1.7}}>
                    Конкурс по этой закупке не объявлялся. Он проводится, когда способ закупки —
                    конкурс: формируется комиссия, публикуется объявление, принимаются и вскрываются заявки.
                </div>
                {error && <div style={{marginTop: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}
                <button
                    onClick={() => run(() => tenderService.create(requestId, {}))}
                    disabled={busy}
                    style={{...primaryButton, marginTop: 12}}
                >
                    Начать подготовку конкурса
                </button>
            </section>
        );
    }

    const votingCount = tender.commission.filter(m => m.isVoting).length;

    return (
        <section style={card}>
            <div style={{display: "flex", alignItems: "center", gap: 10}}>
                <div>
                    <div style={cardTitle}>Конкурс {tender.regNumber}</div>
                    <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                        {tender.isLimited ? "с ограниченным участием" : "с неограниченным участием"}
                        {tender.publishedOn && ` · объявлен ${tender.publishedOn}`}
                        {tender.submissionDeadline && ` · приём до ${tender.submissionDeadline}`}
                    </div>
                </div>
                <div style={{flex: 1}}/>
                <span style={{
                    padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                    background: tender.status === "Decided" ? "#eefaf1" : "#f2f5f9",
                    color: tender.status === "Decided" ? "#1f8a4c" : "#55617a",
                }}>
                    {tender.statusTitle}
                </span>
            </div>

            {error && <div style={{marginTop: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}

            {tender.blockers.length > 0 && (
                <ul style={{margin: "12px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#8a5a00", lineHeight: 1.7}}>
                    {tender.blockers.map(b => <li key={b}>{b}</li>)}
                </ul>
            )}

            {/* --- комиссия --- */}
            <div style={{...sectionTitle, marginTop: 16}}>
                Комиссия · {votingCount} из {tender.requiredSize} голосующих
                {tender.requiredBoardMembers > 0 && ` · членов Правления не менее ${tender.requiredBoardMembers}`}
                {tender.requiresAccountant && " · требуется УБУиО"}
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                {tender.commission.map(m => (
                    <div key={m.id} style={{display: "flex", alignItems: "center", gap: 10, fontSize: 12.5}}>
                        <span style={{flex: 1, color: "#26324a"}}>
                            <b>{m.userName}</b> · {m.roleTitle}
                            {m.isBoardMember && " · ЧП"}
                            {m.isAccountant && " · УБУиО"}
                            {m.conclusionFileName && (
                                <span style={{color: "#8b97ab"}}> · {m.conclusionFileName}</span>
                            )}
                        </span>

                        {tender.status === "Opened" && m.isVoting && (
                            <label style={{display: "flex", alignItems: "center", gap: 5, color: "#55617a"}}>
                                <input
                                    type="checkbox"
                                    checked={m.attendedOpening}
                                    onChange={e => run(() => tenderService.setAttendance(m.id, e.target.checked))}
                                    style={{accentColor: "#2f68f5"}}
                                />
                                присутствует
                            </label>
                        )}

                        {m.role === "Expert" && (
                            <button onClick={() => openConclusion(m.id)} disabled={busy} style={linkButton}>
                                {m.conclusion || m.conclusionFileName ? "заключение" : "дать заключение"}
                            </button>
                        )}

                        {tender.status === "Draft" && (
                            <button onClick={() => run(() => tenderService.removeMember(m.id))} disabled={busy} style={linkButton}>
                                исключить
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {conclusionFor !== null && (
                <div style={{
                    marginTop: 10, padding: 12, borderRadius: 10,
                    border: "1px solid #cbddff", background: "#f5f8ff",
                }}>
                    <div style={{fontSize: 12.5, fontWeight: 600, color: "#0f1b2d"}}>
                        Заключение эксперта
                    </div>
                    <textarea
                        value={conclusionDraft.text}
                        onChange={e => setConclusionDraft({...conclusionDraft, text: e.target.value})}
                        rows={3}
                        placeholder="Вывод по предмету закупки: соответствие требованиям, замечания, рекомендация"
                        style={{...input, width: "100%", height: "auto", padding: "8px 10px", resize: "vertical", marginTop: 6}}
                    />
                    <div style={{display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center"}}>
                        <select
                            value={conclusionDraft.attachmentId}
                            onChange={e => setConclusionDraft({...conclusionDraft, attachmentId: Number(e.target.value)})}
                            style={{...input, width: 300}}
                        >
                            <option value={0}>— файл заключения не выбран —</option>
                            {attachments.map(a => <option key={a.id} value={a.id}>{a.fileName}</option>)}
                        </select>
                        <button
                            onClick={() => run(async () => {
                                const updated = await tenderService.setConclusion(conclusionFor, {
                                    conclusion: conclusionDraft.text.trim() || null,
                                    attachmentId: conclusionDraft.attachmentId || null,
                                });
                                setConclusionFor(null);
                                return updated;
                            })}
                            disabled={busy}
                            style={secondaryButton}
                        >
                            Сохранить заключение
                        </button>
                        <button onClick={() => setConclusionFor(null)} disabled={busy} style={linkButton}>
                            отмена
                        </button>
                    </div>
                    {attachments.length === 0 && (
                        <div style={{marginTop: 6, fontSize: 11.5, color: "#8b97ab"}}>
                            Файл сначала прикладывается к карточке закупки — здесь он появится в списке
                        </div>
                    )}
                </div>
            )}

            {tender.status === "Draft" && (
                <div style={{display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center"}}>
                    <select
                        value={memberForm.userId}
                        onChange={e => setMemberForm({...memberForm, userId: Number(e.target.value)})}
                        style={{...input, width: 220}}
                    >
                        <option value={0}>— сотрудник —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                    <select
                        value={memberForm.role}
                        onChange={e => setMemberForm({...memberForm, role: e.target.value})}
                        style={{...input, width: 150}}
                    >
                        <option value="Member">Член комиссии</option>
                        <option value="Chairman">Председатель</option>
                        <option value="Secretary">Секретарь</option>
                        <option value="Expert">Эксперт без права голоса</option>
                    </select>
                    <label style={checkLabel}>
                        <input type="checkbox" checked={memberForm.board}
                               onChange={e => setMemberForm({...memberForm, board: e.target.checked})}
                               style={{accentColor: "#2f68f5"}}/> член Правления
                    </label>
                    <label style={checkLabel}>
                        <input type="checkbox" checked={memberForm.accountant}
                               onChange={e => setMemberForm({...memberForm, accountant: e.target.checked})}
                               style={{accentColor: "#2f68f5"}}/> УБУиО
                    </label>
                    <button
                        onClick={() => run(() => tenderService.addMember(tender.id, {
                            userId: memberForm.userId,
                            role: memberForm.role as CommissionRole,
                            isBoardMember: memberForm.board,
                            isAccountant: memberForm.accountant,
                        }))}
                        disabled={busy || !memberForm.userId}
                        style={secondaryButton}
                    >
                        Включить в комиссию
                    </button>
                </div>
            )}

            {/* --- публикация --- */}
            {tender.status === "Draft" && (
                <div style={{display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap"}}>
                    <span style={{fontSize: 12.5, color: "#55617a"}}>Приём заявок до:</span>
                    <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{...input, width: 170}}/>
                    <button
                        onClick={() => run(() => tenderService.publish(tender.id, deadline))}
                        disabled={busy || !deadline}
                        style={primaryButton}
                    >
                        Объявить конкурс
                    </button>
                </div>
            )}

            {/* --- заявки --- */}
            {tender.status !== "Draft" && (
                <>
                    <div style={{...sectionTitle, marginTop: 18}}>Конкурсные заявки</div>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                        <thead>
                            <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                <th style={th}>Поставщик</th>
                                <th style={{...th, textAlign: "right"}}>Цена</th>
                                <th style={th}>Подана</th>
                                <th style={th}>Допуск</th>
                                <th style={th}>Решение</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tender.bids.map(b => (
                                <tr key={b.id} style={{
                                    borderTop: "1px solid #eef2f7",
                                    background: b.isWinner ? "#eefaf1" : undefined,
                                    opacity: b.isAdmitted || tender.status === "Published" ? 1 : 0.55,
                                }}>
                                    <td style={td}>
                                        <div style={{fontWeight: 600}}>{b.supplierTitle}</div>
                                        <div style={{fontSize: 11, color: "#8b97ab"}}>
                                            {b.supplierInn ? `ИНН ${b.supplierInn}` : "ИНН не указан"}
                                            {b.supplierBlacklisted && " · в чёрном списке"}
                                        </div>
                                    </td>
                                    <td style={{...td, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap"}}>
                                        {money(b.price)}
                                    </td>
                                    <td style={td}>
                                        {b.submittedOn}
                                        {b.isLate && <div style={{fontSize: 11, color: "#c0392b"}}>после срока</div>}
                                    </td>
                                    <td style={td}>
                                        {tender.status === "Published"
                                            ? "—"
                                            : b.isAdmitted
                                                ? <span style={{color: "#1f8a4c", fontWeight: 600}}>допущена</span>
                                                : <span style={{color: "#c0392b"}}>{b.rejectionReason ?? "не допущена"}</span>}
                                    </td>
                                    <td style={td}>
                                        {b.isWinner ? (
                                            <span style={{display: "inline-flex", alignItems: "center", gap: 5, color: "#1f8a4c", fontWeight: 700}}>
                                                <Trophy size={14}/> победитель
                                            </span>
                                        ) : tender.status === "Opened" && b.isAdmitted ? (
                                            <button
                                                onClick={() => run(() => tenderService.declareWinner(tender.id, b.id))}
                                                disabled={busy}
                                                style={secondaryButton}
                                            >
                                                Победитель
                                            </button>
                                        ) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {tender.status === "Published" && (
                        <>
                            <div style={{display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap"}}>
                                <input value={bidForm.title} onChange={e => setBidForm({...bidForm, title: e.target.value})}
                                       placeholder="Поставщик" style={{...input, width: 220}}/>
                                <input value={bidForm.inn} onChange={e => setBidForm({...bidForm, inn: e.target.value})}
                                       placeholder="ИНН" style={{...input, width: 150}}/>
                                <input type="number" value={bidForm.price || ""}
                                       onChange={e => setBidForm({...bidForm, price: Number(e.target.value) || 0})}
                                       placeholder="Цена" style={{...input, width: 140}}/>
                                <input type="date" value={bidForm.submittedOn}
                                       onChange={e => setBidForm({...bidForm, submittedOn: e.target.value})}
                                       style={{...input, width: 160}}/>
                                <button
                                    onClick={() => run(() => tenderService.addBid(tender.id, {
                                        supplierTitle: bidForm.title,
                                        supplierInn: bidForm.inn || undefined,
                                        price: bidForm.price,
                                        submittedOn: bidForm.submittedOn || undefined,
                                    }))}
                                    disabled={busy || !bidForm.title.trim() || bidForm.price <= 0}
                                    style={secondaryButton}
                                >
                                    Зарегистрировать заявку
                                </button>
                            </div>

                            <button
                                onClick={() => run(() => tenderService.open(tender.id))}
                                disabled={busy}
                                style={{...primaryButton, marginTop: 12}}
                            >
                                Вскрыть заявки
                            </button>
                        </>
                    )}

                    <div style={{marginTop: 12}}>
                        <button
                            onClick={() => publication
                                ? setPublication(null)
                                : publicationService.get(tender.id).then(setPublication).catch(() => undefined)}
                            style={secondaryButton}
                        >
                            {publication ? "Скрыть объявление" : "Пакет публикации"}
                        </button>

                        {publication && (
                            <div style={{marginTop: 10, padding: 14, borderRadius: 11, background: "#f6f8fb"}}>
                                <div style={{fontSize: 11.5, color: "#8b97ab", marginBottom: 8}}>
                                    Размещение: {publication.channels.join(" · ")}
                                    {publication.blockers.length > 0 && ` · ${publication.blockers.join("; ")}`}
                                </div>
                                <pre style={{
                                    margin: 0, whiteSpace: "pre-wrap", font: "inherit", fontSize: 12.5,
                                    lineHeight: 1.7, color: "#26324a",
                                }}>
                                    {publication.announcement}
                                </pre>
                            </div>
                        )}
                    </div>

                    {tender.status === "Opened" && (
                        <div style={{marginTop: 12, fontSize: 12.5, color: tender.hasQuorum ? "#1f8a4c" : "#c0392b"}}>
                            Кворум: присутствует {tender.attended} из {tender.quorumRequired} требуемых
                            {tender.hasQuorum ? " — решение возможно" : " — решение не принимается"}
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab", textTransform: "uppercase",
};

const sectionTitle: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 600, color: "#0f1b2d", marginBottom: 8,
};

const input: React.CSSProperties = {
    height: 34, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const checkLabel: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#55617a",
};

const primaryButton: React.CSSProperties = {
    height: 34, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 34, padding: "0 13px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const linkButton: React.CSSProperties = {
    border: "none", background: "none", color: "#8b97ab", font: "inherit", fontSize: 12, cursor: "pointer",
};

const th: React.CSSProperties = {padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "9px 10px", verticalAlign: "top", color: "#26324a"};
