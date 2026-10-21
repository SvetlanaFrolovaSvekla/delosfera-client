import type {UserLookupItem} from "@/service/userService/userService.ts";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import type {TFunction} from "i18next";
import {ChevronDown, Paperclip, Trash2, UserPlus, X} from "lucide-react";
import {
    agendaService,
    type AgendaAssignment,
    type AgendaItem,
    type ExecutionStatus,
    type MeetingFileKind,
} from "@/service/meetingsService/meetingsService.ts";
import {formatDate} from "@/service/meetingsService/formatMeetingDate.ts";
import {parseDDMMYYYYToISO} from "@/utils/dateUtils.ts";
import {Badge, type BadgeTone} from "@/components/componentsGeneral/DataTable.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";

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
    users: UserLookupItem[];
    canEdit: boolean;
    canReport: boolean;
    onChanged: () => void | Promise<void>;
}

const STATUS_TONE: Record<ExecutionStatus, BadgeTone> = {
    New: "neutral",
    InProgress: "info",
    DoneOnTime: "good",
    DoneLate: "warn",
    NotDone: "bad",
    Cancelled: "neutral",
    Excluded: "neutral",
};

const STATUS_ORDER: ExecutionStatus[] = [
    "New", "InProgress", "DoneOnTime", "DoneLate", "NotDone", "Cancelled", "Excluded",
];

const FIELD_LABEL = "block text-[11.5px] text-[#8b97ab] mb-[5px]";
const BLOCK_TITLE = "mb-2.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]";
const TEXT_INPUT =
    "h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc]";
const TEXTAREA =
    "w-full resize-y rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[12.5px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc]";

const BTN_SECONDARY =
    "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] " +
    "font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_PRIMARY =
    "inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold " +
    "text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:cursor-not-allowed disabled:bg-[#e5e9f0] disabled:text-[#a3adbd]";
const BTN_SMALL =
    "inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#e5e9f0] bg-white text-[#55617a] " +
    "font-semibold text-[11.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed";

export const AgendaItemCard = ({item, users, canEdit, canReport, onChanged}: Props) => {
    const {t} = useTranslation();
    const statusSelectOptions = STATUS_ORDER.map(v => ({value: v, label: t(`meetings.executionStatus.${v}`)}));

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(true);

    const [guestId, setGuestId] = useState<number | null>(null);
    // Срок хранится в записи дд.мм.гггг - так его отдаёт DatePickerInput
    const [assignee, setAssignee] = useState<{userId: number | null; text: string; dueDate: string}>(
        {userId: null, text: "", dueDate: ""});
    // Отчёт об исполнении вводится прямо под поручением, а не в окне браузера
    const [reporting, setReporting] = useState<{assignmentId: number; status: ExecutionStatus} | null>(null);
    const [reportText, setReportText] = useState("");

    const [edit, setEdit] = useState({
        protocolNumber: item.protocolNumber ?? "",
        decision: item.decision ?? "",
        speakerUserId: item.speakerUserId ? String(item.speakerUserId) : "",
        speakerHeadUserId: item.speakerHeadUserId ? String(item.speakerHeadUserId) : "",
        deputySecretaryUserId: item.deputySecretaryUserId ? String(item.deputySecretaryUserId) : "",
        controllerUserId: item.controllerUserId ? String(item.controllerUserId) : "",
        documentsUrl: item.documentsUrl ?? "",
    });

    /** Действие по вопросу повестки: успех и ошибка показываются тостом (successKey — текст успеха). */
    const run = async (action: () => Promise<unknown>, successKey?: string) => {
        try {
            setBusy(true);
            setError(null);
            await action();
            await onChanged();
            if (successKey) toast.success(t(successKey));
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? t("meetings.card.opFailed"));
            toast.error(t("meetings.card.opFailed"), message);
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
    }), "meetings.toast.itemSaved");

    const sendReport = () => {
        if (!reporting) return;

        const {assignmentId, status} = reporting;
        const text = reportText.trim();

        return run(async () => {
            await agendaService.report(assignmentId, status, text || undefined);
            setReporting(null);
            setReportText("");
        }, "meetings.toast.reportSent");
    };

    const attach = (kind: MeetingFileKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        return run(() => agendaService.attach(item.id, kind, file), "meetings.toast.fileAttached");
    };

    const userField = (
        label: string,
        key: "speakerUserId" | "speakerHeadUserId" | "deputySecretaryUserId" | "controllerUserId",
    ) => (
        <div className="min-w-0">
            <span className={FIELD_LABEL}>{label}</span>
            <UserPickerField
                compact
                clearable
                people={users}
                value={edit[key] ? Number(edit[key]) : null}
                onChange={id => setEdit({...edit, [key]: String(id)})}
                onClear={() => setEdit({...edit, [key]: ""})}
                placeholder={t("meetings.agenda.notSelected")}
                modalTitle={label}
                searchPlaceholder={t("meetings.agenda.searchByName")}
            />
        </div>
    );

    return (
        <section className="mb-4 rounded-2xl border border-[#eef2f7] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] text-[#8b97ab]">
                        {t("meetings.agenda.questionLine", {
                            order: item.order,
                            protocol: item.protocolNumber || t("meetings.agenda.protocolNone"),
                        })}
                        {item.protocolDate && t("meetings.agenda.protocolDate", {date: formatDate(item.protocolDate)})}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-[#1c2740]">{item.topic}</div>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        title={t("meetings.agenda.deleteItem")}
                        onClick={() => void run(() => agendaService.removeItem(item.id), "meetings.toast.itemRemoved")}
                        disabled={busy}
                        className="grid h-8 w-8 flex-none place-items-center rounded-lg border-none bg-transparent text-[#a3adbd] cursor-pointer hover:bg-[#fdeceb] hover:text-[#c0392b] disabled:opacity-60"
                    >
                        <Trash2 className="w-4 h-4" strokeWidth={1.8}/>
                    </button>
                )}
                <button
                    type="button"
                    title={open ? t("meetings.agenda.collapse") : t("meetings.agenda.expand")}
                    onClick={() => setOpen(v => !v)}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg border-none bg-transparent text-[#a3adbd] cursor-pointer hover:bg-[#f2f5f9] hover:text-[#55617a]"
                >
                    <ChevronDown className={`w-[17px] h-[17px] transition-transform ${open ? "rotate-180" : ""}`}
                                 strokeWidth={2}/>
                </button>
            </div>

            {error && (
                <div className="mt-3 rounded-[10px] bg-[#fbeae7] px-3 py-2 text-[12.5px] text-[#c0392b]">{error}</div>
            )}

            {open && (
                <>
                    {/* Приглашённые — первыми: по ним видно, кто участвовал в рассмотрении. */}
                    <div className="mt-5 border-t border-[#f3f6f9] pt-4">
                        <div className={BLOCK_TITLE}>{t("meetings.agenda.guests")}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {item.guests.map(g => (
                                <span key={g.id}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f5f9] py-[3px] pl-[10px] pr-[6px] text-[12px] font-medium text-[#3a4560]">
                                    {g.userName}
                                    {g.orgUnitTitle && <span className="font-normal text-[#8b97ab]">· {g.orgUnitTitle}</span>}
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => void run(() => agendaService.removeGuest(g.id), "meetings.toast.guestRemoved")}
                                            disabled={busy}
                                            className="grid h-4 w-4 flex-none place-items-center rounded-full border-none bg-transparent text-[#8b97ab] cursor-pointer hover:bg-[#e5e9f0] hover:text-[#55617a]"
                                        >
                                            <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                                        </button>
                                    )}
                                </span>
                            ))}
                            {item.guests.length === 0 && <span className="text-[12.5px] text-[#a3adbd]">—</span>}
                        </div>

                        {canEdit && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <div className="w-[300px] max-w-full">
                                    <UserPickerField
                                        compact
                                        clearable
                                        people={users}
                                        value={guestId}
                                        onChange={setGuestId}
                                        onClear={() => setGuestId(null)}
                                        placeholder={t("meetings.agenda.inviteEmployee")}
                                        modalTitle={t("meetings.agenda.guestModalTitle")}
                                        searchPlaceholder={t("meetings.agenda.searchByName")}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void run(async () => {
                                        await agendaService.addGuest(item.id, guestId as number);
                                        setGuestId(null);
                                    }, "meetings.toast.guestAdded")}
                                    disabled={busy || guestId === null}
                                    className={BTN_SECONDARY}
                                >
                                    <UserPlus className="w-[15px] h-[15px]" strokeWidth={2}/>
                                    {t("meetings.agenda.invite")}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 border-t border-[#f3f6f9] pt-4">
                        <div className={BLOCK_TITLE}>{t("meetings.agenda.main")}</div>

                        {canEdit ? (
                            <div className="flex flex-col gap-3.5">
                                <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-x-[18px] gap-y-3.5">
                                    <div className="min-w-0">
                                        <span className={FIELD_LABEL}>{t("meetings.agenda.protocolNumber")}</span>
                                        <input
                                            value={edit.protocolNumber}
                                            onChange={e => setEdit({...edit, protocolNumber: e.target.value})}
                                            placeholder={t("meetings.agenda.protocolNumberPlaceholder")}
                                            className={TEXT_INPUT}
                                        />
                                    </div>
                                    {userField(t("meetings.agenda.speaker"), "speakerUserId")}
                                    {userField(t("meetings.agenda.speakerHead"), "speakerHeadUserId")}
                                    {userField(t("meetings.agenda.deputySecretary"), "deputySecretaryUserId")}
                                    {userField(t("meetings.agenda.controller"), "controllerUserId")}
                                    <div className="min-w-0">
                                        <span className={FIELD_LABEL}>{t("meetings.agenda.documents")}</span>
                                        <input
                                            value={edit.documentsUrl}
                                            onChange={e => setEdit({...edit, documentsUrl: e.target.value})}
                                            placeholder={t("meetings.agenda.documentsPlaceholder")}
                                            className={TEXT_INPUT}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <span className={FIELD_LABEL}>{t("meetings.agenda.decision")}</span>
                                    <textarea
                                        value={edit.decision}
                                        onChange={e => setEdit({...edit, decision: e.target.value})}
                                        placeholder={t("meetings.agenda.decision")}
                                        rows={3}
                                        className={TEXTAREA}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button type="button" onClick={() => void save()} disabled={busy}
                                            className={BTN_PRIMARY}>
                                        {t("meetings.agenda.save")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-x-[18px] gap-y-3">
                                <Field label={t("meetings.agenda.speaker")} value={item.speakerName}/>
                                <Field label={t("meetings.agenda.speakerHead")} value={item.speakerHeadName}/>
                                <Field label={t("meetings.agenda.speakerUnit")} value={item.speakerUnitTitle}/>
                                <Field label={t("meetings.agenda.controller")} value={item.controllerName}/>
                                <div className="[grid-column:1/-1]">
                                    <Field label={t("meetings.agenda.decision")} value={item.decision}/>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 border-t border-[#f3f6f9] pt-4">
                        <div className={BLOCK_TITLE}>{t("meetings.agenda.assignmentsTitle")}</div>

                        <div className="flex flex-col gap-2">
                            {item.assignments.map(a => (
                                <div
                                    key={a.id}
                                    className={`rounded-xl border px-3.5 py-3 ${
                                        a.isOverdue ? "border-[#f2c9c2] bg-[#fdf6f5]" : "border-[#eef2f7] bg-[#fafbfd]"
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <span className="text-[13px] font-semibold text-[#1c2740]">{a.userName}</span>
                                        {a.orgUnitTitle && (
                                            <span className="text-[11.5px] text-[#8b97ab]">{a.orgUnitTitle}</span>
                                        )}
                                        <Badge tone={a.isOverdue ? "bad" : STATUS_TONE[a.status]}>{t(`meetings.executionStatus.${a.status}`)}</Badge>
                                        <div className="flex-1"/>

                                        {(canReport || canEdit) && (
                                            <SelectDropdown
                                                options={statusSelectOptions}
                                                value=""
                                                onChange={value => {
                                                    setReporting({assignmentId: a.id, status: value as ExecutionStatus});
                                                    setReportText("");
                                                }}
                                                placeholder={t("meetings.agenda.changeStatus")}
                                                minWidth="220px"
                                            />
                                        )}

                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => void run(() => agendaService.removeAssignment(a.id), "meetings.toast.assignmentRemoved")}
                                                disabled={busy}
                                                className={BTN_SMALL}
                                            >
                                                {t("meetings.agenda.remove")}
                                            </button>
                                        )}
                                    </div>

                                    {a.text && (
                                        <div className="mt-1.5 text-[12.5px] text-[#26324a]">{a.text}</div>
                                    )}

                                    <div className={`mt-1.5 text-[11.5px] ${a.isOverdue ? "font-semibold text-[#c0392b]" : "text-[#8b97ab]"}`}>
                                        {dueLine(a, t)}
                                    </div>

                                    {a.report && (
                                        <div className="mt-2 rounded-lg bg-white px-3 py-2 text-[12.5px] text-[#26324a]">
                                            {a.report}
                                            {a.reportedAt && (
                                                <span className="text-[#8b97ab]">
                                                    {" "}· {new Date(a.reportedAt).toLocaleDateString("ru-RU")}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {reporting?.assignmentId === a.id && (
                                        <div className="mt-3 rounded-xl border border-[#e5e9f0] bg-white p-3">
                                            <div className="mb-2 flex items-center gap-2 text-[12.5px] text-[#55617a]">
                                                {t("meetings.agenda.newStatus")}
                                                <Badge tone={STATUS_TONE[reporting.status]}>
                                                    {t(`meetings.executionStatus.${reporting.status}`)}
                                                </Badge>
                                            </div>
                                            <textarea
                                                autoFocus
                                                value={reportText}
                                                onChange={e => setReportText(e.target.value)}
                                                placeholder={t("meetings.agenda.reportPlaceholder")}
                                                rows={3}
                                                className={TEXTAREA}
                                            />
                                            <div className="mt-2.5 flex justify-end gap-2">
                                                <button type="button" onClick={() => setReporting(null)}
                                                        className={BTN_SECONDARY}>
                                                    {t("meetings.agenda.cancel")}
                                                </button>
                                                <button type="button" onClick={() => void sendReport()} disabled={busy}
                                                        className={BTN_PRIMARY}>
                                                    {t("meetings.agenda.saveStatus")}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {item.assignments.length === 0 && (
                            <div className="text-[12.5px] text-[#a3adbd]">{t("meetings.agenda.noAssignments")}</div>
                        )}

                        {canEdit && (
                            <div className="mt-3 grid items-end gap-2.5 [grid-template-columns:minmax(240px,300px)_minmax(220px,1fr)_170px_auto]">
                                <div className="min-w-0">
                                    <span className={FIELD_LABEL}>{t("meetings.agenda.responsible")}</span>
                                    <UserPickerField
                                        compact
                                        clearable
                                        people={users}
                                        value={assignee.userId}
                                        onChange={id => setAssignee({...assignee, userId: id})}
                                        onClear={() => setAssignee({...assignee, userId: null})}
                                        placeholder={t("meetings.agenda.notSelected")}
                                        modalTitle={t("meetings.agenda.responsible")}
                                        searchPlaceholder={t("meetings.agenda.searchByName")}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <span className={FIELD_LABEL}>{t("meetings.agenda.whatAssigned")}</span>
                                    <input
                                        value={assignee.text}
                                        onChange={e => setAssignee({...assignee, text: e.target.value})}
                                        placeholder={t("meetings.agenda.whatAssignedPlaceholder")}
                                        className={TEXT_INPUT}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <span className={FIELD_LABEL}>{t("meetings.agenda.dueDate")}</span>
                                    <DatePickerInput
                                        value={assignee.dueDate}
                                        onChange={dueDate => setAssignee({...assignee, dueDate})}
                                        placeholder={t("meetings.agenda.dueDatePlaceholder")}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void run(async () => {
                                        await agendaService.addAssignment(item.id, {
                                            userId: assignee.userId as number,
                                            text: assignee.text.trim() || undefined,
                                            dueDate: parseDDMMYYYYToISO(assignee.dueDate) || undefined,
                                        });
                                        setAssignee({userId: null, text: "", dueDate: ""});
                                    }, "meetings.toast.assignmentAdded")}
                                    disabled={busy || assignee.userId === null}
                                    className={BTN_SECONDARY}
                                >
                                    {t("meetings.agenda.assign")}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 border-t border-[#f3f6f9] pt-4">
                        <div className={BLOCK_TITLE}>{t("meetings.agenda.files")}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {item.files.map(f => (
                                <span key={f.id}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f5f9] py-[3px] pl-[10px] pr-[6px] text-[12px] font-medium">
                                    <a href={agendaService.fileUrl(f.id)}
                                       className="text-[#4e57d6] no-underline hover:underline">
                                        {f.fileName}
                                    </a>
                                    <span className="font-normal text-[#8b97ab]">· {t(`meetings.fileKinds.${f.kind}`)}</span>
                                    {f.canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => void run(() => agendaService.detach(f.id), "meetings.toast.fileRemoved")}
                                            disabled={busy}
                                            className="grid h-4 w-4 flex-none place-items-center rounded-full border-none bg-transparent text-[#8b97ab] cursor-pointer hover:bg-[#e5e9f0] hover:text-[#55617a]"
                                        >
                                            <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                                        </button>
                                    )}
                                </span>
                            ))}
                            {item.files.length === 0 && <span className="text-[12.5px] text-[#a3adbd]">—</span>}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {canEdit && (
                                <>
                                    <label className={`${BTN_SMALL} !h-8`}>
                                        <Paperclip className="w-[13px] h-[13px]" strokeWidth={2}/>
                                        {t("meetings.fileKinds.Sz")}
                                        <input type="file" onChange={attach("Sz")} className="hidden"/>
                                    </label>
                                    <label className={`${BTN_SMALL} !h-8`}>
                                        <Paperclip className="w-[13px] h-[13px]" strokeWidth={2}/>
                                        {t("meetings.fileKinds.Protocol")}
                                        <input type="file" onChange={attach("Protocol")} className="hidden"/>
                                    </label>
                                </>
                            )}
                            <label className={`${BTN_SMALL} !h-8`}>
                                <Paperclip className="w-[13px] h-[13px]" strokeWidth={2}/>
                                {t("meetings.agenda.attachExecution")}
                                <input type="file" onChange={attach("Execution")} className="hidden"/>
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
function dueLine(a: AgendaAssignment, t: TFunction): string {
    if (!a.dueDate) return t("meetings.agenda.dueNone");

    const due = t("meetings.agenda.due", {date: formatDate(a.dueDate)});
    const isOpen = a.status === "New" || a.status === "InProgress";

    if (!isOpen) return due;
    if (a.isOverdue) {
        return `${due} — ${t("time.overdueBy", {time: t("time.days", {count: -(a.daysLeft ?? 0)})})}`;
    }

    return `${due} · ${t("time.remaining", {time: t("time.days", {count: a.daysLeft ?? 0})})}`;
}

const Field = ({label, value}: {label: string; value: string | null}) => (
    <div className="min-w-0">
        <span className="block text-[11.5px] text-[#8b97ab] mb-[3px]">{label}</span>
        <span className="text-[13px] text-[#1c2740]">{value || "—"}</span>
    </div>
);
