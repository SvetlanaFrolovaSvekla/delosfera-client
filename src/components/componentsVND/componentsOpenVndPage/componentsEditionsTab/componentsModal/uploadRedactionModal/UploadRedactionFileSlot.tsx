// Поле выбора одного файла редакции (русский/кыргызский/английский текст)
import {useTranslation} from "react-i18next";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {
    fileTooLargeMessage,
    REDACTION_FILE_ACCEPT,
    REDACTION_MAX_FILE_SIZE
} from "@/utils/vndProcess/uploadRedactionFiles.ts";
import {FileUp, Trash2} from "lucide-react";

interface UploadRedactionFileSlotProps {
    label: string;
    required?: boolean;
    hint?: string;
    accept?: string;
    file: File | null;
    onChange: (file: File | null) => void;
    /** Вызывается с текстом ошибки, если выбранный файл превышает REDACTION_MAX_FILE_SIZE
     * (в этом случае файл НЕ принимается - onChange не вызывается вовсе), и с null на
     * успешный выбор, чтобы сбросить возможную предыдущую ошибку. */
    onError?: (message: string | null) => void;
}

export function UploadRedactionFileSlot({
                                            label,
                                            required,
                                            hint,
                                            accept = REDACTION_FILE_ACCEPT,
                                            file,
                                            onChange,
                                            onError,
                                        }: UploadRedactionFileSlotProps) {
    const {t} = useTranslation();
    const inputId = `redaction-file-${label}`;

    const handlePick = (picked: File | null) => {
        if (picked && picked.size > REDACTION_MAX_FILE_SIZE) {
            onError?.(fileTooLargeMessage(picked.name, t));
            return;
        }
        onError?.(null);
        onChange(picked);
    };

    return (
        <div>
            <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">
                {label} {required
                ? <span className="text-[#c0392b]">*</span>
                : <span className="text-[#8b97ab] font-normal">{t("vndUploadRedactionModal.optional")}</span>}
            </div>
            {hint && <div className="mb-[6px] text-[11.5px] text-[#8b97ab]">{hint}</div>}
            {!file ? (
                <label
                    htmlFor={inputId}
                    className={`flex h-[70px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb] ${
                        required ? "border-[#e8b4b4] bg-[#fdf1f1]" : "border-[#d5dae3] bg-[#fbfcfe]"
                    }`}
                >
                    <FileUp size={18}/>
                    <span className="text-[11.5px]">{t("vndUploadRedactionModal.chooseFile")}</span>
                    <input
                        id={inputId}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                            handlePick(e.target.files?.[0] ?? null);
                            e.target.value = ""; // чтобы можно было выбрать тот же файл повторно после ошибки
                        }}
                    />
                </label>
            ) : (
                <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
                    <Tooltip content={file.name} side="top" className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-[#26324a]">{file.name}</span>
                    </Tooltip>
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
