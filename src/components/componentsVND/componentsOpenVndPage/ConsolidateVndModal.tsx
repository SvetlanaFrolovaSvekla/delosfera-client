// Модалка «Консолидировать согласованную версию» — завершающий шаг после согласования.
// Реальная публикация (когда именно можно публиковать редакцию) в жизни определяется
// руководством после дополнительных процессов — здесь просто фиксируется решение.
//
// "С изменениями" / "без изменений" здесь больше не спрашивается вручную: не-первая редакция
// в статусе "Консолидация" может появиться только через цикл актуализации (см.
// VndService.AddRedactionAsync — добавить редакцию действующему ВНД можно только в рамках
// актуализации), а цикл уже зафиксировал это на шаге "Выполнить актуализацию"
// (VndDocument.ActualizationPlannedNoChanges) — здесь только отображается итог.
import {useState} from "react";
import {createPortal} from "react-dom";
import {Layers, Loader2, X} from "lucide-react";
import {EditableDateField, EditableTextField} from "@/components/componentsGeneral/RequisitesEditFields.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";

export interface ConsolidateRequisites {
    adoptionCode: string;
    adoptionDate: string; // ISO "YYYY-MM-DD"
    effectiveDate: string; // ISO "YYYY-MM-DD"
}

interface ConsolidateVndModalProps {
    /** Первая редакция нового ВНД — тогда вопрос об изменениях не нужен, просто консолидация */
    isFirstRedaction: boolean;
    /** Заявлено ли для этого цикла актуализации "без изменений" (шаг "Выполнить актуализацию") —
     * определяет hadChanges автоматически. Не используется при isFirstRedaction. */
    plannedNoChanges: boolean;
    /** Текущие значения реквизитов ВНД — предзаполняют поля, но подтвердить/обновить их
     * нужно обязательно здесь же, перед публикацией (см. VndActualizationService.PublishAsync
     * на бэке — без непустого № принятия консолидация отклоняется). */
    initialRequisites: ConsolidateRequisites;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (hadChanges: boolean, requisites: ConsolidateRequisites) => void;
}

export function ConsolidateVndModal({
                                         isFirstRedaction,
                                         plannedNoChanges,
                                         initialRequisites,
                                         submitting,
                                         error,
                                         onClose,
                                         onConfirm,
                                     }: ConsolidateVndModalProps) {
    const hadChanges = isFirstRedaction ? true : !plannedNoChanges;

    const [requisites, setRequisites] = useState<ConsolidateRequisites>(initialRequisites);
    const updateRequisites = <K extends keyof ConsolidateRequisites>(key: K, value: ConsolidateRequisites[K]) =>
        setRequisites((prev) => ({...prev, [key]: value}));

    const requisitesValid =
        requisites.adoptionCode.trim() !== "" && requisites.adoptionDate !== "" && requisites.effectiveDate !== "";

    const handleConfirm = () => {
        if (submitting || !requisitesValid) return;
        onConfirm(hadChanges, requisites);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[520px] rounded-[16px] bg-white p-6 shadow-xl">
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
                    <p className="text-[13px] leading-[1.6] text-[#55617a]">
                        Актуализация прошла{" "}
                        <span className="font-semibold text-[#2a2352]">
                            {hadChanges ? "с изменениями документа" : "без изменений документа"}
                        </span>
                        {" "}— определено автоматически по шагу «Выполнить актуализацию». После консолидации
                        ВНД приобретёт статус «Действующий».
                    </p>
                )}

                {/* Реквизиты — обязательны для консолидации, см. комментарий на onConfirm выше */}
                <div className="mt-5 rounded-[12px] border border-[#e7ecf3] bg-[#fafbfd] p-4">
                    <div className="mb-3 flex items-center gap-1">
                        <HelpTooltip
                            content={
                                "№ и дата принятия указаны в выписке из протокола заседания органа утверждения. " +
                                "Номер имеет вид «46(6)», где 46 — номер протокола, а (6) — номер вопроса повестки дня. " +
                                "Дата вступления в силу — дата, с которой редакция становится действующей; " +
                                "до этого момента документ находится в статусе «Ожидание вступления в силу»."
                            }
                        />
                        <div className="text-[13px] font-medium leading-snug text-[#3a4560]">
                            Пожалуйста, заполните реквизиты:
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <EditableDateField
                            label="Дата принятия"
                            value={requisites.adoptionDate}
                            onChange={(v) => updateRequisites("adoptionDate", v)}
                            required
                        />
                        <EditableTextField
                            label="№ принятия"
                            value={requisites.adoptionCode}
                            onChange={(v) => updateRequisites("adoptionCode", v)}
                            placeholder="46(6)"
                            required
                        />
                        <EditableDateField
                            label="Дата вступления в силу"
                            value={requisites.effectiveDate}
                            onChange={(v) => updateRequisites("effectiveDate", v)}
                            required
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
                        disabled={submitting || !requisitesValid}
                        title={!requisitesValid ? "Заполните дату принятия, № принятия и дату вступления в силу" : undefined}
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
