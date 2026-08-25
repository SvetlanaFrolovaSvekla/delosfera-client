// Модалка «Выполнить актуализацию» — шаг Б: фиксирует финальные "сдвигать ли срок" и
// "актуализация без изменений" для уже начатого цикла (документ уже в статусе "На актуализации").
// До этого шага загрузка новой редакции заблокирована на бэке (VndDocument.ActualizationPerformed).
//
// Два режима:
// - "direct" — цикл начат напрямую главным редактором (StartActualizationRequest); оба поля
//   редактируются здесь впервые, вызывает actualizationService.perform.
// - "afterRequest" — цикл начинается по одобренной заявке (обычный редактор); сдвиг срока уже
//   решён при одобрении заявки (см. ActualizationRequestDecisionRequest.shiftNextPeriod) и здесь
//   только показывается для справки, редактируется только "без изменений", вызывает
//   actualizationService.confirmStart.
import {useState} from "react";
import {createPortal} from "react-dom";
import {Loader2, RefreshCw, X} from "lucide-react";

interface PerformActualizationModalProps {
    mode: "direct" | "afterRequest";
    /** Только для mode === "afterRequest" — уже решённое значение сдвига срока, для читаемого показа */
    decidedShiftNextPeriod?: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (data: { shiftNextPeriod: boolean; plannedNoChanges: boolean }) => void;
}

export function PerformActualizationModal({
                                                mode,
                                                decidedShiftNextPeriod,
                                                submitting,
                                                error,
                                                onClose,
                                                onConfirm,
                                            }: PerformActualizationModalProps) {
    const [shiftNextPeriod, setShiftNextPeriod] = useState(true);
    const [plannedNoChanges, setPlannedNoChanges] = useState(false);

    const effectiveShift = mode === "afterRequest" ? !!decidedShiftNextPeriod : shiftNextPeriod;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <RefreshCw size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">Выполнить актуализацию</h2>
                    </div>
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50">
                        <X size={20}/>
                    </button>
                </div>

                {mode === "afterRequest" ? (
                    <div className="mb-4 rounded-[10px] border border-[#e5e9f0] bg-[#f6f8fb] px-3 py-[10px] text-[13px] text-[#3a4560]">
                        Сдвиг срока следующей актуализации уже решён при одобрении заявки:{" "}
                        <span className="font-semibold">
                            {effectiveShift ? "срок будет сдвинут" : "срок сдвигаться не будет"}
                        </span>.
                    </div>
                ) : (
                    <label className="mb-2 flex cursor-pointer items-center gap-[10px] rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-[13px] text-[#3a4560] hover:bg-[#f6f8fb]">
                        <input type="checkbox" checked={shiftNextPeriod}
                               onChange={(e) => setShiftNextPeriod(e.target.checked)}
                               className="h-4 w-4 accent-[#4e57d6]"/>
                        Сдвинуть срок следующей актуализации после публикации новой редакции
                    </label>
                )}

                <label className="mt-2 flex cursor-pointer items-center gap-[10px] rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-[13px] text-[#3a4560] hover:bg-[#f6f8fb]">
                    <input type="checkbox" checked={plannedNoChanges}
                           onChange={(e) => setPlannedNoChanges(e.target.checked)}
                           className="h-4 w-4 accent-[#4e57d6]"/>
                    Актуализация без изменений
                </label>
                {plannedNoChanges && (
                    <p className="mt-1 px-1 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                        Заявлено, что актуализация пройдёт без изменений документа — новая редакция
                        не потребуется. Отправьте существующую действующую редакцию на согласование
                        во вкладке «Согласование», как есть, без загрузки нового файла. Новая
                        редакция появится, только если согласующие попросят доработку.
                    </p>
                )}

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
                        onClick={() => onConfirm({shiftNextPeriod: effectiveShift, plannedNoChanges})}
                        disabled={submitting}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        Сохранить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
