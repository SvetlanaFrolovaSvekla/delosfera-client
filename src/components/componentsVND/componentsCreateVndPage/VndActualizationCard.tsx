// Карточка "Срок актуализации" на странице разработки нового ВНД
import {useTranslation, Trans} from "react-i18next";
import {ACTUALIZATION_MODE_OPTIONS, type ActualizationMode} from "@/utils/vndProcess/vndActualizationUtils.ts";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

interface VndActualizationCardProps {
    actualizationMode: ActualizationMode;
    onActualizationModeChange: (mode: ActualizationMode) => void;
    computedDueDateDisplay: string;
    onManualDueDateChange: (v: string) => void;
    periodicityLabel: string;
    nextCycleInterval: string;
}

export function VndActualizationCard({
                                         actualizationMode,
                                         onActualizationModeChange,
                                         computedDueDateDisplay,
                                         onManualDueDateChange,
                                         periodicityLabel,
                                         nextCycleInterval,
                                     }: VndActualizationCardProps) {
    const {t} = useTranslation();
    const isDateFieldDisabled = actualizationMode !== "date";
    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl p-5 flex-1 flex flex-col">
            <div className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                {/* Срок актуализации */}
                {t("createVnd.actualizationCard.title")}
            </div>
            <p className="mt-2 mb-3 text-[11.5px] text-[#8b97ab] leading-[1.5]">
                {/* До какого числа нужно актуализировать ВНД. Выберите готовую периодичность (считается от даты
                создания) — или задайте дату вручную, тогда периодичность посчитается сама. */}
                {t("createVnd.actualizationCard.description")}
                <br/><br/>
                {/* Рекомендуется для документов вида «Кодекс» и «Политика» выставлять периодичность
                1 раз в год. Для всех остальных документов — 1 раз в два года. В будущем возможно проведение
                внеплановой актуализации. */}
                <Trans
                    i18nKey="createVnd.actualizationCard.recommendation"
                    components={{1: <b/>}}
                />
            </p>

            <div className="flex flex-col gap-1 mb-3">
                {ACTUALIZATION_MODE_OPTIONS.map((opt) => {
                    const isActive = actualizationMode === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => onActualizationModeChange(opt.key)}
                            className="w-full flex items-center gap-[9px] px-2.5 py-[7px] rounded-lg hover:bg-[#f6f8fb] text-left cursor-pointer"
                        >
                            <span
                                className={`w-[18px] h-[18px] flex-none rounded-full border-[1.5px] grid place-items-center ${
                                    isActive ? "border-[#4e57d6]" : "border-[#cbd3df]"
                                }`}
                            >
                                {isActive && <span className="w-[8px] h-[8px] rounded-full bg-[#4e57d6]"/>}
                            </span>
                            <span
                                className={`text-[12.5px] ${
                                    isActive ? "text-[#1c2740] font-semibold" : "text-[#3a4560]"
                                }`}
                            >
                                {/* 1 раз в год / 1 раз в два года / Ввод даты */}
                                {t(`createVnd.actualizationCard.modes.${opt.key}`)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <Tooltip
                /* Срок первой актуализации. Редактирование доступно только в режиме "Ввод даты" */
                content={t("createVnd.actualizationCard.dateTooltip")}
                disabled={!isDateFieldDisabled}
                className="w-full"
            >
                <DatePickerInput
                    value={computedDueDateDisplay}
                    onChange={onManualDueDateChange}
                    disabled={isDateFieldDisabled}
                    modal
                    /* Срок актуализации */
                    modalTitle={t("createVnd.actualizationCard.modalTitle")}
                />
            </Tooltip>

            <div className="mt-3 pt-3 border-t border-[#eef2f7] text-[12px] text-[#55617a] leading-[1.55]">
                {/* Периодичность: */}
                {t("createVnd.actualizationCard.periodicityLabel")}{" "}
                <b className="text-[#1c2740]">{periodicityLabel}</b>
            </div>

            {computedDueDateDisplay && (
                <div className="mt-1.5 text-[11px] text-[#8b97ab] leading-[1.5]">
                    {/* Срок первой актуализации будет до {{date}}, далее — через {{interval}} с даты фактической
                    актуализации ВНД по первому сроку. */}
                    {t("createVnd.actualizationCard.nextCycleHint", {
                        date: computedDueDateDisplay,
                        interval: nextCycleInterval,
                    })}
                </div>
            )}
        </div>
    );
}