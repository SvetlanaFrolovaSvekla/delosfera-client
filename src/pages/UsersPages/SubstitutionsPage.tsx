import {useCallback, useEffect, useMemo, useState} from "react";
import {
    substitutionService,
    type Substitution,
} from "@/service/dashboardService/dashboardService.ts";
import {userService} from "@/service/userService/userService.ts";
import {formatDate} from "@/utils/dateUtils.ts";

/**
 * Замещения (GEN-14).
 *
 * Пока сотрудник в отпуске или на больничном, его задачи должен кто-то закрывать —
 * иначе согласование встаёт до его возвращения. Замещающий выносит резолюции от
 * своего имени, но по задачам замещаемого: движок это уже учитывает, а управлять
 * замещениями было негде.
 *
 * Отменённые из списка не пропадают: важно, кто и в какие дни имел право решать
 * за другого, — задним числом это восстановить неоткуда.
 */

interface Пользователь {
    id: number;
    fullName: string;
}

const сегодня = () => new Date().toISOString().slice(0, 10);

export function SubstitutionsPage() {
    const [список, setСписок] = useState<Substitution[]>([]);
    const [люди, setЛюди] = useState<Пользователь[]>([]);
    const [загрузка, setЗагрузка] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);
    const [занято, setЗанято] = useState(false);
    const [показатьОтменённые, setПоказатьОтменённые] = useState(false);

    const [форма, setФорма] = useState({
        userId: 0,
        substituteUserId: 0,
        startsOn: сегодня(),
        endsOn: сегодня(),
        reason: "",
    });

    const загрузить = useCallback(async () => {
        try {
            setСписок(await substitutionService.list(false));
        } catch {
            setОшибка("Не удалось загрузить замещения");
        } finally {
            setЗагрузка(false);
        }
    }, []);

    useEffect(() => {
        void загрузить();
        userService.getAll()
            .then((list) => setЛюди(list.map((u) => ({id: u.id, fullName: u.fullName}))))
            .catch(() => undefined);
    }, [загрузить]);

    const видимые = useMemo(
        () => (показатьОтменённые ? список : список.filter((s) => !s.isCancelled)),
        [список, показатьОтменённые],
    );

    const проблемаФормы = (() => {
        if (!форма.userId || !форма.substituteUserId) return "Выберите, кого и кто замещает";
        if (форма.userId === форма.substituteUserId) return "Человек не может замещать сам себя";
        if (форма.endsOn < форма.startsOn) return "Дата окончания раньше даты начала";
        return null;
    })();

    const создать = async () => {
        if (проблемаФормы) return;
        try {
            setЗанято(true);
            setОшибка(null);
            await substitutionService.create({
                userId: форма.userId,
                substituteUserId: форма.substituteUserId,
                startsOn: форма.startsOn,
                endsOn: форма.endsOn,
                reason: форма.reason.trim() || undefined,
            });
            setФорма({...форма, userId: 0, substituteUserId: 0, reason: ""});
            await загрузить();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setОшибка(message ?? "Не удалось оформить замещение");
        } finally {
            setЗанято(false);
        }
    };

    const отменить = async (s: Substitution) => {
        if (!window.confirm(
            `Отменить замещение? ${s.substituteUserName} перестанет видеть задачи `
            + `${s.userName} с этой минуты.`)) return;
        try {
            setЗанято(true);
            setОшибка(null);
            await substitutionService.cancel(s.id);
            await загрузить();
        } catch {
            setОшибка("Не удалось отменить замещение");
        } finally {
            setЗанято(false);
        }
    };

    if (загрузка) return null;

    return (
        <div className="flex flex-col gap-4 p-[22px_26px] max-w-[1080px]">
            <div>
                <div className="text-[12.5px] text-[#8b97ab]">Администрирование</div>
                <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">Замещения</h1>
                <p className="m-0 mt-1.5 max-w-[70ch] text-[13px] leading-[1.7] text-[#55617a]">
                    Пока сотрудник в отпуске или на больничном, замещающий видит его задачи
                    согласования и выносит по ним решения от своего имени. Замещение
                    действует только в указанные дни.
                </p>
            </div>

            {ошибка && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}

            <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <h2 className="m-0 mb-3 text-[15px] font-semibold">Оформить замещение</h2>

                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Кого замещают</span>
                        <select
                            className="h-10 w-[240px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                            value={форма.userId}
                            onChange={(e) => setФорма({...форма, userId: Number(e.target.value)})}
                        >
                            <option value={0}>— сотрудник —</option>
                            {люди.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Кто замещает</span>
                        <select
                            className="h-10 w-[240px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                            value={форма.substituteUserId}
                            onChange={(e) => setФорма({...форма, substituteUserId: Number(e.target.value)})}
                        >
                            <option value={0}>— замещающий —</option>
                            {люди.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">С</span>
                        <input
                            type="date"
                            className="h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                            value={форма.startsOn}
                            onChange={(e) => setФорма({...форма, startsOn: e.target.value})}
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">По</span>
                        <input
                            type="date"
                            className="h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                            min={форма.startsOn}
                            value={форма.endsOn}
                            onChange={(e) => setФорма({...форма, endsOn: e.target.value})}
                        />
                    </label>

                    <label className="flex flex-1 min-w-[220px] flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Основание</span>
                        <input
                            className="h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                            placeholder="отпуск, больничный, командировка"
                            value={форма.reason}
                            onChange={(e) => setФорма({...форма, reason: e.target.value})}
                        />
                    </label>

                    <button
                        onClick={создать}
                        disabled={занято || !!проблемаФормы}
                        className="h-10 rounded-[10px] border-none bg-[#2f68f5] px-5 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                        Оформить
                    </button>
                </div>

                {проблемаФормы && (
                    <div className="mt-2 text-[11.5px] text-[#8b97ab]">{проблемаФормы}</div>
                )}
            </section>

            <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="m-0 text-[15px] font-semibold">
                        Оформленные замещения · {видимые.length}
                    </h2>
                    <label className="flex items-center gap-2 text-[12.5px] text-[#55617a]">
                        <input
                            type="checkbox"
                            checked={показатьОтменённые}
                            onChange={(e) => setПоказатьОтменённые(e.target.checked)}
                            style={{accentColor: "#2f68f5"}}
                        />
                        показывать отменённые
                    </label>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-[#f6f8fb] text-left text-[#55617a]">
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Кого замещают</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Замещающий</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Период</th>
                                <th className="px-3 py-2.5 font-semibold">Основание</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Состояние</th>
                                <th className="px-3 py-2.5"/>
                            </tr>
                        </thead>
                        <tbody>
                            {видимые.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-6 text-center text-[#8b97ab]">
                                        Замещения не оформлялись
                                    </td>
                                </tr>
                            ) : видимые.map((s) => (
                                <tr key={s.id} className="border-t border-[#eef2f7] align-top">
                                    <td className="px-3 py-2.5 text-[#26324a]">{s.userName}</td>
                                    <td className="px-3 py-2.5 text-[#26324a]">{s.substituteUserName}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5">
                                        {formatDate(s.startsOn)} — {formatDate(s.endsOn)}
                                    </td>
                                    <td className="px-3 py-2.5 text-[#55617a]">{s.reason ?? "—"}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5">
                                        {s.isCancelled ? (
                                            <span className="text-[#c0392b]">отменено</span>
                                        ) : s.isActive ? (
                                            <span className="font-semibold text-[#1c7a4d]">действует</span>
                                        ) : (
                                            <span className="text-[#8b97ab]">вне периода</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        {!s.isCancelled && (
                                            <button
                                                onClick={() => отменить(s)}
                                                disabled={занято}
                                                className="border-none bg-transparent p-0 text-[12px] text-[#c0392b] underline"
                                            >
                                                отменить
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
