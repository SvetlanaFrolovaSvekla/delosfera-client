import {useCallback, useEffect, useState} from "react";
import {colors} from "@/design/tokens";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {szPaperService, type SzOriginal} from "@/service/szService/szPaperService.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

interface Props {
    szId: number;
    /** Признак носителя с карточки: у электронной записки оригинала нет. */
    isPaperCarrier: boolean;
}

/**
 * Контроль бумажного оригинала (SZ-PAP): кому выдан, к какой дате ждут обратно,
 * где лежит. Пока оригинал на руках, выдать его второй раз нельзя.
 */
export function SzOriginalPanel({szId, isPaperCarrier}: Props) {
    const [original, setOriginal] = useState<SzOriginal | null>(null);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [holderId, setHolderId] = useState(0);
    const [dueBackOn, setDueBackOn] = useState("");
    const [location, setLocation] = useState("");

    const load = useCallback(async () => {
        try {
            setOriginal(await szPaperService.original(szId));
        } catch {
            setError("Не удалось загрузить состояние оригинала");
        }
    }, [szId]);

    useEffect(() => {
        if (isPaperCarrier) void load();
    }, [isPaperCarrier, load]);

    useEffect(() => {
        userService.getAll().then(setUsers).catch(() => setUsers([]));
    }, []);

    // Электронная записка бумажного оригинала не имеет — панель не нужна.
    if (!isPaperCarrier) return null;

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(message ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const handOver = () => {
        if (!holderId) { setError("Выберите, кому выдан оригинал"); return; }
        void run(async () => {
            await szPaperService.handOver(szId, {
                holderUserId: holderId,
                dueBackOn: dueBackOn || null,
                location: location.trim() || null,
            });
            setFormOpen(false);
            setHolderId(0);
            setDueBackOn("");
            setLocation("");
        }, "Не удалось зафиксировать выдачу оригинала");
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="m-0 text-[15px] font-semibold">Бумажный оригинал</h2>
                <span className="text-[12.5px] font-semibold"
                      style={{color: original?.isOverdue
                          ? colors.ryg.red.fg
                          : original?.isOut ? colors.ryg.amber.fg : colors.inkSubtle}}>
                    {original?.isOut
                        ? (original.isOverdue ? "Возврат просрочен" : "На руках")
                        : "В деле"}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {original?.isOut ? (
                <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px]">
                    <div className="text-[#1c2740]">
                        Выдан: {original.holderName ?? "—"}
                        <span className="text-[#8b97ab]"> · {formatDate(original.handedAt)}</span>
                    </div>
                    {original.location && (
                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">Место хранения: {original.location}</div>
                    )}
                    <div className="mt-0.5 text-[12.5px]"
                         style={{color: original.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                        Вернуть до: {original.dueBackOn ? new Date(original.dueBackOn).toLocaleDateString("ru-RU") : "срок не задан"}
                        {original.daysLeft != null && (
                            original.isOverdue
                                ? ` · просрочка ${Math.abs(original.daysLeft)} дн`
                                : ` · осталось ${original.daysLeft} дн`
                        )}
                    </div>
                    <button
                        onClick={() => run(() => szPaperService.returnOriginal(szId), "Не удалось принять оригинал")}
                        disabled={busy}
                        className="mt-2.5 h-9 px-4 rounded-[9px] border-none bg-[#1c7a4d] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        Принять возврат
                    </button>
                </div>
            ) : (
                <div className="text-[13px] text-[#8b97ab]">
                    {original && original.handoverCount > 0
                        ? `Оригинал в деле. Выдавался ${original.handoverCount} раз(а), последний возврат ${formatDate(original.returnedAt)}.`
                        : "Оригинал в деле, на руки не выдавался."}
                </div>
            )}

            {!original?.isOut && (
                <button
                    onClick={() => setFormOpen((v) => !v)}
                    className="mt-3 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                >
                    Выдать оригинал
                </button>
            )}

            {formOpen && !original?.isOut && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <div className="flex flex-wrap gap-2">
                        <select value={holderId} onChange={(e) => setHolderId(Number(e.target.value))}
                                className={`${inputClass} w-[240px]`}>
                            <option value={0}>Кому выдан…</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                        <input type="date" value={dueBackOn} onChange={(e) => setDueBackOn(e.target.value)}
                               className={`${inputClass} w-[170px]`} title="Дата возврата"/>
                        <input value={location} onChange={(e) => setLocation(e.target.value)}
                               placeholder="Где будет лежать оригинал"
                               className={`${inputClass} flex-1 min-w-[220px]`}/>
                    </div>
                    <button
                        onClick={handOver}
                        disabled={busy}
                        className="mt-2.5 h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        Зафиксировать выдачу
                    </button>
                </div>
            )}
        </div>
    );
}
