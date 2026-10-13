// Обёртка над DisagreementMatrixTable: подсказка "что такое матрица разногласий", кнопка
// скачать шаблон, и выбор способа заполнения — сформировать в системе (табличкой, со
// покраской красным/зелёным/чёрным, как в ТИД) либо загрузить уже готовый файл DOCX.
// Встраивается внутри VndRevisionNeededPanel, когда инициатор выбрал "Частично согласен" или
// "Полностью не согласен" (см. RemarksAgreement).
import {useTranslation} from "react-i18next";
import {Download, FileUp, Trash2} from "lucide-react";
import type {DisagreementMatrixRowResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {DisagreementMatrixTable} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/DisagreementMatrixTable.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {downloadBlob} from "@/utils/docxWork/docxDisagreementMatrixExport.ts";
import disagreementMatrixTemplateBlankUrl from "@/assets/disagreementMatrix/disagreementMatrixTemplateBlank.docx?url";
import {MAX_FILE_SIZE} from "@/constants/validation/totalValidatuon.ts";
import {formatBytes} from "@/utils/formatBytes.ts";

export type DisagreementMatrixMode = "generate" | "upload";

interface VndDisagreementMatrixSectionProps {
    mode: DisagreementMatrixMode;
    onModeChange: (mode: DisagreementMatrixMode) => void;

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

    uploadedFile: File | null;
    onUploadedFileChange: (file: File | null) => void;
    fileError: string | null;
    onFileError: (error: string | null) => void;

    vndTitle?: string;
    exportFileName?: string;
    disabled?: boolean;
}

/** Радио-кнопка в общем стиле с "Согласны ли вы со всеми замечаниями?" выше в этой же панели. */
function ModeRadio({label, selected, onClick, disabled}: {
    label: string; selected: boolean; onClick: () => void; disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onClick}
            disabled={disabled}
            className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${
                selected
                    ? "border-[#4e57d6] bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                    : "border-[#e0e5ee] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
            }`}
        >
            <span
                className={`flex h-[16px] w-[16px] flex-none items-center justify-center rounded-full border-2 ${
                    selected ? "border-[#4e57d6]" : "border-[#c9ced8]"
                }`}
            >
                {selected && <span className="h-[8px] w-[8px] rounded-full bg-[#4e57d6]"/>}
            </span>
            {label}
        </button>
    );
}

export function VndDisagreementMatrixSection({
                                                  mode, onModeChange, rows, onAddRow, onUpdateRow, onDeleteRow,
                                                  uploadedFile, onUploadedFileChange, fileError, onFileError,
                                                  vndTitle, exportFileName, disabled,
                                              }: VndDisagreementMatrixSectionProps) {
    const {t} = useTranslation();
    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch(disagreementMatrixTemplateBlankUrl);
            if (!response.ok) {
                onFileError(t("coordinationUi.matrixSection.templateError"));
                return;
            }
            const blob = await response.blob();
            downloadBlob(blob, "Матрица разногласий_шаблон.docx");
        } catch (e) {
            onFileError(e instanceof Error ? e.message : t("coordinationUi.matrixSection.templateError"));
        }
    };

    const handlePick = (picked: File | null) => {
        if (picked && picked.size > MAX_FILE_SIZE) {
            onFileError(t("coordinationUi.matrixSection.fileTooLarge", {name: picked.name, size: formatBytes(MAX_FILE_SIZE)}));
            return;
        }
        onFileError(null);
        onUploadedFileChange(picked);
    };

    return (
        <div className="border-t border-[#e9edf3] px-5 py-4">
            <Clue className="mb-4">
                {t("coordinationUi.matrixSection.clue")}
            </Clue>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div role="radiogroup" className="flex flex-wrap gap-2">
                    <ModeRadio
                        label={t("coordinationUi.matrixSection.generate")}
                        selected={mode === "generate"}
                        onClick={() => onModeChange("generate")}
                        disabled={disabled}
                    />
                    <ModeRadio
                        label={t("coordinationUi.matrixSection.upload")}
                        selected={mode === "upload"}
                        onClick={() => onModeChange("upload")}
                        disabled={disabled}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex flex-none cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e5e9f0] bg-white px-[10px] py-[5px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#f6f8fb]"
                >
                    <Download size={13}/>
                    {t("coordinationUi.matrixSection.downloadTemplate")}
                </button>
            </div>

            {mode === "generate" && (
                <DisagreementMatrixTable
                    rows={rows}
                    onAddRow={onAddRow}
                    onUpdateRow={onUpdateRow}
                    onDeleteRow={onDeleteRow}
                    disabled={disabled}
                    vndTitle={vndTitle}
                    exportFileName={exportFileName}
                />
            )}

            {mode === "upload" && (
                <div className="px-0">
                    {!uploadedFile ? (
                        <label
                            htmlFor="upload-disagreement-matrix-file"
                            className="flex h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-white text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                        >
                            <FileUp size={18}/>
                            <span className="text-[11.5px]">{t("coordinationUi.matrixSection.chooseFile")}</span>
                            <input
                                id="upload-disagreement-matrix-file"
                                type="file"
                                accept=".doc,.docx"
                                className="hidden"
                                disabled={disabled}
                                onChange={(e) => {
                                    handlePick(e.target.files?.[0] ?? null);
                                    e.target.value = "";
                                }}
                            />
                        </label>
                    ) : (
                        <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
                            <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{uploadedFile.name}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => onUploadedFileChange(null)}
                                    className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                >
                                    <Trash2 size={15}/>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {fileError && <div className="mt-2 text-[12px] text-[#c0392b]">{fileError}</div>}
        </div>
    );
}
