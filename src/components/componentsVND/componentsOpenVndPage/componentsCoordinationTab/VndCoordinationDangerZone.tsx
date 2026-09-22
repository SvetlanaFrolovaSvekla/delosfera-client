// "Опасная зона" - кнопка отзыва согласования. Условие, при котором её нужно показывать (роль
// инициатора и/или право CancelAnyVndApproval + допустимая фаза - см. CANCELLABLE_PHASE в
// VndCoordinationTab), определяет вызывающая сторона - сам компонент ничего не решает, просто
// рисуется, когда его монтируют.
import {useTranslation} from "react-i18next";

interface VndCoordinationDangerZoneProps {
    onCancelClick: () => void;
}

export function VndCoordinationDangerZone({onCancelClick}: VndCoordinationDangerZoneProps) {
    const {t} = useTranslation();

    return (
        <div className="mt-8 rounded-[14px] border border-[#f0dede] overflow-hidden">
            <div className="bg-[#fdf6f5] px-4 py-2.5 border-b border-[#f0dede]">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#c0392b]">
                    {t("openVndPage.coordinationTab.dangerZoneLabel")}
                </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white">
                <div>
                    <div className="text-[13px] font-semibold text-[#1c2740]">
                        {t("openVndPage.coordinationTab.cancelApprovalTitle")}
                    </div>
                    <span className="text-[12.5px] text-[#8b97ab]">
                        {t("openVndPage.coordinationTab.cancelApprovalHint")}
                    </span>
                </div>
                <button
                    onClick={onCancelClick}
                    className="shrink-0 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] transition-colors"
                >
                    {t("openVndPage.coordinationTab.cancelButton")}
                </button>
            </div>
        </div>
    );
}
