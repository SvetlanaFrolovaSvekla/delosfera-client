import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {FileText, Inbox} from "lucide-react";
import {
    agendaCandidateService, type AgendaCandidate,
} from "@/service/meetingsService/agendaCandidateService.ts";
import {
    bodyOptions, meetingsService, type MeetingBody,
} from "@/service/meetingsService/meetingsService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {FilterChip, formatDate} from "@/components/componentsGeneral/DataTable.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/**
 * Отбор вопросов на заседание.
 *
 * Записки с отметкой «вынести на орган» стоят здесь очередью к секретарю. Он
 * решает: включить в ближайшее заседание, отложить или отклонить. Формулировку
 * вопроса можно поправить — тема записки и вопрос повестки редко совпадают
 * дословно.
 */

/** Какими органами вправе распоряжаться этот пользователь. */
const BODY_PERMISSION: Record<MeetingBody, number> = {
    Board: PermissionCode.ManageBoardMeetings,
    Kpa: PermissionCode.ManageKpaMeetings,
    CreditCommittee: PermissionCode.ManageCreditCommitteeMeetings,
};

interface MeetingOption {
    id: number;
    number: number;
    date: string;
}

export function AgendaCandidatesPage() {
    const {hasPermission} = useAuth();
    const navigate = useNavigate();

    const bodies = (Object.keys(BODY_PERMISSION) as MeetingBody[])
        .filter((body) => hasPermission(BODY_PERMISSION[body]));

    const [body, setBody] = useState<MeetingBody | null>(bodies[0] ?? null);
    const [rows, setRows] = useState<AgendaCandidate[]>([]);
    const [meetings, setMeetings] = useState<MeetingOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    /** Формулировка вопроса, если секретарь её поправил. Ключ — идентификатор записки. */
    const [questions, setQuestions] = useState<Record<number, string>>({});
    const [target, setTarget] = useState<Record<number, number | "">>({});

    const load = async () => {
        if (!body) return;

        setLoading(true);
        setError(null);
        try {
            const list = await agendaCandidateService.list(body);
            setRows(list);

            // Ближайшие заседания этого органа — то, куда вопрос можно поставить.
            const found = await meetingsService.list({body});
            setMeetings(found.slice(0, 20).map((m) => ({id: m.id, number: m.number, date: m.date})));
        } catch {
            setError("Не удалось загрузить очередь.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [body]);

    const take = async (candidate: AgendaCandidate) => {
        const meetingId = target[candidate.szId];
        if (!meetingId) {
            setError("Выберите заседание, в повестку которого включить вопрос.");
            return;
        }

        setBusy(candidate.szId);
        setError(null);
        try {
            await agendaCandidateService.take(
                meetingId, candidate.szId, questions[candidate.szId]?.trim() || undefined);
            await load();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось включить вопрос в повестку.");
        } finally {
            setBusy(null);
        }
    };

    const decline = async (szId: number) => {
        if (!body) return;

        setBusy(szId);
        try {
            await agendaCandidateService.decline(szId, body);
            await load();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось отклонить заявку.");
        } finally {
            setBusy(null);
        }
    };

    if (bodies.length === 0) {
        return (
            <div className="p-6">
                <EmptyState
                    title="Отбор вопросов недоступен"
                    description="Повестку формирует секретарь органа. Обратитесь к администратору, если вы ведёте заседания."
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Вопросы на рассмотрение"
                description="Записки с отметкой о вынесении на коллегиальный орган"
            />

            {bodies.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {bodies.map((value) => (
                        <FilterChip key={value} active={body === value} onClick={() => setBody(value)}>
                            {bodyOptions.find((o) => o.value === value)?.title ?? value}
                        </FilterChip>
                    ))}
                </div>
            )}

            {error && (
                <p className="rounded-[10px] bg-[#fbeae7] px-3 py-2 text-[13px] text-[#c0392b]">{error}</p>
            )}

            {loading ? (
                <Loader label="Загружаем очередь…"/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Очередь пуста"
                    description="Записок с отметкой на этот орган нет. Отметку ставит автор записки или её адресат."
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {rows.map((candidate) => (
                        <article
                            key={candidate.szId}
                            className="rounded-[14px] border border-[#e1e7ef] bg-white p-4"
                        >
                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <Inbox size={16} className="text-[#2f68f5]"/>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/sz/${candidate.szId}`)}
                                    className="font-mono text-[12.5px] text-[#2f68f5] hover:underline"
                                >
                                    {candidate.number ?? "б/н"}
                                </button>
                                <span className="text-[12.5px] text-[#8593a8]">
                                    от {formatDate(candidate.registeredOn)}
                                </span>
                                {candidate.fileCount > 0 && (
                                    <span className="flex items-center gap-1 text-[12.5px] text-[#8593a8]">
                                        <FileText size={13}/>
                                        {candidate.fileCount}
                                    </span>
                                )}
                                <span className="ml-auto text-[12px] text-[#8593a8]">
                                    заявка от {candidate.requestedBy ?? "—"} · {formatDate(candidate.requestedAt)}
                                </span>
                            </div>

                            <h3 className="mb-1 text-[15px] font-semibold text-[#101a2c]">
                                {candidate.subject}
                            </h3>
                            <p className="mb-3 text-[13px] text-[#8593a8]">
                                {[candidate.authorName, candidate.authorUnit].filter(Boolean).join(" · ")}
                                {candidate.signerName && ` · подписал ${candidate.signerName}`}
                            </p>

                            <div className="mb-3">
                                <label className="mb-1 block text-[12.5px] font-medium text-[#4d5a72]">
                                    Формулировка вопроса в повестке
                                </label>
                                <input
                                    value={questions[candidate.szId] ?? candidate.proposedQuestion ?? candidate.subject ?? ""}
                                    onChange={(event) => setQuestions((prev) => ({
                                        ...prev, [candidate.szId]: event.target.value,
                                    }))}
                                    className="w-full rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                               text-[14px] outline-none transition focus:border-[#2f68f5]"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 border-t border-[#eef2f7] pt-3">
                                <select
                                    value={target[candidate.szId] ?? ""}
                                    onChange={(event) => setTarget((prev) => ({
                                        ...prev,
                                        [candidate.szId]: event.target.value ? Number(event.target.value) : "",
                                    }))}
                                    className="rounded-[9px] border border-[#e1e7ef] px-3 py-1.5 text-[13px]
                                               outline-none focus:border-[#2f68f5]"
                                >
                                    <option value="">— в какое заседание —</option>
                                    {meetings.map((meeting) => (
                                        <option key={meeting.id} value={meeting.id}>
                                            № {meeting.number} от {formatDate(meeting.date)}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    disabled={busy === candidate.szId}
                                    onClick={() => take(candidate)}
                                    className="rounded-[9px] bg-[#2f68f5] px-4 py-1.5 text-[13px] font-medium
                                               text-white transition hover:bg-[#2554cc] disabled:opacity-60"
                                >
                                    Включить в повестку
                                </button>

                                <button
                                    type="button"
                                    disabled={busy === candidate.szId}
                                    onClick={() => decline(candidate.szId)}
                                    className="rounded-[9px] border border-[#e1e7ef] px-4 py-1.5 text-[13px]
                                               text-[#4d5a72] transition hover:border-[#c0392b] hover:text-[#c0392b]
                                               disabled:opacity-60"
                                >
                                    Отклонить заявку
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
