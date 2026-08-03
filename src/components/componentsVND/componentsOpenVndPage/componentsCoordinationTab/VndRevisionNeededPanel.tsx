import {useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {AlertCircle, Paperclip, Trash2} from "lucide-react";
import {VndUploadRevisionFilesModal} from "./VndUploadRevisionFilesModal.tsx";
import {DisagreementMatrixTable} from "./DisagreementMatrixTable.tsx";


interface VndRevisionNeededPanelProps {
    vndId: number;
    process: ApprovalProcessResponse;
    /** Вызывается после успешной отправки (resubmit) или изменения матрицы, чтобы перезагрузить процесс */
    onChanged: () => Promise<void>;
}

/** Собираем замечания по редакции — с любого этапа (первичный / повторный / финальная
 * выдержка), т.к. RevisionNeeded может наступить после любого из них. Замечанием
 * считается комментарий именно к решению "approved_with_comment" (отправлено на
 * устранение замечаний) — комментарий к простому "approved" сюда не попадает. */
function collectRemarks(process: ApprovalProcessResponse) {
    return process.stages.flatMap((stage) => {
        const remarks: { approverName: string; phase: string; comment: string }[] = [];

        if (stage.primaryComment && stage.primaryDecision === "approved_with_comment") {
            remarks.push({
                approverName: stage.approverName,
                phase: "Первичное согласование",
                comment: stage.primaryComment
            });
        }
        if (stage.repeatComment && stage.repeatDecision === "approved_with_comment") {
            remarks.push({
                approverName: stage.approverName,
                phase: "Повторное согласование",
                comment: stage.repeatComment
            });
        }
        if (stage.finalHoldComment && stage.finalHoldDecision === "approved_with_comment") {
            remarks.push({
                approverName: stage.approverName,
                phase: "Финальная выдержка",
                comment: stage.finalHoldComment
            });
        }
        return remarks;
    });
}

/** Комментарии к простому согласованию ("approved") — не замечания, а просто
 * пояснения согласующего. Показываем отдельным блоком, и только если они есть. */
function collectApprovalComments(process: ApprovalProcessResponse) {
    return process.stages.flatMap((stage) => {
        const comments: { approverName: string; phase: string; comment: string }[] = [];

        if (stage.primaryComment && stage.primaryDecision === "approved") {
            comments.push({
                approverName: stage.approverName,
                phase: "Первичное согласование",
                comment: stage.primaryComment
            });
        }
        if (stage.repeatComment && stage.repeatDecision === "approved") {
            comments.push({
                approverName: stage.approverName,
                phase: "Повторное согласование",
                comment: stage.repeatComment
            });
        }
        if (stage.finalHoldComment && stage.finalHoldDecision === "approved") {
            comments.push({
                approverName: stage.approverName,
                phase: "Финальная выдержка",
                comment: stage.finalHoldComment
            });
        }
        return comments;
    });
}

export function VndRevisionNeededPanel({vndId, process, onChanged}: VndRevisionNeededPanelProps) {
    const [docRu, setDocRu] = useState<File | null>(null);
    const [docKg, setDocKg] = useState<File | null>(null);
    const [docEn, setDocEn] = useState<File | null>(null);
    const [comment, setComment] = useState("");
    const [agreesWithAllRemarks, setAgreesWithAllRemarks] = useState<boolean | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const remarks = collectRemarks(process);
    const approvalComments = collectApprovalComments(process);
    const rows = process.disagreementMatrixRows;

    const canSubmit =
        agreesWithAllRemarks !== null &&
        (agreesWithAllRemarks === true || rows.length > 0) &&
        !submitting;

    const handleAddRow = async (row: {
        developerPosition: string;
        opponentPosition: string;
        developerJustification?: string;
    }) => {
        await coordinationService.addDisagreementRow(vndId, row);
        await onChanged();
    };

    const handleDeleteRow = async (rowId: number) => {
        await coordinationService.deleteDisagreementRow(vndId, rowId);
        await onChanged();
    };

    const handleSubmit = async () => {
        if (agreesWithAllRemarks === null) return;
        setSubmitting(true);
        setError(null);
        try {
            await coordinationService.resubmit(vndId, {
                docRu: docRu ?? undefined,
                docKg: docKg ?? undefined,
                docEn: docEn ?? undefined,
                comment: comment.trim() || undefined,
                agreesWithAllRemarks,
            });
            await onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось отправить редакцию");
        } finally {
            setSubmitting(false);
        }
    };

    // TODO: AlertCircle - при наведении добавить подсказку, что замечания необходимо исправить!

    return (
        <div className="mt-6 space-y-5">
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#d62815]"/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">Замечания при согласовании:</span>
                </div>
                <div className="divide-y divide-[#eef2f7]">
                    {remarks.length === 0 && (
                        <div className="px-5 py-4 text-[13px] text-[#8b97ab]">Замечаний нет</div>
                    )}
                    {remarks.map((r, i) => (
                        <div key={i} className="px-5 py-3 text-[13px] leading-[1.6]">
                            <div className="font-semibold text-[#1c2740]">
                                {r.approverName} <span className="font-normal text-[#8b97ab]">· {r.phase}</span>
                            </div>
                            <div className="text-[#3c424a]">{r.comment}</div>
                        </div>
                    ))}
                </div>
            </div>

            {approvalComments.length > 0 && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                        Комментарии при согласовании:
                    </div>
                    <div className="divide-y divide-[#eef2f7]">
                        {approvalComments.map((c, i) => (
                            <div key={i} className="px-5 py-3 text-[13px] leading-[1.6]">
                                <div className="font-semibold text-[#1c2740]">
                                    {c.approverName} <span className="font-normal text-[#8b97ab]">· {c.phase}</span>
                                </div>
                                <div className="text-[#3c424a]">{c.comment}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                    Загрузить редакцию с исправленными замечаниями
                </div>

                <div className="px-5 py-4">
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06]"
                        >
                            {docRu ? "Изменить файлы" : "Загрузить файл"}
                        </button>
                    </div>

                    {docRu && (
                        <div className="mt-4 flex flex-col gap-[6px]">
                            {[
                                {label: "RU", file: docRu, onRemove: () => setDocRu(null)},
                                ...(docKg ? [{label: "KG", file: docKg, onRemove: () => setDocKg(null)}] : []),
                                ...(docEn ? [{label: "EN", file: docEn, onRemove: () => setDocEn(null)}] : []),
                            ].map(({label, file, onRemove}) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[8px]"
                                >
                                    <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                                    <span className="flex-none text-[11.5px] font-semibold text-[#8b97ab]">{label}</span>
                                    <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={onRemove}
                                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}

                            {comment && (
                                <div className="rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[8px] text-[12.5px] leading-[1.5] text-[#3c424a]">
                                    <span className="font-semibold text-[#8b97ab]">Комментарий: </span>
                                    {comment}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isUploadModalOpen && (
                <VndUploadRevisionFilesModal
                    initial={{docRu, docKg, docEn, comment}}
                    onClose={() => setIsUploadModalOpen(false)}
                    onConfirm={(data) => {
                        setDocRu(data.docRu);
                        setDocKg(data.docKg);
                        setDocEn(data.docEn);
                        setComment(data.comment);
                        setIsUploadModalOpen(false);
                    }}
                />
            )}

            {/* Единый блок: вопрос "согласны ли" + (при "Нет") матрица разногласий сразу внутри него */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                    Согласны ли вы со всеми замечаниями?
                </div>
                <div className="px-5 py-4">
                    <div role="radiogroup" className="flex gap-3">
                        {([
                            {label: "Да", value: true},
                            {label: "Нет", value: false},
                        ] as const).map(({label, value}) => {
                            const isSelected = agreesWithAllRemarks === value;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    onClick={() => setAgreesWithAllRemarks(value)}
                                    className={`bg-white text-[#3a4560] font-medium hover:bg-[#f6f8fb] inline-flex items-center gap-2 h-9 px-4 rounded-[9px] text-[13px] cursor-pointer transition-colors`}
                                >
                                    <span
                                        className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                                            isSelected ? "border-[#4e57d6]" : "border-[#c3c9d4]"
                                        }`}
                                    >
                                        {isSelected && <span className="h-[8px] w-[8px] rounded-full bg-[#4e57d6]"/>}
                                    </span>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {agreesWithAllRemarks === false && (
                    <div>
                        <DisagreementMatrixTable rows={rows} onAddRow={handleAddRow} onDeleteRow={handleDeleteRow}/>
                    </div>
                )}
            </div>

            {error && (
                <div
                    className="rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {/* Обернули кнопку и связанное с ней сообщение в flex flex-col items-center */}
            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="hover:brightness-[1.06] cursor-pointer rounded-[10px] bg-[#4e57d6] px-5 py-[10px] text-[13px] font-semibold text-white disabled:opacity-40"
                >
                    {submitting
                        ? "Отправка…"
                        : agreesWithAllRemarks === false
                            ? "Отправить на финальную выдержку"
                            : "Отправить на повторное согласование"}
                </button>

                {agreesWithAllRemarks === false && rows.length === 0 && (
                    <div className="text-[12px] text-[#8b97ab]">
                        Добавьте хотя бы одну строку в матрицу разногласий, чтобы отправить.
                    </div>
                )}
            </div>
        </div>
    );
}