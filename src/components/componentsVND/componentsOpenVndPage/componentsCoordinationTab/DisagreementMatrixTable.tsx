import {useState} from "react";
import type {DisagreementMatrixRowResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

interface DisagreementMatrixTableProps {
    rows: DisagreementMatrixRowResponse[];
    onAddRow: (row: {
        developerPosition: string;
        opponentPosition: string;
        developerJustification?: string;
    }) => Promise<void>;
    onDeleteRow: (rowId: number) => Promise<void>;
    disabled?: boolean;
}

/** Встраиваемая таблица матрицы разногласий - без собственной внешней карточки,
 * т.к. используется внутри блока "Согласны ли вы со всеми замечаниями?". */
export function DisagreementMatrixTable({rows, onAddRow, onDeleteRow, disabled}: DisagreementMatrixTableProps) {
    const [developerPosition, setDeveloperPosition] = useState("");
    const [opponentPosition, setOpponentPosition] = useState("");
    const [developerJustification, setDeveloperJustification] = useState("");
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canAdd = developerPosition.trim().length > 0 && opponentPosition.trim().length > 0;

    const handleAdd = async () => {
        if (!canAdd || adding) return;
        setAdding(true);
        setError(null);
        try {
            await onAddRow({
                developerPosition: developerPosition.trim(),
                opponentPosition: opponentPosition.trim(),
                developerJustification: developerJustification.trim() || undefined,
            });
            setDeveloperPosition("");
            setOpponentPosition("");
            setDeveloperJustification("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось добавить строку");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (rowId: number) => {
        setDeletingId(rowId);
        setError(null);
        try {
            await onDeleteRow(rowId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось удалить строку");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="px-5">

            <div className="flex  mb-[10px] text-[13.5px]  text-[#1c2740]">
                Пожалуйста, заполните матрицу разногласий, с какими замечаниями Вы не согласны и почему:
            </div>

            <div className="flex items-center justify-center mb-[10px] text-[13.5px] font-bold text-[#1c2740]">
                Матрица разногласий
            </div>

            <div className="overflow-x-auto rounded-[4px] border border-[#c9ced8]">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                    <tr className="bg-[#e9ebf0] text-center text-[12.5px] font-bold text-[#1c2740]">
                        <th className="border border-[#c9ced8] px-2 py-2 w-[52px]">№<br/>п/п</th>
                        <th className="border border-[#c9ced8] px-3 py-2">Редакция разработчика</th>
                        <th className="border border-[#c9ced8] px-3 py-2">
                            Редакция и комментарии оппонента
                        </th>
                        <th className="border border-[#c9ced8] px-3 py-2">
                            Комментарии (обоснование) разработчика
                        </th>
                        {!disabled && <th className="border border-[#c9ced8] px-2 py-2 w-10"/>}
                    </tr>
                    </thead>
                    <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td
                                colSpan={disabled ? 4 : 5}
                                className="border border-[#c9ced8] px-4 py-4 text-center text-[#8b97ab]"
                            >
                                Строк пока нет
                            </td>
                        </tr>
                    )}
                    {rows.map((row, index) => (
                        <tr key={row.id} className="align-top">
                            <td className="border border-[#c9ced8] px-2 py-3 text-center text-[#1c2740]">
                                {index + 1}
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3 whitespace-pre-wrap text-[#1c2740]">
                                {row.developerPosition}
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3 whitespace-pre-wrap text-[#1c2740]">
                                {row.opponentPosition}
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3 whitespace-pre-wrap text-[#3c424a]">
                                {row.developerJustification ?? "—"}
                            </td>
                            {!disabled && (
                                <td className="border border-[#c9ced8] px-2 py-3 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(row.id)}
                                        disabled={deletingId === row.id}
                                        className="text-[12px] text-[#c0392b] hover:underline disabled:opacity-50"
                                    >
                                        {deletingId === row.id ? "…" : "Удалить"}
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {!disabled && (
                <div className="mt-4 rounded-[10px]  px-4 py-4">
                    <div className="mb-3 text-[12.5px] font-semibold text-[#1c2740]">Добавить строку</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <textarea
                            value={developerPosition}
                            onChange={(e) => setDeveloperPosition(e.target.value)}
                            placeholder="Редакция разработчика"
                            rows={2}
                            className="rounded-[10px] border border-[#e0e5ee] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#4e57d6]"
                        />
                        <textarea
                            value={opponentPosition}
                            onChange={(e) => setOpponentPosition(e.target.value)}
                            placeholder="Редакция и комментарий оппонента"
                            rows={2}
                            className="rounded-[10px] border border-[#e0e5ee] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#4e57d6]"
                        />
                        <textarea
                            value={developerJustification}
                            onChange={(e) => setDeveloperJustification(e.target.value)}
                            placeholder="Комментарий (обоснование) разработчика"
                            rows={2}
                            className="rounded-[10px] border border-[#e0e5ee] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    {error && <div className="mt-2 text-[12px] text-[#c0392b]">{error}</div>}

                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!canAdd || adding}
                        className="cursor-pointer mt-3 rounded-[10px] bg-[#4e57d6] px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40 hover:brightness-[1.06]"
                    >
                        {adding ? "Добавление…" : "Добавить строку"}
                    </button>
                </div>
            )}
        </div>
    );
}