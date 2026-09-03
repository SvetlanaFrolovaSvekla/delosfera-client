// Модалка «Архивировать ВНД» — кнопка "Архивировать", доступна на любом статусе, кроме
// черновика (тот только удаляется — см. handleDelete в OpenVndPage.tsx) и уже архивированного.
// Оформляется № и датой отмены (служебная записка), без согласования — см.
// VndService.CancelAsync на бэке. После архивации все редакции документа перестают быть
// "текущими" (IsCurrent) — см. VndService.ToRedactionResponse на бэке.
import {useState} from "react";
import {createPortal} from "react-dom";
import {Archive, Loader2, X} from "lucide-react";
import {
    EditableDateField, EditableTextAreaField, EditableTextField
} from "@/components/componentsGeneral/RequisitesEditFields.tsx";

export interface CancelVndFields {
    cancelCode: string;
    cancelDate: string; // ISO "YYYY-MM-DD"
    cancelReason: string;
}

interface CancelVndModalProps {
    /** Идёт ли сейчас согласование этой ВНД (статус "На согласовании") — тогда архивация
     * автоматически отзовёт его на бэке, о чём нужно предупредить прямо в модалке. */
    hasActiveApproval: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (fields: CancelVndFields) => void;
}

export function CancelVndModal({hasActiveApproval, submitting, error, onClose, onConfirm}: CancelVndModalProps) {
    const [fields, setFields] = useState<CancelVndFields>({cancelCode: "", cancelDate: "", cancelReason: ""});
    const updateField = <K extends keyof CancelVndFields>(key: K, value: CancelVndFields[K]) =>
        setFields((prev) => ({...prev, [key]: value}));

    const valid = fields.cancelCode.trim() !== "" && fields.cancelDate !== "";

    const handleConfirm = () => {
        if (submitting || !valid) return;
        onConfirm(fields);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[520px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#fdecea] text-[#c0392b]">
                            <Archive size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Архивировать ВНД
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <p className="text-[13px] leading-[1.6] text-[#55617a]">
                    Документ и все его редакции перестанут быть действующими и получат статус{" "}
                    <span className="font-semibold text-[#c0392b]">«В архиве»</span>. Действие необратимо.
                    {hasActiveApproval && " Идущее согласование будет автоматически отозвано."}
                </p>

                {/* Реквизиты отмены — № и дата обязательны, причина по желанию */}
                <div className="mt-5 rounded-[12px] border border-[#e7ecf3] bg-[#fafbfd] p-4">
                    <div className="mb-3 text-[13px] font-medium leading-snug text-[#3a4560]">
                        Реквизиты отмены (служебная записка):
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <EditableTextField
                            label="№ отмены"
                            value={fields.cancelCode}
                            onChange={(v) => updateField("cancelCode", v)}
                            placeholder="12(3)"
                            required
                        />
                        <EditableDateField
                            label="Дата отмены"
                            value={fields.cancelDate}
                            onChange={(v) => updateField("cancelDate", v)}
                            required
                        />
                    </div>
                    <div className="mt-3">
                        <EditableTextAreaField
                            label="Причина отмены"
                            value={fields.cancelReason}
                            onChange={(v) => updateField("cancelReason", v)}
                            placeholder="Необязательно"
                            rows={2}
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !valid}
                        title={!valid ? "Заполните № и дату отмены" : undefined}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#c0392b] px-4 text-[13px] font-semibold text-white hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        Архивировать
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
