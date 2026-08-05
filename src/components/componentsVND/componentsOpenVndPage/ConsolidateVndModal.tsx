// Модалка «Консолидировать согласованную версию» — завершающий шаг после согласования.
// Реальная публикация (когда именно можно публиковать редакцию) в жизни определяется
// руководством после дополнительных процессов — здесь просто фиксируется решение.
import {useState} from "react";
import {createPortal} from "react-dom";
import {Layers, Loader2, X} from "lucide-react";

interface ConsolidateVndModalProps {
    /** Первая редакция нового ВНД — тогда вопрос об изменениях не нужен, просто консолидация */
    isFirstRedaction: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (hadChanges: boolean) => void;
}

export function ConsolidateVndModal({
                                         isFirstRedaction,
                                         submitting,
                                         error,
                                         onClose,
                                         onConfirm,
                                     }: ConsolidateVndModalProps) {
    const [hadChanges, setHadChanges] = useState<boolean | null>(isFirstRedaction ? true : null);

    const canConfirm = hadChanges !== null && !submitting;

    const handleConfirm = () => {
        if (hadChanges === null) return;
        onConfirm(hadChanges);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#efeafe] text-[#7a5ce0]">
                            <Layers size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Консолидировать согласованную версию
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

                {isFirstRedaction ? (
                    <p className="text-[13px] leading-[1.6] text-[#55617a]">
                        Это первая редакция документа. После консолидации ВНД приобретёт статус «Действующий».
                    </p>
                ) : (
                    <div>
                        <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                            Отметьте, прошла ли актуализация с изменениями. После консолидации ВНД приобретёт
                            статус «Действующий».
                        </p>

                        <div className="flex flex-col gap-2">
                            <RadioRow
                                label="Актуализация прошла с изменениями"
                                checked={hadChanges === true}
                                onSelect={() => setHadChanges(true)}
                            />
                            <RadioRow
                                label="Актуализация прошла без изменений"
                                checked={hadChanges === false}
                                onSelect={() => setHadChanges(false)}
                            />
                        </div>
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
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#7a5ce0] px-4 text-[13px] font-semibold text-white hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        Консолидировать согласованную версию
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
                    ? "border-[#7a5ce0] bg-[#f4f0ff] text-[#2a2352]"
                    : "border-[#e5e9f0] text-[#3a4560] hover:bg-[#f6f8fb]"
            }`}
        >
            <span
                className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                    checked ? "border-[#7a5ce0]" : "border-[#c7cedb]"
                }`}
            >
                {checked && <span className="h-[8px] w-[8px] rounded-full bg-[#7a5ce0]"/>}
            </span>
            {label}
        </button>
    );
}
