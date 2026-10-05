/**
 * Отбор вопросов на заседание.
 *
 * Записки с отметкой «вынести на орган» стоят здесь очередью к секретарю. Он
 * решает: включить в ближайшее заседание, отложить или отклонить. Формулировку
 * вопроса можно поправить — тема записки и вопрос повестки редко совпадают
 * дословно.
 */
import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {
    agendaCandidateService, type AgendaCandidate,
} from "@/service/meetingsService/agendaCandidateService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {
    meetingsService, type MeetingBody,
} from "@/service/meetingsService/meetingsService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {formatDate} from "@/components/componentsGeneral/DataTable.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {FileText, Inbox} from "lucide-react";

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

const PAGE_CLASS =
    "w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]";

const TEXT_INPUT =
    "h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc]";

const BTN_PRIMARY =
    "inline-flex items-center gap-2 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold " +
    "text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:cursor-not-allowed disabled:bg-[#e5e9f0] disabled:text-[#a3adbd]";

const BTN_DANGER_GHOST =
    "inline-flex items-center gap-2 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] " +
    "font-semibold text-[12.5px] cursor-pointer hover:border-[#f3c9c2] hover:bg-[#fdf6f5] hover:text-[#c0392b] " +
    "disabled:cursor-not-allowed disabled:opacity-60";

export function AgendaCandidatesPage() {
    const {hasPermission} = useAuth();
    const navigate = useNavigate();
    const {t} = useTranslation();

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

    const meetingSelectOptions = useMemo(
        () => meetings.map((meeting) => ({
            value: String(meeting.id),
            label: t("meetings.candidates.meetingOption", {number: meeting.number, date: formatDate(meeting.date)}),
        })),
        [meetings, t],
    );

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
            setError(t("meetings.candidates.loadError"));
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
            setError(t("meetings.candidates.pickMeeting"));
            toast.warning(t("meetings.candidates.pickMeeting"));
            return;
        }

        setBusy(candidate.szId);
        setError(null);
        try {
            await agendaCandidateService.take(
                meetingId, candidate.szId, questions[candidate.szId]?.trim() || undefined);
            await load();
            toast.success(t("meetings.toast.candidateTaken"));
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("meetings.candidates.takeError"));
            toast.error(t("meetings.candidates.takeError"), message);
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
            toast.success(t("meetings.toast.candidateDeclined"));
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("meetings.candidates.declineError"));
            toast.error(t("meetings.candidates.declineError"), message);
        } finally {
            setBusy(null);
        }
    };

    if (bodies.length === 0) {
        return (
            <div className={PAGE_CLASS}>
                <EmptyState
                    title={t("meetings.candidates.unavailableTitle")}
                    description={t("meetings.candidates.unavailableDesc")}
                />
            </div>
        );
    }

    return (
        <div className={PAGE_CLASS}>
            <PageHeader
                title={t("meetings.candidates.title")}
                description={t("meetings.candidates.description")}
            />

            {bodies.length > 1 && body && (
                <Tabs<MeetingBody>
                    tabs={bodies.map((value) => ({
                        id: value,
                        label: t(`meetings.bodies.${value}`),
                    }))}
                    value={body}
                    onChange={setBody}
                />
            )}

            {error && (
                <p className="mb-4 rounded-[10px] bg-[#fbeae7] px-3 py-2 text-[13px] text-[#c0392b]">{error}</p>
            )}

            {loading ? (
                <Loader label={t("meetings.candidates.loading")}/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title={t("meetings.candidates.emptyTitle")}
                    description={t("meetings.candidates.emptyDesc")}
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {rows.map((candidate) => (
                        <article
                            key={candidate.szId}
                            className="rounded-2xl border border-[#e9edf3] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
                        >
                            <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[#ececfc] text-[#4e57d6]">
                                    <Inbox size={15}/>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/sz/${candidate.szId}`)}
                                    className="border-none bg-transparent p-0 font-mono text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:underline"
                                >
                                    {candidate.number ?? t("meetings.candidates.noNumber")}
                                </button>
                                <span className="text-[12.5px] text-[#8b97ab]">
                                    {t("meetings.candidates.from", {date: formatDate(candidate.registeredOn)})}
                                </span>
                                {candidate.fileCount > 0 && (
                                    <span className="flex items-center gap-1 text-[12.5px] text-[#8b97ab]">
                                        <FileText size={13}/>
                                        {candidate.fileCount}
                                    </span>
                                )}
                                <span className="ml-auto text-[12px] text-[#8b97ab]">
                                    {t("meetings.candidates.requestedLine", {by: candidate.requestedBy ?? "—", date: formatDate(candidate.requestedAt)})}
                                </span>
                            </div>

                            <h3 className="m-0 mb-1 text-[15px] font-semibold text-[#1c2740]">
                                {candidate.subject}
                            </h3>
                            <p className="mb-4 mt-0 text-[13px] text-[#8b97ab]">
                                {[candidate.authorName, candidate.authorUnit].filter(Boolean).join(" · ")}
                                {candidate.signerName && ` · ${t("meetings.candidates.signedBy", {name: candidate.signerName})}`}
                            </p>

                            <div className="mb-4">
                                <label className="mb-[5px] block text-[11.5px] text-[#8b97ab]">
                                    {t("meetings.candidates.questionLabel")}
                                </label>
                                <input
                                    value={questions[candidate.szId] ?? candidate.proposedQuestion ?? candidate.subject ?? ""}
                                    onChange={(event) => setQuestions((prev) => ({
                                        ...prev, [candidate.szId]: event.target.value,
                                    }))}
                                    className={TEXT_INPUT}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 border-t border-[#f3f6f9] pt-4">
                                <SelectDropdown
                                    options={meetingSelectOptions}
                                    value={target[candidate.szId] ? String(target[candidate.szId]) : ""}
                                    onChange={(value) => setTarget((prev) => ({
                                        ...prev,
                                        [candidate.szId]: value ? Number(value) : "",
                                    }))}
                                    placeholder={t("meetings.candidates.meetingPlaceholder")}
                                    minWidth="220px"
                                />

                                <button
                                    type="button"
                                    disabled={busy === candidate.szId}
                                    onClick={() => void take(candidate)}
                                    className={BTN_PRIMARY}
                                >
                                    {t("meetings.candidates.take")}
                                </button>

                                <button
                                    type="button"
                                    disabled={busy === candidate.szId}
                                    onClick={() => void decline(candidate.szId)}
                                    className={BTN_DANGER_GHOST}
                                >
                                    {t("meetings.candidates.decline")}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
