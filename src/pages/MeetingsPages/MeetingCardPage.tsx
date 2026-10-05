/**
 * Карточка заседания: реквизиты и повестка дня.
 *
 * Повестка показывается только в доступной пользователю части — сервер отдаёт
 * лишь те вопросы, где сотрудник назван докладчиком, приглашённым или ответственным.
 */
import {useCallback, useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {AlertTriangle, ArrowLeft, CircleCheck, ClipboardList, Link2, ListChecks, Plus, Send} from "lucide-react";
import {
    agendaService,
    meetingsService,
    type Meeting,
    type MeetingNotifyResult,
} from "@/service/meetingsService/meetingsService.ts";
import {formatDate, formatTime} from "@/service/meetingsService/formatMeetingDate.ts";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {AgendaItemCard} from "@/components/meetings/AgendaItemCard.tsx";
import {MeetingAttendancePanel} from "@/components/meetings/MeetingAttendancePanel.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {KpiCard} from "@/components/componentsReport/KpiCard.tsx";

const TEXT_INPUT =
    "h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc]";

const BTN_PRIMARY =
    "inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white " +
    "font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6] " +
    "disabled:cursor-not-allowed disabled:bg-[#e5e9f0] disabled:text-[#a3adbd] disabled:shadow-none";

const BTN_SECONDARY =
    "inline-flex items-center gap-2 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] " +
    "font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed";

export const MeetingCardPage = () => {
    const {id} = useParams();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const meetingId = Number(id);

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notified, setNotified] = useState<MeetingNotifyResult | null>(null);
    const [topic, setTopic] = useState("");

    const load = useCallback(async () => {
        try {
            setError(null);
            setMeeting(await meetingsService.get(meetingId));
        } catch {
            setError(t("meetings.card.notFound"));
        }
    }, [meetingId, t]);

    useEffect(() => {
        void load();
        userService.lookup().then(setUsers).catch(() => undefined);
    }, [load]);

    /** Действие над заседанием: успех и ошибка показываются тостом (successKey — текст успеха). */
    const run = async (action: () => Promise<unknown>, successKey?: string) => {
        try {
            setBusy(true);
            setError(null);
            await action();
            await load();
            if (successKey) toast.success(t(successKey));
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? t("meetings.card.opFailed"));
            toast.error(t("meetings.card.opFailed"), message);
        } finally {
            setBusy(false);
        }
    };

    const notify = () => run(async () => {
        setNotified(await meetingsService.notify(meetingId));
    }, "meetings.toast.notified");

    const addItem = () => run(async () => {
        await agendaService.addItem(meetingId, {topic: topic.trim()});
        setTopic("");
    }, "meetings.toast.itemAdded");

    const pageClass =
        "w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]";

    if (!meeting) {
        return (
            <div className={pageClass}>
                {error ? (
                    <EmptyState
                        variant="error"
                        title={t("meetings.card.unavailableTitle")}
                        description={error}
                        actionLabel={t("meetings.card.toRegistry")}
                        onAction={() => navigate("/meetings")}
                    />
                ) : (
                    <Loader label={t("meetings.card.loading")}/>
                )}
            </div>
        );
    }

    return (
        <div className={pageClass}>
            <button
                type="button"
                onClick={() => navigate("/meetings")}
                className="mb-2.5 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[12.5px] font-semibold text-[#8b97ab] cursor-pointer hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-[14px] h-[14px]" strokeWidth={2}/>
                {t("meetings.card.back")}
            </button>

            <PageHeader
                title={t("meetings.card.title", {
                    body: t(`meetings.bodies.${meeting.body}`),
                    number: String(meeting.number).padStart(2, "0"),
                })}
                description={
                    t("meetings.card.subtitle", {
                        date: formatDate(meeting.date),
                        time: formatTime(meeting.time),
                        form: t(`meetings.forms.${meeting.form}`),
                        secretary: meeting.secretaryName ?? "—",
                    }) +
                    (meeting.secretaryUnitTitle ? ` (${meeting.secretaryUnitTitle})` : "")
                }
                actions={meeting.canEdit ? (
                    <button type="button" onClick={() => void notify()} disabled={busy} className={BTN_PRIMARY}>
                        <Send className="w-[17px] h-[17px]" strokeWidth={2}/>
                        {t("meetings.card.notify")}
                    </button>
                ) : undefined}
            />

            {error && (
                <p className="mb-4 rounded-[10px] bg-[#fbeae7] px-3 py-2 text-[13px] text-[#c0392b]">{error}</p>
            )}

            {notified && (
                <section className="mb-4 rounded-[14px] border border-[#cfe6da] bg-[#e6f4ec] p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <CircleCheck size={18} className="text-[#1c7a4d]"/>
                        <h2 className="m-0 text-[14px] font-semibold text-[#1c4d35]">
                            {t("meetings.card.notified", {count: notified.recipientCount})}
                        </h2>
                    </div>
                    <div className="text-[13px] font-semibold text-[#26324a]">{notified.subject}</div>
                    <div className="mt-1.5 text-[12.5px] leading-[1.6] text-[#55617a]">{notified.body}</div>
                    <div className="mt-2 text-[11.5px] text-[#8b97ab]">{notified.recipients.join(" · ")}</div>
                </section>
            )}

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    label={t("meetings.card.kpi.items")} value={meeting.items.length}
                    icon={ListChecks} color="#4e57d6" bg="#eef0ff"
                />
                <KpiCard
                    label={t("meetings.card.kpi.assignments")} value={meeting.assignmentCount}
                    icon={ClipboardList} color="#4e57d6" bg="#eef0ff"
                />
                {meeting.overdueCount > 0 ? (
                    <KpiCard
                        label={t("meetings.card.kpi.overdue")} value={meeting.overdueCount}
                        icon={AlertTriangle} color="#dc2626" bg="#fdecec"
                        hint={t("meetings.card.kpi.overdueHint")}
                    />
                ) : (
                    <KpiCard
                        label={t("meetings.card.kpi.overdue")} value={t("meetings.card.kpi.overdueNone")}
                        icon={CircleCheck} color="#16a34a" bg="#eef7f0"
                    />
                )}
                <KpiCard
                    label={t("meetings.card.kpi.materials")}
                    value={meeting.materialsUrl ? t("meetings.card.kpi.materialsLink") : t("meetings.card.kpi.materialsNone")}
                    icon={Link2} color="#4e57d6" bg="#eef0ff"
                    hint={meeting.materialsUrl ?? undefined}
                />
            </div>

            {/* Кто из органа был на заседании: по этому списку считается кворум,
                и с него начинается протокол. */}
            <MeetingAttendancePanel meetingId={meeting.id} canEdit={meeting.canEdit}/>

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
                <div className="mb-4">
                    <EmptyState
                        title={t("meetings.card.emptyAgendaTitle")}
                        description={t("meetings.card.emptyAgendaDesc")}
                    />
                </div>
            )}

            {meeting.canEdit && (
                <Section icon={<Plus className="w-4 h-4 text-[#2d354a]" strokeWidth={2}/>}
                         title={t("meetings.card.addItem")} noMarginBottom>
                    <div className="flex flex-wrap gap-2.5">
                        <input
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && topic.trim() && !busy) void addItem();
                            }}
                            placeholder={t("meetings.card.topicPlaceholder")}
                            className={`${TEXT_INPUT} flex-1 min-w-[260px] !w-auto`}
                        />
                        <button type="button" onClick={() => void addItem()} disabled={busy || !topic.trim()}
                                className={BTN_SECONDARY}>
                            <Plus className="w-[15px] h-[15px]" strokeWidth={2.2}/>
                            {t("meetings.card.add")}
                        </button>
                    </div>
                </Section>
            )}
        </div>
    );
};
