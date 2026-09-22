// Содержимое модалки «Настройки актуализации» (см. ActualizationSettingsModal) — открывается
// ссылкой под основной кнопкой сайдбара «Редакции», пока цикл актуализации идёт
// (vnd.status === "onact" && vnd.actualizationPerformed).
//
// Единственное, что здесь можно переключить - чекбокс "Актуализация без изменений". Сдвиг срока
// следующей актуализации здесь больше НЕ редактируется никем (даже главным редактором) - это
// право есть только у главного редактора, и реализуется оно только в момент принятия решения
// (одобрение заявки - ApproveActualizationRequestModal, либо прямой старт - PerformActualizationModal
// mode="direct"), значение после этого фиксируется на весь цикл. Здесь оно только показывается
// "к вашему сведению" - облачком-подсказкой рядом с чекбоксом.
import {useTranslation} from "react-i18next";
import {Check} from "lucide-react";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";

interface ActualizationSettingsPanelProps {
    plannedNoChanges: boolean;
    shiftNextPeriod: boolean;
    submitting: boolean;
    onTogglePlannedNoChanges: (next: boolean) => void;
}

export function ActualizationSettingsPanel({
                                                plannedNoChanges,
                                                shiftNextPeriod,
                                                submitting,
                                                onTogglePlannedNoChanges,
                                            }: ActualizationSettingsPanelProps) {
    const {t} = useTranslation();

    // "Сдвиг срока следующей актуализации решает главный редактор ВНД: срок будет/не будет
    // сдвинут." - то же самое решённое значение, что и в уведомлении об одобрении заявки,
    // здесь просто для справки, облачком у чекбокса.
    const shiftInfo = `${t("openVndPage.redactionsSidebar.actualizationSettings.shiftDecidedByChiefEditor")} ${
        shiftNextPeriod
            ? t("performActualizationModal.shiftWillBeApplied")
            : t("performActualizationModal.shiftWillNotBeApplied")
    }.`;

    return (
        <div className="mt-2 flex flex-col gap-2 px-1">
            <div className="flex items-start gap-1 rounded-[10px] border border-[#e5e9f0] bg-[#f6f8fb] px-3 py-[10px]">
                <p className="text-[11.5px] leading-[1.5] text-[#55617a]">
                    {t("openVndPage.redactionsSidebar.actualizationSettings.introHint")}
                </p>
                <HelpTooltip content={t("openVndPage.redactionsSidebar.actualizationSettings.introHintTooltip")}/>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[#e5e9f0] px-3 py-[10px]">
                <label className={`flex items-center gap-[10px] text-[12.5px] text-[#3a4560] ${
                    submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}>
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
                        disabled={submitting}
                        onChange={(e) => onTogglePlannedNoChanges(e.target.checked)}
                        className="hidden"
                    />
                    {t("openVndPage.redactionsSidebar.actualizationSettings.plannedNoChangesLabel")}
                </label>
                <HelpTooltip content={shiftInfo}/>
            </div>
        </div>
    );
}
