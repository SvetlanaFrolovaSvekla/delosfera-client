import {useCallback, useEffect, useState} from "react";
import {
    bodyMemberService, type MeetingAttendee,
} from "@/service/meetingsService/bodyMemberService.ts";

/**
 * Явка на заседании.
 *
 * Кворум считается по присутствовавшим, и протокол начинается со списка: кто был,
 * кто отсутствовал и почему. Присутствие стоит по умолчанию — секретарь отмечает
 * только тех, кто не пришёл, а не щёлкает по всему составу.
 */
export function MeetingAttendancePanel({meetingId, canEdit}: {meetingId: number; canEdit: boolean}) {
    const [rows, setRows] = useState<MeetingAttendee[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<Record<number, string>>({});

    const load = useCallback(async () => {
        try {
            setRows(await bodyMemberService.attendance(meetingId));
            setError(null);
        } catch {
            setError("Не удалось загрузить состав органа");
        }
    }, [meetingId]);

    useEffect(() => { void load(); }, [load]);

    if (rows.length === 0) {
        return (
            <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd] mb-2">
                    Состав органа
                </div>
                <div className="text-[13px] text-[#8b97ab]">
                    {error ?? "Состав органа не заведён — заполните его в справочниках."}
                </div>
            </section>
        );
    }

    const пришли = rows.filter(r => r.present).length;

    const mark = async (userId: number, present: boolean) => {
        setBusy(true);
        setError(null);
        try {
            setRows(await bodyMemberService.markAttendance(
                meetingId, userId, present, present ? null : note[userId]?.trim() || null));
        } catch {
            setError("Не удалось отметить явку");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                    Состав органа и явка
                </div>
                <span className="text-[12.5px] text-[#55617a]">
                    присутствуют {пришли} из {rows.length}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[9px] border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2 text-[13px] text-[#a94442]">
                    {error}
                </div>
            )}

            <div className="flex flex-col">
                {rows.map(r => (
                    <div
                        key={r.userId}
                        className="flex flex-wrap items-center gap-3 border-b border-[#f4f6f9] py-2.5 last:border-b-0"
                    >
                        <div className="min-w-[220px] flex-1">
                            <div className="text-[13.5px] text-[#0f1b2d]">
                                {r.userName}
                                {r.role === "Chairman" && (
                                    <span className="ml-2 rounded-[5px] bg-[#eef3ff] px-2 py-0.5 text-[10.5px] font-semibold text-[#2f68f5]">
                                        председатель
                                    </span>
                                )}
                                {r.role === "Secretary" && (
                                    <span className="ml-2 rounded-[5px] bg-[#eef2f7] px-2 py-0.5 text-[10.5px] text-[#5b6b85]">
                                        секретарь
                                    </span>
                                )}
                            </div>
                            <div className="text-[12px] text-[#8b97ab]">
                                {r.position ?? "должность не указана"}
                            </div>
                        </div>

                        {!r.present && (
                            <input
                                value={note[r.userId] ?? r.note ?? ""}
                                onChange={e => setNote(n => ({...n, [r.userId]: e.target.value}))}
                                onBlur={() => { if (canEdit) void mark(r.userId, false); }}
                                placeholder="Причина отсутствия"
                                disabled={!canEdit || busy}
                                className="h-8 min-w-[200px] flex-1 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[12.5px] outline-none focus:border-[#2f68f5]"
                            />
                        )}

                        {canEdit ? (
                            <button
                                disabled={busy}
                                onClick={() => void mark(r.userId, !r.present)}
                                className={`h-8 rounded-[8px] border px-3 text-[12.5px] font-semibold cursor-pointer ${
                                    r.present
                                        ? "border-[#c9e6d5] bg-[#eef8f2] text-[#1c7a4d] hover:brightness-[.98]"
                                        : "border-[#e6d3b8] bg-[#fdf6e6] text-[#8a6d1f] hover:brightness-[.98]"
                                }`}
                            >
                                {r.present ? "Присутствовал" : "Отсутствовал"}
                            </button>
                        ) : (
                            <span className={`text-[12.5px] font-semibold ${r.present ? "text-[#1c7a4d]" : "text-[#8a6d1f]"}`}>
                                {r.present ? "Присутствовал" : `Отсутствовал${r.note ? ` · ${r.note}` : ""}`}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
