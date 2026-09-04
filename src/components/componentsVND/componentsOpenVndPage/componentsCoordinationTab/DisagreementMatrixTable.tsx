import {useState} from "react";
import type {DisagreementMatrixRowResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    RichDiffEditor
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RichDiffEditor.tsx";
import {colors} from "@/design/tokens";
import {downloadBlob, generateDisagreementMatrixDocx} from "@/utils/docxDisagreementMatrixExport.ts";
import {Download, Loader2} from "lucide-react";

const NEGATIVE_COLOR = colors.ryg.red.fg;
const POSITIVE_COLOR = colors.ryg.green.fg;
// Обе кнопки покраски (красным/зелёным) доступны в каждой ячейке - как и при формировании ТИД,
// но здесь сразу в одном и том же поле (см. требование "должно быть в каждой строке ещё
// «выделить красным», «выделить зеленым» «выделить черным», как при формировании ТИД-а").
const HIGHLIGHT_OPTIONS = [
    {color: NEGATIVE_COLOR, label: "красным"},
    {color: POSITIVE_COLOR, label: "зелёным"},
];

interface DisagreementMatrixTableProps {
    rows: DisagreementMatrixRowResponse[];
    onAddRow: (row: {
        developerPosition: string;
        opponentPosition: string;
        developerJustification?: string;
    }) => Promise<void>;
    onUpdateRow: (rowId: number, row: {
        developerPosition: string;
        opponentPosition: string;
        developerJustification?: string;
    }) => Promise<void>;
    onDeleteRow: (rowId: number) => Promise<void>;
    disabled?: boolean;
    /** Название ВНД - подставляется в шапку сформированного файла (см. generateDisagreementMatrixDocx). */
    vndTitle?: string;
    /** Имя файла для скачивания сформированной матрицы, напр. по коду редакции. */
    exportFileName?: string;
}

interface DraftHtml {
    developerPositionHtml: string;
    developerPositionText: string;
    opponentPositionHtml: string;
    opponentPositionText: string;
    developerJustificationHtml: string;
}

const EMPTY_DRAFT: DraftHtml = {
    developerPositionHtml: "", developerPositionText: "",
    opponentPositionHtml: "", opponentPositionText: "",
    developerJustificationHtml: "",
};

/** Встраиваемая таблица матрицы разногласий - без собственной внешней карточки, т.к.
 * используется внутри режима "сформировать матрицу разногласий в системе" (см.
 * VndDisagreementMatrixSection). Ячейки - RichDiffEditor (частичная покраска красным/зелёным/
 * чёрным, как при формировании ТИД), а не обычный textarea, поэтому и в ответах с бэка, и здесь
 * во черновиках хранится HTML, а не голый текст. */
export function DisagreementMatrixTable({
                                             rows, onAddRow, onUpdateRow, onDeleteRow, disabled,
                                             vndTitle, exportFileName,
                                         }: DisagreementMatrixTableProps) {
    const [draft, setDraft] = useState<DraftHtml>(EMPTY_DRAFT);
    const [draftKey, setDraftKey] = useState(0);
    const [adding, setAdding] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<DraftHtml>(EMPTY_DRAFT);
    const [editKey, setEditKey] = useState(0);
    const [saving, setSaving] = useState(false);

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canAdd = draft.developerPositionText.trim().length > 0 && draft.opponentPositionText.trim().length > 0;

    const handleAdd = async () => {
        if (!canAdd || adding) return;
        setAdding(true);
        setError(null);
        try {
            await onAddRow({
                developerPosition: draft.developerPositionHtml,
                opponentPosition: draft.opponentPositionHtml,
                developerJustification: draft.developerJustificationHtml || undefined,
            });
            setDraft(EMPTY_DRAFT);
            setDraftKey((k) => k + 1); // пересоздаёт RichDiffEditor черновиков пустыми
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось добавить строку");
        } finally {
            setAdding(false);
        }
    };

    const startEdit = (row: DisagreementMatrixRowResponse) => {
        setEditingId(row.id);
        setEditDraft({
            developerPositionHtml: row.developerPosition, developerPositionText: row.developerPosition,
            opponentPositionHtml: row.opponentPosition, opponentPositionText: row.opponentPosition,
            developerJustificationHtml: row.developerJustification ?? "",
        });
        setEditKey((k) => k + 1);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setError(null);
    };

    const canSaveEdit = editDraft.developerPositionText.trim().length > 0
        && editDraft.opponentPositionText.trim().length > 0;

    const handleSaveEdit = async () => {
        if (editingId === null || !canSaveEdit || saving) return;
        setSaving(true);
        setError(null);
        try {
            await onUpdateRow(editingId, {
                developerPosition: editDraft.developerPositionHtml,
                opponentPosition: editDraft.opponentPositionHtml,
                developerJustification: editDraft.developerJustificationHtml || undefined,
            });
            setEditingId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось изменить строку");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (rowId: number) => {
        setDeletingId(rowId);
        setError(null);
        try {
            await onDeleteRow(rowId);
            if (editingId === rowId) setEditingId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось удалить строку");
        } finally {
            setDeletingId(null);
        }
    };

    const handleExport = async () => {
        if (rows.length === 0 || exporting) return;
        setExporting(true);
        setError(null);
        try {
            const blob = await generateDisagreementMatrixDocx(
                rows.map((row, index) => ({
                    number: index + 1,
                    developerPositionHtml: row.developerPosition,
                    opponentPositionHtml: row.opponentPosition,
                    developerJustificationHtml: row.developerJustification ?? "",
                })),
                vndTitle,
            );
            downloadBlob(blob, exportFileName ?? "Матрица разногласий.docx");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сформировать файл матрицы разногласий");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="px-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center justify-center text-[13.5px] font-bold text-[#1c2740]">
                    Матрица разногласий
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={rows.length === 0 || exporting}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#4e57d6] px-3 py-[6px] text-[12px] font-semibold text-[#4e57d6] transition-colors hover:bg-[#4e57d6]/5 disabled:cursor-default disabled:opacity-40"
                >
                    {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
                    Скачать сформированную матрицу Разногласий в формате DOCX
                </button>
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
                        {!disabled && <th className="border border-[#c9ced8] px-2 py-2 w-[86px]"/>}
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
                    {rows.map((row, index) => {
                        const isEditing = editingId === row.id;
                        return (
                            <tr key={row.id} className="align-top">
                                <td className="border border-[#c9ced8] px-2 py-3 text-center text-[#1c2740]">
                                    {index + 1}
                                </td>
                                {isEditing ? (
                                    <>
                                        <td className="border border-[#c9ced8] px-2 py-2">
                                            <RichDiffEditor
                                                key={`edit-dev-${editKey}`}
                                                initialHtml={editDraft.developerPositionHtml}
                                                placeholder="Редакция разработчика"
                                                highlightOptions={HIGHLIGHT_OPTIONS}
                                                heightClass="h-[120px]"
                                                onChangeText={(text, html) => setEditDraft((prev) => ({
                                                    ...prev, developerPositionHtml: html, developerPositionText: text,
                                                }))}
                                            />
                                        </td>
                                        <td className="border border-[#c9ced8] px-2 py-2">
                                            <RichDiffEditor
                                                key={`edit-opp-${editKey}`}
                                                initialHtml={editDraft.opponentPositionHtml}
                                                placeholder="Редакция и комментарий оппонента"
                                                highlightOptions={HIGHLIGHT_OPTIONS}
                                                heightClass="h-[120px]"
                                                onChangeText={(text, html) => setEditDraft((prev) => ({
                                                    ...prev, opponentPositionHtml: html, opponentPositionText: text,
                                                }))}
                                            />
                                        </td>
                                        <td className="border border-[#c9ced8] px-2 py-2">
                                            <RichDiffEditor
                                                key={`edit-just-${editKey}`}
                                                initialHtml={editDraft.developerJustificationHtml}
                                                placeholder="Комментарий (обоснование) разработчика"
                                                highlightOptions={HIGHLIGHT_OPTIONS}
                                                heightClass="h-[120px]"
                                                onChangeText={(_text, html) => setEditDraft((prev) => ({
                                                    ...prev, developerJustificationHtml: html,
                                                }))}
                                            />
                                        </td>
                                        <td className="border border-[#c9ced8] px-2 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveEdit}
                                                    disabled={!canSaveEdit || saving}
                                                    className="cursor-pointer text-[12px] font-semibold text-[#4e57d6] hover:underline disabled:opacity-50"
                                                >
                                                    {saving ? "…" : "Сохранить"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEdit}
                                                    disabled={saving}
                                                    className="cursor-pointer text-[12px] text-[#8b97ab] hover:underline disabled:opacity-50"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="border border-[#c9ced8] px-3 py-3 text-[#1c2740]">
                                            <span dangerouslySetInnerHTML={{__html: row.developerPosition}}/>
                                        </td>
                                        <td className="border border-[#c9ced8] px-3 py-3 text-[#1c2740]">
                                            <span dangerouslySetInnerHTML={{__html: row.opponentPosition}}/>
                                        </td>
                                        <td className="border border-[#c9ced8] px-3 py-3 text-[#3c424a]">
                                            {row.developerJustification
                                                ? <span dangerouslySetInnerHTML={{__html: row.developerJustification}}/>
                                                : "—"}
                                        </td>
                                        {!disabled && (
                                            <td className="border border-[#c9ced8] px-2 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(row)}
                                                        className="cursor-pointer text-[12px] text-[#4e57d6] hover:underline"
                                                    >
                                                        Изменить
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(row.id)}
                                                        disabled={deletingId === row.id}
                                                        className="cursor-pointer text-[12px] text-[#c0392b] hover:underline disabled:opacity-50"
                                                    >
                                                        {deletingId === row.id ? "…" : "Удалить"}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </>
                                )}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {!disabled && (
                <div className="mt-4 rounded-[10px] px-4 py-4">
                    <div className="mb-3 text-[12.5px] font-semibold text-[#1c2740]">Добавить строку</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <RichDiffEditor
                            key={`draft-dev-${draftKey}`}
                            placeholder="Редакция разработчика"
                            highlightOptions={HIGHLIGHT_OPTIONS}
                            heightClass="h-[120px]"
                            onChangeText={(text, html) => setDraft((prev) => ({
                                ...prev, developerPositionHtml: html, developerPositionText: text,
                            }))}
                        />
                        <RichDiffEditor
                            key={`draft-opp-${draftKey}`}
                            placeholder="Редакция и комментарий оппонента"
                            highlightOptions={HIGHLIGHT_OPTIONS}
                            heightClass="h-[120px]"
                            onChangeText={(text, html) => setDraft((prev) => ({
                                ...prev, opponentPositionHtml: html, opponentPositionText: text,
                            }))}
                        />
                        <RichDiffEditor
                            key={`draft-just-${draftKey}`}
                            placeholder="Комментарий (обоснование) разработчика"
                            highlightOptions={HIGHLIGHT_OPTIONS}
                            heightClass="h-[120px]"
                            onChangeText={(_text, html) => setDraft((prev) => ({
                                ...prev, developerJustificationHtml: html,
                            }))}
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

            {disabled && error && <div className="mt-2 text-[12px] text-[#c0392b]">{error}</div>}
        </div>
    );
}
