// Модалка "Выполнить актуализацию": фиксирует финальные "сдвигать ли срок" и
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
import {Check, Loader2, RefreshCw, X} from "lucide-react";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";

interface PerformActualizationModalProps {
    mode: "direct" | "afterRequest";
    /** Только для mode === "afterRequest" — уже решённое значение сдвига срока, для читаемого показа */
    decidedShiftNextPeriod?: boolean;
    /** Заголовок окна — по умолчанию "Выполнить актуализацию"; переопределяется, когда окно
     * открыто повторно для изменения уже зафиксированных настроек. */
    title?: string;
    /** Текст кнопки подтверждения — по умолчанию "Сохранить". */
    confirmLabel?: string;
    /** Начальные значения чекбоксов — используются, когда окно открывается повторно для
     * изменения уже зафиксированных настроек (по умолчанию — true/false, как при первом заполнении). */
    initialShiftNextPeriod?: boolean;
    initialPlannedNoChanges?: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (data: { shiftNextPeriod: boolean; plannedNoChanges: boolean }) => void;
}

export function PerformActualizationModal({
                                              mode,
                                              decidedShiftNextPeriod,
                                              title,
                                              confirmLabel,
                                              initialShiftNextPeriod,
                                              initialPlannedNoChanges,
                                              submitting,
                                              error,
                                              onClose,
                                              onConfirm,
                                          }: PerformActualizationModalProps) {
    const [shiftNextPeriod, setShiftNextPeriod] = useState(initialShiftNextPeriod ?? true);
    const [plannedNoChanges, setPlannedNoChanges] = useState(initialPlannedNoChanges ?? false);

    const effectiveShift = mode === "afterRequest" ? !!decidedShiftNextPeriod : shiftNextPeriod;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                {/* Шапка */}
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span
                            className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <RefreshCw size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">{title ?? "Выполнить актуализацию"}</h2>
                    </div>
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50">
                        <X size={20}/>
                    </button>
                </div>
                {/* Поле "Сдвинуть срок следующей актуализации после публикации новой редакции" */}
                {mode === "afterRequest" ? (
                    <div
                        className="mb-4 rounded-[10px] border border-[#e5e9f0] bg-[#f6f8fb] px-3 py-[10px] text-[13px] text-[#3a4560]">
                        Сдвиг срока следующей актуализации уже решён при одобрении заявки:{" "}
                        <span className="font-semibold">
                            {effectiveShift ? "срок будет сдвинут" : "срок сдвигаться не будет"}
                        </span>.
                    </div>
                ) : (
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-[10px] text-[13px] text-[#3a4560]">
                            <span
                                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                                style={{
                                    borderColor: shiftNextPeriod ? "#4e57d6" : "#cbd3df",
                                    background: shiftNextPeriod ? "#4e57d6" : "white",
                                }}
                            >
                                <Check
                                    className="w-[13px] h-[13px] text-white"
                                    strokeWidth={3}
                                    style={{opacity: shiftNextPeriod ? 1 : 0}}
                                />
                            </span>
                            <input
                                type="checkbox"
                                checked={shiftNextPeriod}
                                onChange={(e) => setShiftNextPeriod(e.target.checked)}
                                className="hidden"
                            />
                            Сдвинуть срок следующей актуализации после публикации новой редакции
                        </label>
                        <HelpTooltip
                            content="Если включено, срок следующей плановой актуализации будет отсчитан заново от даты публикации новой редакции."/>
                    </div>
                )}
                {/* Поле "Актуализация без изменений" */}
                <div className="mt-4 flex items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-[10px] text-[13px] text-[#3a4560]">
                        <span
                            className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                            style={{
                                borderColor: plannedNoChanges ? "#4e57d6" : "#cbd3df",
                                background: plannedNoChanges ? "#4e57d6" : "white",
                            }}
                        >
                            <Check
                                className="w-[13px] h-[13px] text-white"
                                strokeWidth={3}
                                style={{opacity: plannedNoChanges ? 1 : 0}}
                            />
                        </span>
                        <input
                            type="checkbox"
                            checked={plannedNoChanges}
                            onChange={(e) => setPlannedNoChanges(e.target.checked)}
                            className="hidden"
                        />
                        Актуализация без изменений
                    </label>
                    <HelpTooltip
                        content="Отметьте, если документ не требует изменений — новая редакция не понадобится, действующая редакция отправляется на согласование как есть."/>
                </div>
                {plannedNoChanges && (
                    <p className="mt-4 px-1 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                        Заявлено, что актуализация пройдёт без изменений документа — новая редакция
                        не потребуется. Отправьте существующую действующую редакцию на согласование
                        во вкладке «Согласование», как есть, без загрузки нового файла. Новая
                        редакция появится, только если согласующие попросят доработку.
                    </p>
                )}

                {error && (
                    <div
                        className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
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
                        {confirmLabel ?? "Сохранить"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
