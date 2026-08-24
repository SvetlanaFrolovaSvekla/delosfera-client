// Модалка «Одобрить заявку на актуализацию» — открывается у главного редактора при клике
// «Одобрить» по заявке обычного редактора. Предзаполнена пожеланием заявителя насчёт сдвига
// срока следующей актуализации, но позволяет его скорректировать — если значение меняется,
// заявитель получит отдельное уведомление об этом (см. VndActualizationService.DecideRequestAsync).
import {useState} from "react";
import {createPortal} from "react-dom";
import {CheckCircle2, Loader2, X} from "lucide-react";

interface ApproveActualizationRequestModalProps {
    requestedByName: string;
    requestedShiftNextPeriod: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (shiftNextPeriod: boolean) => void;
}

export function ApproveActualizationRequestModal({
                                                       requestedByName,
                                                       requestedShiftNextPeriod,
                                                       submitting,
                                                       error,
                                                       onClose,
                                                       onConfirm,
                                                   }: ApproveActualizationRequestModalProps) {
    const [shiftNextPeriod, setShiftNextPeriod] = useState(requestedShiftNextPeriod);
    const overridden = shiftNextPeriod !== requestedShiftNextPeriod;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[440px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#e2f4ea] text-[#1c7a4d]">
                            <CheckCircle2 size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">Одобрить заявку</h2>
                    </div>
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50">
                        <X size={20}/>
                    </button>
                </div>

                <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                    <span className="font-semibold text-[#1c2740]">{requestedByName}</span> станет
                    ответственным за актуализацию этого документа.
                </p>

                <label className="flex cursor-pointer items-center gap-[10px] rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-[13px] text-[#3a4560] hover:bg-[#f6f8fb]">
                    <input
                        type="checkbox"
                        checked={shiftNextPeriod}
                        onChange={(e) => setShiftNextPeriod(e.target.checked)}
                        className="h-4 w-4 accent-[#4e57d6]"
                    />
                    Сдвинуть срок следующей актуализации после публикации
                </label>
                <p className="mt-1 px-1 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                    Пожелание заявителя: {requestedShiftNextPeriod ? "сдвинуть срок" : "не сдвигать срок"}.
                    {overridden && " Вы меняете это значение — заявитель получит отдельное уведомление."}
                </p>

                {error && (
                    <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50">
                        Отмена
                    </button>
                    <button
                        onClick={() => onConfirm(shiftNextPeriod)}
                        disabled={submitting}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#1c7a4d] px-4 text-[13px] font-semibold text-white hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        Одобрить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
