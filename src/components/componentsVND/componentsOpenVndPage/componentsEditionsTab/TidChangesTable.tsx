// Табличка "Действующая редакция / Суть-обоснование / Новая редакция" в модалке "Загрузка ТИД"
// (VndUploadTidModal) — визуально и по интеракциям повторяет матрицу разногласий
// (DisagreementMatrixTable): та же обводка таблицы, тот же способ добавления строк отдельным
// блоком снизу. Отличие — для авто-строк (см. useTidDiffRows) колонки "Действующая"/"Новая
// редакция" заполняются автоматически из построчного сравнения редакций, с покраской изменений
// цветом текста (красный/зелёный, без подсветки фона и зачёркивания) — и весь этот текст
// (и авто-, и добавленный вручную) можно свободно редактировать и точечно перекрашивать
// выделение через RichDiffEditor.
import {useState} from "react";
import {Loader2} from "lucide-react";
import type {TidAutoRow, TidDiffSegment} from "@/hooks/vndHooks/useTidDiffRows.ts";
import {
    RichDiffEditor
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RichDiffEditor.tsx";

const REMOVE_COLOR = "#c0392b";
const ADD_COLOR = "#1c7a4d";

function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Сегменты автосравнения (см. useTidDiffRows) -> HTML для начального содержимого
 * RichDiffEditor: изменённые куски (hl: true) оборачиваются в цветной <span>, остальной текст
 * идёт как есть - никакой заливки фона и зачёркивания, просто цвет текста. */
function segmentsToHtml(segments: TidDiffSegment[], color: string): string {
    return segments
        .map((seg) => {
            const escaped = escapeHtml(seg.text).replace(/\n/g, "<br/>");
            return seg.hl ? `<span style="color:${color}">${escaped}</span>` : escaped;
        })
        .join("");
}

interface ManualTidRow {
    id: string;
    oldHtml: string;
    oldText: string;
    justification: string;
    newHtml: string;
    newText: string;
}

interface TidChangesTableProps {
    autoRows: TidAutoRow[];
    loading: boolean;
    unavailable?: boolean;
    disabled?: boolean;
}

let manualRowCounter = 0;

export function TidChangesTable({autoRows, loading, unavailable, disabled}: TidChangesTableProps) {
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [manualRows, setManualRows] = useState<ManualTidRow[]>([]);

    const [draftOldHtml, setDraftOldHtml] = useState("");
    const [draftOldText, setDraftOldText] = useState("");
    const [draftNewHtml, setDraftNewHtml] = useState("");
    const [draftNewText, setDraftNewText] = useState("");
    const [draftJustification, setDraftJustification] = useState("");
    const [draftKey, setDraftKey] = useState(0);

    const canAdd = draftOldText.trim().length > 0 || draftNewText.trim().length > 0;

    const handleAdd = () => {
        if (!canAdd) return;
        manualRowCounter += 1;
        setManualRows((rows) => [...rows, {
            id: `manual-${manualRowCounter}`,
            oldHtml: draftOldHtml,
            oldText: draftOldText,
            justification: draftJustification.trim(),
            newHtml: draftNewHtml,
            newText: draftNewText,
        }]);
        setDraftOldHtml("");
        setDraftOldText("");
        setDraftNewHtml("");
        setDraftNewText("");
        setDraftJustification("");
        setDraftKey((k) => k + 1); // пересоздаёт RichDiffEditor черновиков пустыми
    };

    const handleDelete = (id: string) => {
        setManualRows((rows) => rows.filter((r) => r.id !== id));
    };

    const totalRows = autoRows.length + manualRows.length;

    return (
        <div>
            <style>{`.rd-editor:empty:before { content: attr(data-placeholder); color: #c3c9d4; }`}</style>

            <div className="mb-[10px] flex items-center justify-center text-[13.5px] font-bold text-[#1c2740]">
                Автоформирование ТИД
            </div>

            <div className="overflow-x-auto rounded-[4px] border border-[#c9ced8]">
                <table className="w-full table-fixed border-collapse text-[13px]">
                    <thead>
                    <tr className="bg-[#e9ebf0] text-center text-[12.5px] font-bold text-[#1c2740]">
                        <th className="border border-[#c9ced8] px-2 py-2 w-[44px]">№<br/>п/п</th>
                        <th className="border border-[#c9ced8] px-3 py-2 w-[34%]">Действующая редакция</th>
                        <th className="border border-[#c9ced8] px-3 py-2 w-[32%]">
                            Суть/обоснование предлагаемых изменений
                        </th>
                        <th className="border border-[#c9ced8] px-3 py-2 w-[34%]">Новая редакция</th>
                        {!disabled && <th className="border border-[#c9ced8] px-2 py-2 w-10"/>}
                    </tr>
                    </thead>
                    <tbody>
                    {loading && (
                        <tr>
                            <td colSpan={disabled ? 4 : 5} className="border border-[#c9ced8] px-4 py-6 text-center text-[#8b97ab]">
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin"/>
                                    Сравнение редакций…
                                </span>
                            </td>
                        </tr>
                    )}

                    {!loading && unavailable && (
                        <tr>
                            <td colSpan={disabled ? 4 : 5} className="border border-[#c9ced8] px-4 py-4 text-center text-[#8b97ab]">
                                Не удалось автоматически сравнить редакции — добавьте строки вручную
                            </td>
                        </tr>
                    )}

                    {!loading && !unavailable && totalRows === 0 && (
                        <tr>
                            <td colSpan={disabled ? 4 : 5} className="border border-[#c9ced8] px-4 py-4 text-center text-[#8b97ab]">
                                Строк пока нет
                            </td>
                        </tr>
                    )}

                    {!loading && autoRows.map((row, index) => (
                        <tr key={row.id} className="align-top">
                            <td className="border border-[#c9ced8] px-2 py-3 text-center text-[#1c2740]">
                                {index + 1}
                            </td>
                            <td className="border border-[#c9ced8] px-2 py-2">
                                <RichDiffEditor
                                    initialHtml={segmentsToHtml(row.oldSegments, REMOVE_COLOR)}
                                    placeholder="Действующая редакция…"
                                    highlightColor={REMOVE_COLOR}
                                    highlightLabel="красным"
                                    disabled={disabled}
                                />
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3">
                                <textarea
                                    value={justifications[row.id] ?? ""}
                                    onChange={(e) => setJustifications((prev) => ({...prev, [row.id]: e.target.value}))}
                                    disabled={disabled}
                                    placeholder="Обоснование изменения…"
                                    rows={2}
                                    className="w-full resize-y rounded-[8px] border border-[#e0e5ee] bg-white px-2 py-[6px] text-[12.5px] outline-none focus:border-[#4e57d6] disabled:bg-[#f6f8fb]"
                                />
                            </td>
                            <td className="border border-[#c9ced8] px-2 py-2">
                                <RichDiffEditor
                                    initialHtml={segmentsToHtml(row.newSegments, ADD_COLOR)}
                                    placeholder="Новая редакция…"
                                    highlightColor={ADD_COLOR}
                                    highlightLabel="зелёным"
                                    disabled={disabled}
                                />
                            </td>
                            {!disabled && <td className="border border-[#c9ced8]"/>}
                        </tr>
                    ))}

                    {manualRows.map((row, index) => (
                        <tr key={row.id} className="align-top">
                            <td className="border border-[#c9ced8] px-2 py-3 text-center text-[#1c2740]">
                                {autoRows.length + index + 1}
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3 whitespace-pre-wrap break-words text-[#1c2740]">
                                {row.oldText.trim()
                                    ? <span dangerouslySetInnerHTML={{__html: row.oldHtml}}/>
                                    : <span className="text-[#c3c9d4]">—</span>}
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3 whitespace-pre-wrap break-words text-[#3c424a]">
                                {row.justification || <span className="text-[#c3c9d4]">—</span>}
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3 whitespace-pre-wrap break-words text-[#1c2740]">
                                {row.newText.trim()
                                    ? <span dangerouslySetInnerHTML={{__html: row.newHtml}}/>
                                    : <span className="text-[#c3c9d4]">—</span>}
                            </td>
                            {!disabled && (
                                <td className="border border-[#c9ced8] px-2 py-3 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(row.id)}
                                        className="text-[12px] text-[#c0392b] hover:underline"
                                    >
                                        Удалить
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {!disabled && (
                <div className="mt-4 rounded-[10px] px-1 py-4">
                    <div className="mb-3 text-[12.5px] font-semibold text-[#1c2740]">Добавить строку</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <RichDiffEditor
                            key={`draft-old-${draftKey}`}
                            placeholder="Действующая редакция"
                            highlightColor={REMOVE_COLOR}
                            highlightLabel="красным"
                            minHeightClass="min-h-[52px]"
                            onChangeText={(text, html) => {
                                setDraftOldText(text);
                                setDraftOldHtml(html);
                            }}
                        />
                        <textarea
                            value={draftJustification}
                            onChange={(e) => setDraftJustification(e.target.value)}
                            placeholder="Суть/обоснование предлагаемых изменений"
                            rows={2}
                            className="rounded-[10px] border border-[#e0e5ee] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#4e57d6]"
                        />
                        <RichDiffEditor
                            key={`draft-new-${draftKey}`}
                            placeholder="Новая редакция"
                            highlightColor={ADD_COLOR}
                            highlightLabel="зелёным"
                            minHeightClass="min-h-[52px]"
                            onChangeText={(text, html) => {
                                setDraftNewText(text);
                                setDraftNewHtml(html);
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!canAdd}
                        className="cursor-pointer mt-3 rounded-[10px] bg-[#4e57d6] px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40 hover:brightness-[1.06]"
                    >
                        Добавить строку
                    </button>
                </div>
            )}
        </div>
    );
}
