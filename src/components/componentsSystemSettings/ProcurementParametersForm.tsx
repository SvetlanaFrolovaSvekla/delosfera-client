import {useCallback, useEffect, useState} from "react";
import {apiClient} from "@/service/apiClient.ts";

/**
 * Параметры контура закупок.
 *
 * Пороги Положения и ссылка на само Положение задаются здесь, а не запросом к базе.
 * Рядом со значением — основание: величины принимаются решением Правления или
 * берутся из отчётности, и при приёмке должно быть видно, откуда взята цифра.
 */

interface Параметр {
    id: number;
    code: string;
    titleRu: string;
    value: number;
    unit: string;
    sourceNote: string | null;
    updatedAt: string;
}

export const ProcurementParametersForm = () => {
    const [список, setСписок] = useState<Параметр[]>([]);
    const [правки, setПравки] = useState<Record<number, {value: string; note: string}>>({});
    const [занято, setЗанято] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);
    const [готово, setГотово] = useState<string | null>(null);

    const загрузить = useCallback(async () => {
        try {
            const {data} = await apiClient.get<Параметр[]>("/procurement/parameters");
            setСписок(data);
            setПравки(Object.fromEntries(data.map((p) => [p.id, {
                value: String(p.value),
                note: p.sourceNote ?? "",
            }])));
        } catch {
            setОшибка("Не удалось загрузить параметры закупок");
        }
    }, []);

    useEffect(() => { void загрузить(); }, [загрузить]);

    const сохранить = async (p: Параметр) => {
        const правка = правки[p.id];
        const значение = Number(правка.value.replace(",", "."));

        if (!Number.isFinite(значение) || значение < 0) {
            setОшибка(`«${p.titleRu}»: значение должно быть числом не меньше нуля`);
            return;
        }

        try {
            setЗанято(true);
            setОшибка(null);
            setГотово(null);
            await apiClient.put(`/procurement/parameters/${p.id}`, {
                value: значение,
                sourceNote: правка.note.trim() || null,
            });
            setГотово(`Сохранено: ${p.titleRu}`);
            await загрузить();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось сохранить параметр");
        } finally {
            setЗанято(false);
        }
    };

    const изменён = (p: Параметр) =>
        правки[p.id] && (
            Number(правки[p.id].value.replace(",", ".")) !== p.value ||
            правки[p.id].note !== (p.sourceNote ?? "")
        );

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 text-[15px] font-semibold">Параметры закупок</h2>
            <p className="m-0 mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.7] text-[#8b97ab]">
                Пороги, от которых Матрица полномочий выбирает способ закупки и орган
                утверждения. Изменение попадает в журнал действий.
            </p>

            {ошибка && (
                <div className="mt-3 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2 text-[12.5px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}
            {готово && (
                <div className="mt-3 rounded-[9px] border border-[#cfe3d6] bg-[#f2f9f5] px-3 py-2 text-[12.5px] text-[#1c7a4d]">
                    {готово}
                </div>
            )}

            <div className="mt-4 flex flex-col gap-3">
                {список.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-end gap-3 border-t border-[#eef2f7] pt-3 first:border-t-0 first:pt-0">
                        <div className="min-w-[240px] flex-1">
                            <div className="text-[13px] font-semibold text-[#26324a]">{p.titleRu}</div>
                            <div className="font-mono text-[11px] text-[#a3adbd]">{p.code}</div>
                        </div>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Значение, {p.unit}</span>
                            <input
                                className="h-10 w-[180px] rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] tabular-nums outline-none focus:border-[#2f68f5]"
                                value={правки[p.id]?.value ?? ""}
                                onChange={(e) => setПравки({...правки, [p.id]: {...правки[p.id], value: e.target.value}})}
                            />
                        </label>

                        <label className="flex min-w-[220px] flex-[2] flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Основание</span>
                            <input
                                className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                                placeholder="решение Правления, отчётность на дату"
                                value={правки[p.id]?.note ?? ""}
                                onChange={(e) => setПравки({...правки, [p.id]: {...правки[p.id], note: e.target.value}})}
                            />
                        </label>

                        <button
                            onClick={() => сохранить(p)}
                            disabled={занято || !изменён(p)}
                            className="h-10 rounded-[10px] border-none bg-[#2f68f5] px-4 text-[13px] font-semibold text-white disabled:opacity-40"
                        >
                            Сохранить
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
