// Табличка "Действующая редакция / Суть-обоснование / Новая редакция" в модалке "Загрузка ТИД"
// (VndUploadTidModal) — визуально и по интеракциям повторяет матрицу разногласий
// (DisagreementMatrixTable): та же обводка таблицы, тот же способ добавления строк отдельным
// блоком снизу. Отличие — для авто-строк (см. useTidDiffRows) колонки "Действующая"/"Новая
// редакция" заполняются автоматически из построчного сравнения редакций, с покраской изменений
// цветом текста (красный/зелёный, без подсветки фона и зачёркивания) — и весь этот текст
// (и авто-, и добавленный вручную) можно свободно редактировать и точечно перекрашивать
// выделение через RichDiffEditor.
import {useState} from "react";
import {Download, Loader2, Trash2} from "lucide-react";
import type {TidAutoRow, TidDiffSegment} from "@/hooks/vndHooks/useTidDiffRows.ts";
import {
    RichDiffEditor
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RichDiffEditor.tsx";
import {downloadBlob, generateTidDocx, type TidExportRow} from "@/utils/docxTidExport.ts";
import {useResponsibleEmployeeOptions} from "@/hooks/useResponsibleEmployeeOptions.ts";

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
    /** Имя файла для скачивания сформированного ТИД, напр. по коду редакции. */
    exportFileName?: string;
    /** Ответственный за актуализацию по данным ВНД - строка "Разработано:" под таблицей
     * предзаполняется им. */
    defaultResponsibleUserId?: number | null;
    defaultResponsibleUserName?: string | null;
    /** Главному редактору доступен выбор другого сотрудника вместо ответственного по умолчанию. */
    canSelectResponsible?: boolean;
    /** Название ВНД на русском - подставляется в заголовок "к «…»" шаблона ТИД. */
    vndTitle?: string;
}

let manualRowCounter = 0;

export function TidChangesTable({
                                     autoRows, loading, unavailable, disabled, exportFileName,
                                     defaultResponsibleUserId, defaultResponsibleUserName, canSelectResponsible,
                                     vndTitle,
                                 }: TidChangesTableProps) {
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [manualRows, setManualRows] = useState<ManualTidRow[]>([]);
    // Правки, сделанные пользователем поверх авто-сформированного текста (см. RichDiffEditor)
    // строк из useTidDiffRows - изначально там просто подсвеченный diff, но раз колонки стали
    // редактируемыми, для выгрузки в docx нужен актуальный текст, а не тот, что был при построении.
    const [autoEdits, setAutoEdits] = useState<Record<string, {oldHtml?: string; newHtml?: string}>>({});
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    // "Разработано:" - по умолчанию ответственный за актуализацию текущей ВНД (см.
    // vnd.actualizationResponsibleUserId/Name), главный редактор может выбрать другого сотрудника.
    const {options: employeeOptions, loading: employeesLoading} = useResponsibleEmployeeOptions();
    const [responsibleUserId, setResponsibleUserId] = useState<number | null>(defaultResponsibleUserId ?? null);
    const selectedEmployee = employeeOptions.find((o) => o.id === responsibleUserId);
    const developedBy = responsibleUserId === null
        ? null
        : {
            fullName: selectedEmployee?.fullName ?? defaultResponsibleUserName ?? "",
            positionName: selectedEmployee?.positionName ?? null,
        };

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

    const handleExport = async () => {
        setExporting(true);
        setExportError(null);
        try {
            const exportRows: TidExportRow[] = [
                ...autoRows.map((row, index) => ({
                    number: index + 1,
                    oldHtml: autoEdits[row.id]?.oldHtml ?? segmentsToHtml(row.oldSegments, REMOVE_COLOR),
                    justification: justifications[row.id] ?? "",
                    newHtml: autoEdits[row.id]?.newHtml ?? segmentsToHtml(row.newSegments, ADD_COLOR),
                })),
                ...manualRows.map((row, index) => ({
                    number: autoRows.length + index + 1,
                    oldHtml: row.oldHtml,
                    justification: row.justification,
                    newHtml: row.newHtml,
                })),
            ];
            const blob = await generateTidDocx(exportRows, developedBy, vndTitle);
            downloadBlob(blob, exportFileName ?? "ТИД.docx");
        } catch (e) {
            setExportError(e instanceof Error ? e.message : "Не удалось сформировать файл ТИД");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <style>{`.rd-editor:empty:before { content: attr(data-placeholder); color: #c3c9d4; }`}</style>

            <div className="mb-[10px] flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-bold text-[#1c2740]">Автоформирование ТИД</span>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting || loading || totalRows === 0}
                    className="cursor-pointer flex items-center gap-2 rounded-[10px] border border-[#4e57d6] px-3 py-[7px] text-[12px] font-semibold text-[#4e57d6] transition-colors hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {exporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                    Скачать сформированный ТИД в формате DOCX
                </button>
            </div>

            {exportError && (
                <div className="mb-3 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                    {exportError}
                </div>
            )}

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
                                    onChangeText={(_text, html) =>
                                        setAutoEdits((prev) => ({...prev, [row.id]: {...prev[row.id], oldHtml: html}}))
                                    }
                                />
                            </td>
                            <td className="border border-[#c9ced8] px-3 py-3">
                                <textarea
                                    value={justifications[row.id] ?? ""}
                                    onChange={(e) => setJustifications((prev) => ({...prev, [row.id]: e.target.value}))}
                                    disabled={disabled}
                                    placeholder="Обоснование изменения…"
                                    rows={2}
                                    className="h-[220px] w-full resize-y rounded-[8px] border border-[#e0e5ee] bg-white px-2 py-[6px] text-[12.5px] outline-none focus:border-[#4e57d6] disabled:bg-[#f6f8fb]"
                                />
                            </td>
                            <td className="border border-[#c9ced8] px-2 py-2">
                                <RichDiffEditor
                                    initialHtml={segmentsToHtml(row.newSegments, ADD_COLOR)}
                                    placeholder="Новая редакция…"
                                    highlightColor={ADD_COLOR}
                                    highlightLabel="зелёным"
                                    disabled={disabled}
                                    onChangeText={(_text, html) =>
                                        setAutoEdits((prev) => ({...prev, [row.id]: {...prev[row.id], newHtml: html}}))
                                    }
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
                                        title="Удалить строку"
                                        className="cursor-pointer text-[#8b97ab] hover:text-[#c0392b]"
                                    >
                                        <Trash2 size={15}/>
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-semibold text-[#1c2740]">Разработчик:</span>
                {canSelectResponsible && !disabled ? (
                    <select
                        value={responsibleUserId ?? ""}
                        onChange={(e) => setResponsibleUserId(e.target.value ? Number(e.target.value) : null)}
                        disabled={employeesLoading}
                        className="h-8 min-w-[240px] rounded-[8px] border border-[#e0e5ee] bg-white px-2 text-[12.5px] text-[#26324a] disabled:opacity-50"
                    >
                        <option value="">— не выбран —</option>
                        {defaultResponsibleUserId !== null && defaultResponsibleUserId !== undefined
                            && !employeeOptions.some((o) => o.id === defaultResponsibleUserId) && (
                            <option value={defaultResponsibleUserId}>
                                {defaultResponsibleUserName ?? `Пользователь #${defaultResponsibleUserId}`}
                            </option>
                        )}
                        {employeeOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                                {[o.positionName, o.fullName].filter(Boolean).join(" — ")}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="text-[#26324a]">
                        {developedBy
                            ? [developedBy.positionName, developedBy.fullName].filter(Boolean).join(", ")
                            : <span className="text-[#8b97ab]">не указан</span>}
                    </span>
                )}
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
                            heightClass="h-[90px]"
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
                            heightClass="h-[90px]"
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
