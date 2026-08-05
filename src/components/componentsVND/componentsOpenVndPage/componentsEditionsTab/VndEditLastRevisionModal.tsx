// Компонента прямого редактирования последней редакции (замена файлов/описания, без согласования)
import {useState} from "react";
import {createPortal} from "react-dom";
import {FileUp, Loader2, Trash2, X} from "lucide-react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

interface VndEditLastRevisionModalProps {
    vndId: number;
    redaction: VndRedactionResponse;
    onClose: () => void;
    onSaved: (redaction: VndRedactionResponse) => void;
}

interface ReplaceFileSlotProps {
    label: string;
    file: File | null;
    onChange: (file: File | null) => void;
}

function ReplaceFileSlot({label, file, onChange}: ReplaceFileSlotProps) {
    const inputId = `edit-last-revision-file-${label}`;

    return (
        <div>
            <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">{label}</div>
            {!file ? (
                <label
                    htmlFor={inputId}
                    className="flex h-[56px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                >
                    <FileUp size={16}/>
                    <span className="text-[11.5px]">Заменить файл (необязательно)</span>
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
                        <Trash2 size={15}/>
                    </button>
                </div>
            )}
        </div>
    );
}

export function VndEditLastRevisionModal({vndId, redaction, onClose, onSaved}: VndEditLastRevisionModalProps) {
    const [docRu, setDocRu] = useState<File | null>(null);
    const [docKg, setDocKg] = useState<File | null>(null);
    const [docEn, setDocEn] = useState<File | null>(null);
    const [description, setDescription] = useState(redaction.description ?? "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasChanges =
        docRu !== null || docKg !== null || docEn !== null || description !== (redaction.description ?? "");

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.editLastRevisionDirectly(vndId, {
                docRu: docRu ?? undefined,
                docKg: docKg ?? undefined,
                docEn: docEn ?? undefined,
                description,
            });
            onSaved(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось сохранить изменения");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">Редактировать редакцию {redaction.code}</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>
                <p className="mb-5 text-[12px] text-[#8b97ab]">
                    Изменения применятся напрямую — без запуска согласования, без создания новой редакции
                    и без изменения даты актуализации.
                </p>

                <div className="flex flex-col gap-4">
                    <ReplaceFileSlot label="Русский" file={docRu} onChange={setDocRu}/>
                    <ReplaceFileSlot label="Кыргызча" file={docKg} onChange={setDocKg}/>
                    <ReplaceFileSlot label="English" file={docEn} onChange={setDocEn}/>

                    <div>
                        <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">Описание редакции</div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                        />
                    </div>

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
                        disabled={submitting || !hasChanges}
                        className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={15} className="animate-spin"/>}
                        Сохранить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}