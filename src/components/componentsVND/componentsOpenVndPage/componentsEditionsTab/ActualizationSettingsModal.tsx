// Модалка «Настройки актуализации» — открывается ссылкой под основной кнопкой сайдбара
// редакций, пока цикл актуализации идёт (vnd.status === "onact" && vnd.actualizationPerformed).
// Содержимое то же, что раньше показывалось прямо во вкладке «Редакции» без окна
// (см. ActualizationSettingsPanel) - по просьбе вернули как модалку, открываемую по клику.
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Settings2, X} from "lucide-react";
import {
    ActualizationSettingsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/ActualizationSettingsPanel.tsx";

interface ActualizationSettingsModalProps {
    plannedNoChanges: boolean;
    shiftNextPeriod: boolean;
    submitting: boolean;
    onTogglePlannedNoChanges: (next: boolean) => void;
    onClose: () => void;
}

export function ActualizationSettingsModal({
                                                 plannedNoChanges,
                                                 shiftNextPeriod,
                                                 submitting,
                                                 onTogglePlannedNoChanges,
                                                 onClose,
                                             }: ActualizationSettingsModalProps) {
    const {t} = useTranslation();

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Settings2 size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            {/* Настройки актуализации */}
                            {t("openVndPage.redactionsSidebar.actualizationSettings.title")}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <ActualizationSettingsPanel
                    plannedNoChanges={plannedNoChanges}
                    shiftNextPeriod={shiftNextPeriod}
                    submitting={submitting}
                    onTogglePlannedNoChanges={onTogglePlannedNoChanges}
                />

                <div className="mt-4 flex justify-center">
                    <button
                        onClick={onClose}
                        className="cursor-pointer h-[38px] rounded-[10px] bg-[#4e57d6] px-6 text-[13px] font-semibold text-white hover:bg-[#3f47bd]"
                    >
                        {t("general.ok")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
