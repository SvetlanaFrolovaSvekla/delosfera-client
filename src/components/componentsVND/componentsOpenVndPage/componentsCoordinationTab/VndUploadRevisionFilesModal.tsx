// Модалка выбора файлов и комментария к исправленной редакции (RU обязателен, KG/EN опционально)
import {useState} from "react";
import {createPortal} from "react-dom";
import {FileUp, Trash2, X} from "lucide-react";

interface RevisionFiles {
    docRu: File | null;
    docKg: File | null;
    docEn: File | null;
}

interface RevisionFilesWithComment extends RevisionFiles {
    comment: string;
}

interface VndUploadRevisionFilesModalProps {
    initial: RevisionFilesWithComment;
    onClose: () => void;
    onConfirm: (data: RevisionFilesWithComment) => void;
}

interface FileSlotProps {
    label: string;
    required?: boolean;
    file: File | null;
    onChange: (file: File | null) => void;
}

function FileSlot({label, required, file, onChange}: FileSlotProps) {
    const inputId = `revision-file-${label}`;

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
                    <FileUp size={18}/>
                    <span className="text-[11.5px]">Выбрать файл (DOCX)</span>
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

export function VndUploadRevisionFilesModal({initial, onClose, onConfirm}: VndUploadRevisionFilesModalProps) {
    const [docRu, setDocRu] = useState<File | null>(initial.docRu);
    const [docKg, setDocKg] = useState<File | null>(initial.docKg);
    const [docEn, setDocEn] = useState<File | null>(initial.docEn);
    const [comment, setComment] = useState(initial.comment);

    const canConfirm = docRu !== null;

    const handleConfirm = () => {
        if (!docRu) return;
        onConfirm({docRu, docKg, docEn, comment});
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">Загрузка исправленной редакции</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <FileSlot label="Русский" required file={docRu} onChange={setDocRu}/>
                    <FileSlot label="Кыргызча" file={docKg} onChange={setDocKg}/>
                    <FileSlot label="English" file={docEn} onChange={setDocEn}/>

                    <label className="block text-[12.5px] font-semibold text-[#26324a]">
                        Комментарий о внесённых исправлениях
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="mt-[6px] w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] font-normal text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                        />
                    </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="cursor-pointer h-[38px] rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Прикрепить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}