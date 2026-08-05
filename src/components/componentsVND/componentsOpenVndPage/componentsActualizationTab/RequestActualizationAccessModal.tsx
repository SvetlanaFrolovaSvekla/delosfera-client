// Модалка «Запросить доступ к актуализации» — для пользователей, у которых нет
// права брать ВНД в актуализацию напрямую, только "по запросу" у главного редактора.
import {useState} from "react";
import {createPortal} from "react-dom";
import {Loader2, Send, X} from "lucide-react";

interface RequestActualizationAccessModalProps {
    canWithoutApproval: boolean;
    canWithApproval: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (data: {requiresApproval: boolean}) => void;
}

export function RequestActualizationAccessModal({
                                                      canWithoutApproval,
                                                      canWithApproval,
                                                      submitting,
                                                      error,
                                                      onClose,
                                                      onConfirm,
                                                  }: RequestActualizationAccessModalProps) {
    const [requiresApproval, setRequiresApproval] = useState<boolean>(!canWithoutApproval);
    const canChoose = canWithoutApproval && canWithApproval;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[440px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Send size={18} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Запросить доступ к актуализации
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

                <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                    Заявка уйдёт главному редактору ВНД. После одобрения вы сможете подтвердить старт актуализации.
                </p>

                {canChoose && (
                    <div className="flex flex-col gap-2">
                        <RadioRow
                            label="С последующим согласованием"
                            checked={requiresApproval}
                            onSelect={() => setRequiresApproval(true)}
                        />
                        <RadioRow
                            label="Без согласования"
                            checked={!requiresApproval}
                            onSelect={() => setRequiresApproval(false)}
                        />
                    </div>
                )}

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
                        onClick={() => onConfirm({requiresApproval})}
                        disabled={submitting}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        Отправить заявку
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function RadioRow({label, checked, onSelect}: {label: string; checked: boolean; onSelect: () => void}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex cursor-pointer items-center gap-[10px] rounded-[10px] border px-3 py-[10px] text-left text-[13px] transition-colors ${
                checked
                    ? "border-[#4e57d6] bg-[#ececfc] text-[#1c2740]"
                    : "border-[#e5e9f0] text-[#3a4560] hover:bg-[#f6f8fb]"
            }`}
        >
            <span
                className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                    checked ? "border-[#4e57d6]" : "border-[#c7cedb]"
                }`}
            >
                {checked && <span className="h-[8px] w-[8px] rounded-full bg-[#4e57d6]"/>}
            </span>
            {label}
        </button>
    );
}
