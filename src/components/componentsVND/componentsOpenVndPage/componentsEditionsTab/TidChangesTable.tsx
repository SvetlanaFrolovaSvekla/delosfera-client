// Таблица ТИД с автоматическим формированием изменений в редакции (редактируемая)
// - можно её скачать и приложить, как файл-тид для последующего согласования
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {userService} from "@/service/userService/userService.ts";
import type {TidAutoRow} from "@/hooks/vndHooks/useTidDiffRows.ts";
import {downloadBlob, generateTidDocx, type TidExportRow} from "@/utils/docxWork/docxTidExport.ts";
import {getInitials, segmentsToHtml} from "@/utils/tidBuilding/tidUtils.ts";
import {
    RichDiffEditor
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RichDiffEditor.tsx";
import {
    TidDeveloperPickerModal, type TidDeveloperOption
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/TidDeveloperPickerModal.tsx";
import {colors} from "@/design/tokens";
import {ChevronDown, Download, Loader2, Trash2, Wand2, X} from "lucide-react";

const REMOVE_COLOR = colors.ryg.red.fg;
const ADD_COLOR = colors.ryg.green.fg;

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
    /** Тот, кто сейчас формирует ТИД (обычно - текущий пользователь) - строка "Разработчик:" под
     * таблицей предзаполняется им, см. VndUploadTidModal. */
    defaultResponsibleUserId?: number | null;
    defaultResponsibleUserName?: string | null;
    /** Главному редактору и администратору доступен выбор другого сотрудника вместо
     * ответственного по умолчанию. */
    canSelectResponsible?: boolean;
    /** Название ВНД на русском - подставляется в заголовок "к «…»" шаблона ТИД. */
    vndTitle?: string;
    /** Пока не сформировано - вместо таблицы показывается кнопка "Сформировать ТИД" (см.
     * VndUploadTidModal - там же от этого флага зависит появление блока ручной загрузки файла). */
    formed: boolean;
    onForm: () => void;
}

let manualRowCounter = 0;

export function TidChangesTable({
                                    autoRows, loading, unavailable, disabled, exportFileName,
                                    defaultResponsibleUserId, defaultResponsibleUserName, canSelectResponsible,
                                    vndTitle, formed, onForm,
                                }: TidChangesTableProps) {
    const {t} = useTranslation();
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [manualRows, setManualRows] = useState<ManualTidRow[]>([]);
    // Правки, сделанные пользователем поверх авто-сформированного текста
    const [autoEdits, setAutoEdits] = useState<Record<string, { oldHtml?: string; newHtml?: string }>>({});
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    // "Разработчик:" - по умолчанию тот, кто сейчас формирует ТИД (defaultResponsibleUserId,
    // обычно текущий пользователь); главный редактор и администратор могут выбрать другого
    // сотрудника через TidDeveloperPickerModal - остальные видят поле нередактируемым.
    const [developerPickerOpen, setDeveloperPickerOpen] = useState(false);
    const [responsibleUser, setResponsibleUser] = useState<TidDeveloperOption | null>(
        defaultResponsibleUserId != null
            ? {id: defaultResponsibleUserId, fullName: defaultResponsibleUserName ?? "", positionName: null}
            : null
    );

    // Должность ответственного по умолчанию отдельным запросом - defaultResponsibleUserName
    // приходит с ВНД без должности, а она нужна для строки "Разработано:" под таблицей.
    useEffect(() => {
        if (defaultResponsibleUserId == null) return;
        let cancelled = false;
        userService.getById(defaultResponsibleUserId)
            .then((u) => {
                if (cancelled) return;
                setResponsibleUser((prev) =>
                    prev && prev.id === defaultResponsibleUserId
                        ? {...prev, positionName: u.position?.titleRu ?? null}
                        : prev
                );
            })
            .catch(() => {
                // Не критично - строка "Разработано:" просто останется без должности.
            });
        return () => {
            cancelled = true;
        };
    }, [defaultResponsibleUserId]);

    const developedBy = responsibleUser === null
        ? null
        : {fullName: responsibleUser.fullName, positionName: responsibleUser.positionName};

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
            // ТИД.docx (запасное имя файла, если exportFileName не передан)
            downloadBlob(blob, exportFileName ?? t("tidChangesTable.defaultFileName"));
        } catch (e) {
            // Не удалось сформировать файл ТИД (запасной текст ошибки)
            setExportError(e instanceof Error ? e.message : t("tidChangesTable.exportDefaultError"));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <style>{`.rd-editor:empty:before { content: attr(data-placeholder); color: #c3c9d4; }`}</style>

            {!formed ? (
                <>
                    <div className="mb-[10px] flex items-center justify-between gap-3">
                        <span className="ml-[16px] text-[12.5px] font-semibold text-[#26324a]">
                            {/* Автоформирование ТИД: */}
                            {t("tidChangesTable.formSectionTitle")}
                        </span>
                    </div>

                    <div
                        className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[#d5dae3] bg-[#f9fafc] px-4 py-9 text-center">
                    <span className="text-[13px] text-[#8b97ab]">
                        {/* Автоматически сформируйте таблицу изменений между действующей и новой редакцией */}
                        {t("tidChangesTable.formDescription")}
                    </span>
                        <button
                            type="button"
                            onClick={onForm}
                            disabled={loading}
                            className="cursor-pointer flex items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                            {/* Сформировать ТИД */}
                            {t("tidChangesTable.formButton")}
                        </button>
                    </div>
                </>

            ) : (
                <>
                    <div className="mb-[10px] flex items-center justify-between gap-3">
                        <span className="text-[13.5px] font-bold text-[#1c2740]">
                            {/* Автоформирование ТИД */}
                            {t("tidChangesTable.header")}
                        </span>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={exporting || loading || totalRows === 0}
                            className="cursor-pointer flex items-center gap-2 rounded-[10px] border border-[#4e57d6] px-3 py-[7px] text-[12px] font-semibold text-[#4e57d6] transition-colors hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {exporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                            {/* Скачать сформированный ТИД в формате DOCX */}
                            {t("tidChangesTable.exportButton")}
                        </button>
                    </div>

                    {exportError && (
                        <div
                            className="mb-3 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                            {exportError}
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-[4px] border border-[#c9ced8]">
                        <table className="w-full table-fixed border-collapse text-[13px]">
                            <thead>
                            <tr className="bg-[#e9ebf0] text-center text-[12.5px] font-bold text-[#1c2740]">
                                <th className="border border-[#c9ced8] px-2 py-2 w-[44px]">
                                    {/* № */}
                                    {t("tidChangesTable.columnNumber")}
                                    <br/>
                                    {/* п/п */}
                                    {t("tidChangesTable.columnNumberSub")}
                                </th>
                                <th className="border border-[#c9ced8] px-3 py-2 w-[34%]">
                                    {/* Действующая редакция */}
                                    {t("tidChangesTable.columnOldRedaction")}
                                </th>
                                <th className="border border-[#c9ced8] px-3 py-2 w-[32%]">
                                    {/* Суть/обоснование предлагаемых изменений */}
                                    {t("tidChangesTable.columnJustification")}
                                </th>
                                <th className="border border-[#c9ced8] px-3 py-2 w-[34%]">
                                    {/* Новая редакция */}
                                    {t("tidChangesTable.columnNewRedaction")}
                                </th>
                                {!disabled && <th className="border border-[#c9ced8] px-2 py-2 w-10"/>}
                            </tr>
                            </thead>
                            <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={disabled ? 4 : 5}
                                        className="border border-[#c9ced8] px-4 py-6 text-center text-[#8b97ab]">
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin"/>
                                    {/* Сравнение редакций… */}
                                    {t("tidChangesTable.comparingLoading")}
                                </span>
                                    </td>
                                </tr>
                            )}

                            {!loading && unavailable && (
                                <tr>
                                    <td colSpan={disabled ? 4 : 5}
                                        className="border border-[#c9ced8] px-4 py-4 text-center text-[#8b97ab]">
                                        {/* Не удалось автоматически сравнить редакции — добавьте строки вручную */}
                                        {t("tidChangesTable.comparisonUnavailable")}
                                    </td>
                                </tr>
                            )}

                            {!loading && !unavailable && totalRows === 0 && (
                                <tr>
                                    <td colSpan={disabled ? 4 : 5}
                                        className="border border-[#c9ced8] px-4 py-4 text-center text-[#8b97ab]">
                                        {/* Строк пока нет */}
                                        {t("tidChangesTable.noRowsYet")}
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
                                            // Действующая редакция
                                            placeholder={t("tidChangesTable.columnOldRedaction")}
                                            // красным
                                            highlightOptions={[{color: REMOVE_COLOR, label: t("tidChangesTable.highlightRed")}]}
                                            disabled={disabled}
                                            onChangeText={(_text, html) =>
                                                setAutoEdits((prev) => ({
                                                    ...prev,
                                                    [row.id]: {...prev[row.id], oldHtml: html}
                                                }))
                                            }
                                        />
                                    </td>
                                    <td className="border border-[#c9ced8] px-3 py-3">
                                <textarea
                                    value={justifications[row.id] ?? ""}
                                    onChange={(e) => setJustifications((prev) => ({...prev, [row.id]: e.target.value}))}
                                    disabled={disabled}
                                    // Суть/обоснование предлагаемых изменений
                                    placeholder={t("tidChangesTable.columnJustification")}
                                    rows={2}
                                    className="h-[220px] w-full resize-y rounded-[8px] border border-[#e0e5ee] bg-white px-2 py-[6px] text-[12.5px] outline-none focus:border-[#4e57d6] disabled:bg-[#f6f8fb]"
                                />
                                    </td>
                                    <td className="border border-[#c9ced8] px-2 py-2">
                                        <RichDiffEditor
                                            initialHtml={segmentsToHtml(row.newSegments, ADD_COLOR)}
                                            // Новая редакция
                                            placeholder={t("tidChangesTable.columnNewRedaction")}
                                            // зелёным
                                            highlightOptions={[{color: ADD_COLOR, label: t("tidChangesTable.highlightGreen")}]}
                                            disabled={disabled}
                                            onChangeText={(_text, html) =>
                                                setAutoEdits((prev) => ({
                                                    ...prev,
                                                    [row.id]: {...prev[row.id], newHtml: html}
                                                }))
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
                                                // Удалить строку
                                                title={t("tidChangesTable.deleteRowTitle")}
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

                    {!disabled && (
                        <div className="mt-4 rounded-[10px] px-1 py-4">
                            <div className="mb-3 text-[12.5px] font-semibold text-[#1c2740]">
                                {/* Добавить строку */}
                                {t("tidChangesTable.addRow")}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <RichDiffEditor
                                    key={`draft-old-${draftKey}`}
                                    // Действующая редакция
                                    placeholder={t("tidChangesTable.columnOldRedaction")}
                                    // красным
                                    highlightOptions={[{color: REMOVE_COLOR, label: t("tidChangesTable.highlightRed")}]}
                                    onChangeText={(text, html) => {
                                        setDraftOldText(text);
                                        setDraftOldHtml(html);
                                    }}
                                />
                                <textarea
                                    value={draftJustification}
                                    onChange={(e) => setDraftJustification(e.target.value)}
                                    // Суть/обоснование предлагаемых изменений
                                    placeholder={t("tidChangesTable.columnJustification")}
                                    rows={2}
                                    className="h-[220px] resize-y rounded-[8px] border border-[#e0e5ee] bg-white px-2 py-[6px] text-[12.5px] outline-none focus:border-[#4e57d6]"
                                />
                                <RichDiffEditor
                                    key={`draft-new-${draftKey}`}
                                    // Новая редакция
                                    placeholder={t("tidChangesTable.columnNewRedaction")}
                                    // зелёным
                                    highlightOptions={[{color: ADD_COLOR, label: t("tidChangesTable.highlightGreen")}]}
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
                                {/* Добавить строку */}
                                {t("tidChangesTable.addRow")}
                            </button>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-semibold text-[#1c2740]">
                            {/* Разработчик: */}
                            {t("tidChangesTable.developerLabel")}
                        </span>
                        {canSelectResponsible && !disabled ? (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setDeveloperPickerOpen(true)}
                                    className="flex h-9 min-w-[240px] cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e0e5ee] bg-white px-3 text-left text-[12.5px] outline-none hover:border-[#4e57d6]/50 focus:border-[#4e57d6]"
                                >
                                    {responsibleUser ? (
                                        <span className="flex min-w-0 items-center gap-1.5">
                                    <span
                                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                                        {getInitials(responsibleUser.fullName)}
                                    </span>
                                    <span className="truncate text-[#26324a]">{responsibleUser.fullName}</span>
                                </span>
                                    ) : (
                                        <span className="text-[#a3adbd]">
                                            {/* Выбрать разработчика… */}
                                            {t("tidChangesTable.selectDeveloperPlaceholder")}
                                        </span>
                                    )}
                                    <ChevronDown size={14} className="flex-none text-[#8b97ab]"/>
                                </button>
                                {responsibleUser && (
                                    <button
                                        type="button"
                                        onClick={() => setResponsibleUser(null)}
                                        // Очистить
                                        title={t("tidChangesTable.clearTitle")}
                                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                    >
                                        <X size={15}/>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <span className="text-[#26324a]">
                        {developedBy
                            ? [developedBy.positionName, developedBy.fullName].filter(Boolean).join(", ")
                            : (
                                <span className="text-[#8b97ab]">
                                    {/* не указан */}
                                    {t("tidChangesTable.notSpecified")}
                                </span>
                            )}
                    </span>
                        )}
                    </div>

                    {developerPickerOpen && (
                        <TidDeveloperPickerModal
                            onClose={() => setDeveloperPickerOpen(false)}
                            onSelect={(u) => setResponsibleUser(u)}
                        />
                    )}
                </>
            )}
        </div>
    );
}