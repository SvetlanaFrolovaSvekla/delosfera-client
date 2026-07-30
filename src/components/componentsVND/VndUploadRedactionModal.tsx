// Компонента загрузки новой редакции
import { useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { vndService } from "@/service/vndService/vndService.ts";
import type { VndRedactionResponse } from "@/service/vndService/vndServiceType.ts";

interface VndUploadRedactionModalProps {
    vndId: number;
    onClose: () => void;
    onUploaded: (redaction: VndRedactionResponse) => void;
}

interface FileSlotProps {
    label: string;
    required?: boolean;
    file: File | null;
    onChange: (file: File | null) => void;
}

function FileSlot({ label, required, file, onChange }: FileSlotProps) {
    const inputId = `redaction-file-${label}`;

    return (
        <div>
            <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">
                {label} {required && <span className="text-[#c0392b]">*</span>}
            </div>
            {!file ? (
                <label
                    htmlFor={inputId}
                    className="flex h-[70px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                >
                    <FileUp size={18} />
                    <span className="text-[11.5px]">Выбрать файл (DOC/DOCX/PDF)</span>
                    <input
                        id={inputId}
                        type="file"
                        accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx"
                        className="hidden"
                        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                    />
                </label>
            ) : (
                <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
                    <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{file.name}</span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ — совпадает с лимитом на бэке

export function VndUploadRedactionModal({ vndId, onClose, onUploaded }: VndUploadRedactionModalProps) {
    const [docRu, setDocRu] = useState<File | null>(null);
    const [docKg, setDocKg] = useState<File | null>(null);
    const [docEn, setDocEn] = useState<File | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [description, setDescription] = useState("");
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = docRu !== null && !submitting;

    const handleAddAttachments = (files: FileList | null) => {
        if (!files) return;
        const incoming = Array.from(files);

        const oversized = incoming.find((f) => f.size > MAX_FILE_SIZE);
        if (oversized) {
            setError(`Файл «${oversized.name}» превышает допустимый размер (50 МБ)`);
            return;
        }

        setError(null);
        setAttachments((prev) => [...prev, ...incoming]);
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!docRu) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.addRedaction(vndId, {
                docRu,
                docKg,
                docEn,
                description: description.trim() || undefined,
                requiresApproval,
                attachments,
            });
            onUploaded(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось загрузить редакцию");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">Загрузка новой редакции</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <FileSlot label="Русский" required file={docRu} onChange={setDocRu} />
                    <FileSlot label="Кыргызча" file={docKg} onChange={setDocKg} />
                    <FileSlot label="English" file={docEn} onChange={setDocEn} />

                    <div>
                        <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">
                            Вложения <span className="text-[#8b97ab] font-normal">(необязательно, можно несколько)</span>
                        </div>

                        <label
                            htmlFor="redaction-attachments"
                            className="flex h-[56px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                        >
                            <span className="flex items-center gap-2 text-[11.5px]">
                                <Paperclip size={15} />
                                Добавить файлы
                            </span>
                            <input
                                id="redaction-attachments"
                                type="file"
                                multiple
                                accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx"
                                className="hidden"
                                onChange={(e) => {
                                    handleAddAttachments(e.target.files);
                                    e.target.value = ""; // сброс, чтобы можно было выбрать тот же файл повторно
                                }}
                            />
                        </label>

                        {attachments.length > 0 && (
                            <div className="mt-2 flex flex-col gap-[6px]">
                                {attachments.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-[8px]"
                                    >
                                        <Paperclip size={14} className="flex-none text-[#8b97ab]" />
                                        <span className="flex-1 truncate text-[12px] text-[#26324a]">{file.name}</span>
                                        <span className="flex-none text-[11px] text-[#a3adbd]">
                                            {formatBytes(file.size)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">
                            Описание редакции <span className="text-[#8b97ab] font-normal">(необязательно)</span>
                        </div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Что изменилось в этой редакции…"
                            rows={3}
                            className="w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                        />
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#26324a]">
                        <input
                            type="checkbox"
                            checked={requiresApproval}
                            onChange={(e) => setRequiresApproval(e.target.checked)}
                            className="h-4 w-4 rounded border-[#d5dae3] accent-[#4e57d6]"
                        />
                        Требуется согласование
                    </label>

                    {error && (
                        <div className="rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={15} className="animate-spin" />}
                        Загрузить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}