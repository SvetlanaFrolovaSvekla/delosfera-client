import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {Users} from "lucide-react";
import {
    bodyMemberService, type MeetingAttendee,
} from "@/service/meetingsService/bodyMemberService.ts";
import {Badge} from "@/components/componentsGeneral/DataTable.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";

const CARD = "mb-4 rounded-2xl border border-[#eef2f7] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]";
const CARD_TITLE = "flex items-center gap-2 text-[12px] font-bold uppercase tracking-[.04em] text-[#2d354a]";

/**
 * Явка на заседании.
 *
 * Кворум считается по присутствовавшим, и протокол начинается со списка: кто был,
 * кто отсутствовал и почему. Присутствие стоит по умолчанию — секретарь отмечает
 * только тех, кто не пришёл, а не щёлкает по всему составу.
 */
export function MeetingAttendancePanel({meetingId, canEdit}: {meetingId: number; canEdit: boolean}) {
    const {t} = useTranslation();
    const [rows, setRows] = useState<MeetingAttendee[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<Record<number, string>>({});

    const load = useCallback(async () => {
        try {
            setRows(await bodyMemberService.attendance(meetingId));
            setError(null);
        } catch {
            setError(t("meetings.attendance.loadError"));
        }
    }, [meetingId, t]);

    useEffect(() => { void load(); }, [load]);

    if (rows.length === 0) {
        return (
            <section className={CARD}>
                <div className={`${CARD_TITLE} mb-3`}>
                    <Users className="w-4 h-4" strokeWidth={2}/>
                    {t("meetings.attendance.membersTitle")}
                </div>
                <div className="text-[13px] text-[#8b97ab]">
                    {error ?? t("meetings.attendance.noMembers")}
                </div>
            </section>
        );
    }

    const presentCount = rows.filter(r => r.present).length;

    const mark = async (userId: number, present: boolean) => {
        setBusy(true);
        setError(null);
        try {
            setRows(await bodyMemberService.markAttendance(
                meetingId, userId, present, present ? null : note[userId]?.trim() || null));
            toast.success(t(present ? "meetings.toast.markedPresent" : "meetings.toast.markedAbsent"), undefined, 2500);
        } catch {
            setError(t("meetings.attendance.markError"));
            toast.error(t("meetings.attendance.markError"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className={CARD}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className={CARD_TITLE}>
                    <Users className="w-4 h-4" strokeWidth={2}/>
                    {t("meetings.attendance.title")}
                </div>
                <Badge tone={presentCount === rows.length ? "good" : "info"}>
                    {t("meetings.attendance.presentCount", {present: presentCount, total: rows.length})}
                </Badge>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] bg-[#fbeae7] px-3 py-2 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="flex flex-col">
                {rows.map(r => (
                    <div
                        key={r.userId}
                        className="flex flex-wrap items-center gap-3 border-b border-[#f3f6f9] py-2.5 last:border-b-0"
                    >
                        <div className="min-w-[220px] flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-[#1c2740]">
                                {r.userName}
                                {r.role === "Chairman" && <Badge tone="info">{t("meetings.attendance.chairman")}</Badge>}
                                {r.role === "Secretary" && <Badge>{t("meetings.attendance.secretary")}</Badge>}
                            </div>
                            <div className="text-[12px] text-[#8b97ab]">
                                {r.position ?? t("meetings.attendance.noPosition")}
                            </div>
                        </div>

                        {!r.present && (
                            <input
                                value={note[r.userId] ?? r.note ?? ""}
                                onChange={e => setNote(n => ({...n, [r.userId]: e.target.value}))}
                                onBlur={() => { if (canEdit) void mark(r.userId, false); }}
                                placeholder={t("meetings.attendance.absenceReason")}
                                disabled={!canEdit || busy}
                                className="h-9 min-w-[200px] flex-1 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#1c2740] outline-none placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc] disabled:opacity-60"
                            />
                        )}

                        {canEdit ? (
                            <PlainCheckbox
                                checked={r.present}
                                disabled={busy}
                                onChange={present => void mark(r.userId, present)}
                                className="font-semibold"
                            >
                                {t("meetings.attendance.present")}
                            </PlainCheckbox>
                        ) : (
                            <Badge tone={r.present ? "good" : "warn"}>
                                {r.present ? t("meetings.attendance.present") : (r.note ? t("meetings.attendance.absentWithNote", {note: r.note}) : t("meetings.attendance.absent"))}
                            </Badge>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
