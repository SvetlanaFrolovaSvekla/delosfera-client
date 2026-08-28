import {useCallback, useEffect, useState} from "react";
import {
    szStatisticsService,
    type SzStatistics,
    type SzStatisticsCell,
} from "@/service/szService/szStatisticsService.ts";
import {szService, type SzKind} from "@/service/szService/szService.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";

/**
 * Аналитика служебных записок.
 *
 * Сводка отвечает на три вопроса делопроизводства: сколько записок в работе,
 * сколько просрочено и кто именно не укладывается в срок. Поэтому разрезы —
 * по подразделениям, видам и месяцам, а просрочка вынесена отдельной колонкой:
 * она и есть повод для разговора.
 */

const пусто: SzStatisticsCell = {total: 0, inWork: 0, overdue: 0, executed: 0, other: 0};

function Разрез({заголовок, строки}: { заголовок: string; строки: Record<string, SzStatisticsCell> }) {
    const записи = Object.entries(строки).sort((a, b) => b[1].total - a[1].total);

    return (
        <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 mb-3 text-[15px] font-semibold">{заголовок}</h2>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-[#f6f8fb] text-left text-[#55617a]">
                            <th className="px-3 py-2.5 font-semibold">Наименование</th>
                            <th className="w-[90px] px-3 py-2.5 text-right font-semibold">Всего</th>
                            <th className="w-[110px] px-3 py-2.5 text-right font-semibold">В работе</th>
                            <th className="w-[110px] px-3 py-2.5 text-right font-semibold">Просрочено</th>
                            <th className="w-[110px] px-3 py-2.5 text-right font-semibold">Исполнено</th>
                        </tr>
                    </thead>
                    <tbody>
                        {записи.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-5 text-center text-[#8b97ab]">
                                    За выбранный период записок нет
                                </td>
                            </tr>
                        ) : записи.map(([имя, я]) => (
                            <tr key={имя} className="border-t border-[#eef2f7]">
                                <td className="px-3 py-2.5 text-[#26324a]">{имя}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{я.total}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{я.inWork}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums ${
                                    я.overdue > 0 ? "font-semibold text-[#c0392b]" : "text-[#8b97ab]"}`}>
                                    {я.overdue}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{я.executed}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/** embedded — страница показывается вкладкой раздела «Аналитика», без своей шапки. */
export function SzStatisticsPage({embedded}: {embedded?: boolean} = {}) {
    const {orgUnits} = useDictionaries();
    const [виды, setВиды] = useState<SzKind[]>([]);
    const [сводка, setСводка] = useState<SzStatistics | null>(null);
    const [занято, setЗанято] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const [фильтр, setФильтр] = useState<{from: string; to: string; orgUnitId: number; kindId: number}>({
        from: "", to: "", orgUnitId: 0, kindId: 0,
    });

    const запрос = useCallback(() => ({
        from: фильтр.from || undefined,
        to: фильтр.to || undefined,
        orgUnitId: фильтр.orgUnitId || undefined,
        kindId: фильтр.kindId || undefined,
    }), [фильтр]);

    const загрузить = useCallback(async () => {
        try {
            setЗанято(true);
            setОшибка(null);
            setСводка(await szStatisticsService.get(запрос()));
        } catch {
            setОшибка("Не удалось построить сводку");
        } finally {
            setЗанято(false);
        }
    }, [запрос]);

    useEffect(() => { void загрузить(); }, [загрузить]);

    useEffect(() => {
        szService.kinds().then(setВиды).catch(() => undefined);
    }, []);

    const выгрузить = async () => {
        try {
            setОшибка(null);
            await szStatisticsService.export(запрос());
        } catch {
            setОшибка("Не удалось выгрузить книгу Excel");
        }
    };

    const итог = сводка ?? {...пусто, from: null, to: null, byUnit: {}, byKind: {}, byMonth: {}} as SzStatistics;

    return (
        <div className={embedded
            ? "flex flex-col gap-4 max-w-[1080px]"
            : "flex flex-col gap-4 p-[22px_26px] max-w-[1080px]"}>
            {!embedded && (
                <div>
                    <div className="text-[12.5px] text-[#8b97ab]">Служебные записки</div>
                    <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">Аналитика</h1>
                </div>
            )}

            {ошибка && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}

            <section className="flex flex-wrap items-end gap-3 rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Зарегистрированы с</span>
                    <input type="date" value={фильтр.from}
                           onChange={(e) => setФильтр({...фильтр, from: e.target.value})}
                           className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] outline-none focus:border-[#2f68f5]"/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">по</span>
                    <input type="date" value={фильтр.to} min={фильтр.from || undefined}
                           onChange={(e) => setФильтр({...фильтр, to: e.target.value})}
                           className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] outline-none focus:border-[#2f68f5]"/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Подразделение</span>
                    <select value={фильтр.orgUnitId}
                            onChange={(e) => setФильтр({...фильтр, orgUnitId: Number(e.target.value)})}
                            className="h-10 w-[260px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]">
                        <option value={0}>все</option>
                        {orgUnits.map((u) => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Вид записки</span>
                    <select value={фильтр.kindId}
                            onChange={(e) => setФильтр({...фильтр, kindId: Number(e.target.value)})}
                            className="h-10 w-[200px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]">
                        <option value={0}>все</option>
                        {виды.map((k) => <option key={k.id} value={k.id}>{k.titleRu}</option>)}
                    </select>
                </label>

                <div className="flex-1"/>

                <button onClick={выгрузить} disabled={занято}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#2f68f5] disabled:opacity-50">
                    Выгрузить в Excel
                </button>
            </section>

            <section className="grid gap-[1px] overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-[#e5e9f0]"
                     style={{gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"}}>
                {[
                    {подпись: "Всего записок", значение: итог.total, цвет: "#0f1b2d"},
                    {подпись: "В работе", значение: итог.inWork, цвет: "#2f68f5"},
                    {подпись: "Просрочено", значение: итог.overdue, цвет: итог.overdue > 0 ? "#c0392b" : "#8b97ab"},
                    {подпись: "Исполнено", значение: итог.executed, цвет: "#1c7a4d"},
                    {подпись: "Прочие", значение: итог.other, цвет: "#8b97ab"},
                ].map((к) => (
                    <div key={к.подпись} className="flex flex-col gap-1 bg-white px-4 py-3.5">
                        <span className="text-[27px] font-semibold tabular-nums leading-none" style={{color: к.цвет}}>
                            {к.значение}
                        </span>
                        <span className="text-[12.5px] text-[#8b97ab]">{к.подпись}</span>
                    </div>
                ))}
            </section>

            <Разрез заголовок="По подразделениям" строки={итог.byUnit}/>
            <Разрез заголовок="По видам записок" строки={итог.byKind}/>
            <Разрез заголовок="По месяцам" строки={итог.byMonth}/>

            <p className="max-w-[68ch] text-[12.5px] text-[#8b97ab]">
                «Прочие» — черновики, отозванные и забракованные записки: они ни в работе,
                ни исполнены, и в счёт нагрузки не идут.
            </p>
        </div>
    );
}
