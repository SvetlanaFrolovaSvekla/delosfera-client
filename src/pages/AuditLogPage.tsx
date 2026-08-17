import {useCallback, useEffect, useState} from "react";
import {auditLogService, type AuditFilter, type AuditPage} from "@/service/activityLogService/auditLogService.ts";
import {userService} from "@/service/userService/userService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

/**
 * Журнал действий (Б-10).
 *
 * В отличие от ленты на рабочем столе, здесь виден весь журнал, а не свои записи:
 * он нужен для разбирательства — кто, что и когда сделал. Поэтому отбор по
 * сотруднику, объекту, действию и периоду, а рядом выгрузка: проверяющие работают
 * с файлом, а не с экраном.
 *
 * Подробности показываются как есть, строкой JSON. Разбирать их в человеческий вид
 * значило бы толковать чужие данные и терять то, что в них записано; при
 * разбирательстве важна точность, а не красота.
 */

const ОБЪЕКТЫ: Record<string, string> = {
    Document: "Документ",
    Sz: "Служебная записка",
    Vnd: "ВНД",
    ProcurementRequest: "Заявка на закупку",
    Tender: "Конкурс",
    RouteInstance: "Маршрут",
    Resolution: "Резолюция",
    DocumentAttachment: "Вложение",
    Signature: "Подпись",
    SimpleSignatureRegulation: "Регламент подписи",
    User: "Пользователь",
    Role: "Роль",
    Substitution: "Замещение",
};

export function AuditLogPage() {
    const [страница, setСтраница] = useState<AuditPage | null>(null);
    const [люди, setЛюди] = useState<{id: number; fullName: string}[]>([]);
    const [перечни, setПеречни] = useState<{entityTypes: string[]; actions: string[]}>({entityTypes: [], actions: []});
    const [занято, setЗанято] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const [фильтр, setФильтр] = useState<AuditFilter>({page: 1, pageSize: 50});

    const загрузить = useCallback(async () => {
        try {
            setЗанято(true);
            setОшибка(null);
            setСтраница(await auditLogService.search(фильтр));
        } catch (e) {
            const код = (e as {response?: {status?: number}}).response?.status;
            setОшибка(код === 403
                ? "Журнал доступен тем, кто управляет пользователями"
                : "Не удалось загрузить журнал");
        } finally {
            setЗанято(false);
        }
    }, [фильтр]);

    useEffect(() => { void загрузить(); }, [загрузить]);

    useEffect(() => {
        auditLogService.dictionaries().then(setПеречни).catch(() => undefined);
        userService.getAll()
            .then((l) => setЛюди(l.map((u) => ({id: u.id, fullName: u.fullName}))))
            .catch(() => undefined);
    }, []);

    const менять = (часть: Partial<AuditFilter>) => setФильтр({...фильтр, ...часть, page: 1});

    const выгрузить = async () => {
        try {
            setОшибка(null);
            await auditLogService.export({...фильтр, page: undefined, pageSize: undefined});
        } catch {
            setОшибка("Не удалось выгрузить журнал");
        }
    };

    const всего = страница?.total ?? 0;
    const размер = страница?.pageSize ?? 50;
    const страниц = Math.max(1, Math.ceil(всего / размер));
    const текущая = страница?.page ?? 1;

    const поле = "h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]";

    return (
        <div className="flex flex-col gap-4 p-[22px_26px] max-w-[1240px]">
            <div>
                <div className="text-[12.5px] text-[#8b97ab]">Администрирование</div>
                <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">Журнал действий</h1>
                <p className="m-0 mt-1.5 max-w-[70ch] text-[13px] leading-[1.7] text-[#55617a]">
                    Все действия в системе: кто, что и когда сделал. Записи не изменяются
                    и не удаляются — журнал существует, чтобы на него можно было сослаться.
                </p>
            </div>

            {ошибка && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}

            <section className="flex flex-wrap items-end gap-3 rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">С</span>
                    <input type="datetime-local" className={поле} value={фильтр.from ?? ""}
                           onChange={(e) => менять({from: e.target.value || undefined})}/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">По</span>
                    <input type="datetime-local" className={поле} value={фильтр.to ?? ""}
                           min={фильтр.from} onChange={(e) => менять({to: e.target.value || undefined})}/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Сотрудник</span>
                    <select className={`${поле} w-[230px]`} value={фильтр.userId ?? 0}
                            onChange={(e) => менять({userId: Number(e.target.value) || undefined})}>
                        <option value={0}>все</option>
                        {люди.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Объект</span>
                    <select className={`${поле} w-[200px]`} value={фильтр.entityType ?? ""}
                            onChange={(e) => менять({entityType: e.target.value || undefined})}>
                        <option value="">все</option>
                        {перечни.entityTypes.map((t) => (
                            <option key={t} value={t}>{ОБЪЕКТЫ[t] ?? t}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Действие</span>
                    <select className={`${поле} w-[190px]`} value={фильтр.action ?? ""}
                            onChange={(e) => менять({action: e.target.value || undefined})}>
                        <option value="">все</option>
                        {перечни.actions.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                </label>

                <div className="flex-1"/>

                <button onClick={() => setФильтр({page: 1, pageSize: 50})}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] text-[#55617a]">
                    Сбросить
                </button>
                <button onClick={выгрузить} disabled={занято || всего === 0}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#2f68f5] disabled:opacity-50">
                    Выгрузить CSV
                </button>
            </section>

            <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="m-0 text-[15px] font-semibold">
                        Записей: {всего.toLocaleString("ru-RU")}
                    </h2>
                    {страниц > 1 && (
                        <div className="flex items-center gap-2 text-[12.5px] text-[#55617a]">
                            <button disabled={текущая <= 1 || занято}
                                    onClick={() => setФильтр({...фильтр, page: текущая - 1})}
                                    className="h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 disabled:opacity-40">
                                назад
                            </button>
                            <span>{текущая} из {страниц}</span>
                            <button disabled={текущая >= страниц || занято}
                                    onClick={() => setФильтр({...фильтр, page: текущая + 1})}
                                    className="h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 disabled:opacity-40">
                                вперёд
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-[#f6f8fb] text-left text-[#55617a]">
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Когда</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Кто</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Объект</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Действие</th>
                                <th className="px-3 py-2.5 font-semibold">Подробности</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(страница?.items.length ?? 0) === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-[#8b97ab]">
                                        {занято ? "Загрузка…" : "По этому отбору записей нет"}
                                    </td>
                                </tr>
                            ) : страница!.items.map((з) => (
                                <tr key={з.id} className="border-t border-[#eef2f7] align-top">
                                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#55617a]">
                                        {formatDateTime(з.at)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-[#26324a]">
                                        {з.userName ?? <span className="text-[#8b97ab]">система</span>}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5">
                                        {ОБЪЕКТЫ[з.entityType] ?? з.entityType}
                                        <span className="text-[#a3adbd]"> #{з.entityId}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-[#26324a]">{з.actionText}</td>
                                    <td className="px-3 py-2.5 font-mono text-[11.5px] leading-[1.5] text-[#8b97ab]"
                                        style={{wordBreak: "break-word"}}>
                                        {з.payload ?? "—"}
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
