// Модалка «Запросить доступ к актуализации» — для пользователей, у которых нет
// права брать ВНД в актуализацию напрямую, только "по запросу" у главного редактора.
//
// Упрощено: заявка всегда уходит "с последующим согласованием" (без согласования может
// начать актуализацию только главный редактор, напрямую - см. StartActualizationModal) и
// без "пожелания" по сдвигу срока следующей актуализации - это решает исключительно
// главный редактор при одобрении заявки (см. ApproveActualizationRequestModal). Поэтому
// здесь больше нет выбора - только подтверждение отправки заявки.
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Loader2, Send, X} from "lucide-react";

interface RequestActualizationAccessModalProps {
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function RequestActualizationAccessModal({
                                                    submitting,
                                                    error,
                                                    onClose,
                                                    onConfirm,
                                                }: RequestActualizationAccessModalProps) {
    const {t} = useTranslation();

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[440px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Send size={18} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            {/* Запросить доступ к актуализации */}
                            {t("requestActualizationAccessModal.title")}
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
                    {/* Заявка уйдёт главному редактору ВНД. После одобрения вы сможете
                    заняться актуализацией. */}
                    {t("requestActualizationAccessModal.infoText")}
                </p>

                {error && (
                    <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-center gap-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50"
                    >
                        {/* Отмена */}
                        {t("requestActualizationAccessModal.cancel")}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={submitting}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        {/* Отправить заявку */}
                        {t("requestActualizationAccessModal.submitButton")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
