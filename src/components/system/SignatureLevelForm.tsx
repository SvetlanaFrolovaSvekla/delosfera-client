import {useCallback, useEffect, useState} from "react";
import {apiClient} from "@/service/apiClient.ts";

/**
 * Уровень подписи на этапах маршрута (Б-07).
 *
 * Это и есть переключение контура с простой подписи на квалифицированную: движок
 * проверку уже умеет, не хватало места, где уровень задают. Пока рабочее место
 * ЭЦП не подключено, ставить «квалифицированная» рано — тогда этап нельзя будет
 * закрыть вовсе, о чём здесь и сказано прямо.
 *
 * Изменение действует на новые маршруты: уже запущенные идут по правилам, при
 * которых стартовали, — иначе документ на полпути менял бы условия подписания.
 */

type Уровень = "Simple" | "Qualified" | null;

interface Шаблон {
    id: number;
    name: string;
    documentType: string;
    isGlobalRule: boolean;
}

interface Этап {
    id: number;
    order: number;
    mode: string;
    kind: string;
    isFinalMethodology: boolean;
    participantCount: number;
    requiredSignatureLevel: Уровень;
}

const ВИД_ЭТАПА: Record<string, string> = {
    Approval: "согласование",
    FinalControl: "финальный контроль",
    Signing: "подписание",
    Board: "вынесение на Правление",
};

const ТИП_ДОКУМЕНТА: Record<string, string> = {
    Vnd: "ВНД",
    Sz: "служебные записки",
    Procurement: "закупки",
    Meeting: "заседания",
};

export const SignatureLevelForm = () => {
    const [шаблоны, setШаблоны] = useState<Шаблон[]>([]);
    const [выбран, setВыбран] = useState<number | null>(null);
    const [этапы, setЭтапы] = useState<Этап[]>([]);
    const [занято, setЗанято] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);

    useEffect(() => {
        apiClient.get<Шаблон[]>("/workflow/templates")
            .then(({data}) => {
                setШаблоны(data);
                if (data.length > 0) setВыбран(data[0].id);
            })
            .catch(() => setОшибка("Не удалось загрузить шаблоны маршрутов"));
    }, []);

    const загрузитьЭтапы = useCallback(async (id: number) => {
        try {
            setОшибка(null);
            const {data} = await apiClient.get<{steps: Этап[]}>(`/workflow/templates/${id}`);
            setЭтапы(data.steps);
        } catch {
            setОшибка("Не удалось загрузить этапы шаблона");
            setЭтапы([]);
        }
    }, []);

    useEffect(() => {
        if (выбран !== null) void загрузитьЭтапы(выбран);
    }, [выбран, загрузитьЭтапы]);

    const задать = async (этап: Этап, уровень: Уровень) => {
        try {
            setЗанято(true);
            setОшибка(null);
            await apiClient.put(`/workflow/templates/steps/${этап.id}/signature-level`, {level: уровень});
            setЭтапы(этапы.map((э) => (э.id === этап.id ? {...э, requiredSignatureLevel: уровень} : э)));
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось изменить уровень подписи");
        } finally {
            setЗанято(false);
        }
    };

    const кнопка = (активна: boolean) =>
        `h-9 px-3.5 text-[12.5px] font-semibold border rounded-[9px] ${
            активна
                ? "border-[#2f68f5] bg-[#eef3ff] text-[#2f68f5]"
                : "border-[#e5e9f0] bg-white text-[#55617a]"}`;

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 text-[15px] font-semibold">Подпись на этапах маршрута</h2>
            <p className="m-0 mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.7] text-[#8b97ab]">
                Чем закрывается этап согласования. Изменение действует на маршруты,
                запущенные после него.
            </p>

            {ошибка && (
                <div className="mt-3 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2 text-[12.5px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}

            {шаблоны.length === 0 ? (
                <p className="mt-4 text-[13px] text-[#8b97ab]">
                    Шаблоны маршрутов не заведены. Записки и заявки идут по согласующим,
                    выбранным в карточке, — там подпись всегда простая.
                </p>
            ) : (
                <>
                    <label className="mt-4 flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Шаблон маршрута</span>
                        <select
                            className="h-10 w-full max-w-[460px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                            value={выбран ?? 0}
                            onChange={(e) => setВыбран(Number(e.target.value))}
                        >
                            {шаблоны.map((ш) => (
                                <option key={ш.id} value={ш.id}>
                                    {ш.name} · {ТИП_ДОКУМЕНТА[ш.documentType] ?? ш.documentType}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="mt-4 flex flex-col gap-2.5">
                        {этапы.map((э) => (
                            <div key={э.id}
                                 className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#eef2f7] px-4 py-3">
                                <div className="min-w-[220px] flex-1">
                                    <div className="text-[13px] font-semibold text-[#26324a]">
                                        Этап {э.order} · {ВИД_ЭТАПА[э.kind] ?? э.kind}
                                        {э.isFinalMethodology && " · финальный контроль"}
                                    </div>
                                    <div className="text-[11.5px] text-[#8b97ab]">
                                        {э.mode === "Parallel" ? "параллельный" : "последовательный"}
                                        {" · участников: "}{э.participantCount}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button className={кнопка(э.requiredSignatureLevel === null)}
                                            disabled={занято}
                                            onClick={() => задать(э, null)}>
                                        без подписи
                                    </button>
                                    <button className={кнопка(э.requiredSignatureLevel === "Simple")}
                                            disabled={занято}
                                            onClick={() => задать(э, "Simple")}>
                                        простая
                                    </button>
                                    <button className={кнопка(э.requiredSignatureLevel === "Qualified")}
                                            disabled={занято}
                                            onClick={() => задать(э, "Qualified")}>
                                        квалифицированная
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {этапы.some((э) => э.requiredSignatureLevel === "Qualified") && (
                        <div className="mt-3 rounded-[9px] border border-[#f0dcae] bg-[#fdf3e0] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#8a5a00]">
                            У этапа требуется квалифицированная подпись, а рабочее место ЭЦП
                            ещё не подключено. Такой этап закрыть не получится, пока не
                            появится криптопровайдер на машине подписанта.
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
