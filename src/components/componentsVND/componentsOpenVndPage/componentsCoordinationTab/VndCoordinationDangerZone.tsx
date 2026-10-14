// "Опасная зона" - кнопка отзыва согласования. Условие, при котором её нужно показывать (роль
// инициатора и/или право CancelAnyVndApproval + допустимая фаза - см. CANCELLABLE_PHASE в
// VndCoordinationTab), определяет вызывающая сторона - сам компонент ничего не решает, просто
// рисуется, когда его монтируют.
import {useTranslation} from "react-i18next";
import {AlertTriangle, Undo2} from "lucide-react";

interface VndCoordinationDangerZoneProps {
    onCancelClick: () => void;
}

// Оформление - в духе кнопок решений в панели резолюций (иконка в кружке, справа пояснение
// с цветной чертой), но спокойная светлая кнопка - отзыв не должен бросаться в глаза.
export function VndCoordinationDangerZone({onCancelClick}: VndCoordinationDangerZoneProps) {
    const {t} = useTranslation();

    return (
        <div className="mt-8 overflow-hidden rounded-2xl border border-[#f0dede] bg-white">
            <div className="flex items-center gap-2 border-b border-[#f6e4e2] bg-[#fdf6f5] px-5 py-2.5">
                <AlertTriangle size={14} strokeWidth={2.2} className="flex-none text-[#c0392b]"/>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#c0392b]">
                    {t("openVndPage.coordinationTab.dangerZoneLabel")}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <button
                    type="button"
                    onClick={onCancelClick}
                    className="group flex w-[300px] max-w-full flex-none cursor-pointer items-center justify-center gap-2.5 rounded-[12px] border border-[#f0c9c4] bg-[#fdf3f2] px-5 py-[10px] text-[13px] font-semibold text-[#c0392b] transition-colors duration-150 hover:border-[#e8a6a6] hover:bg-[#fbe7e4]"
                >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#c0392b]/10 transition-colors group-hover:bg-[#c0392b]/15">
                        <Undo2 className="h-[14px] w-[14px]" strokeWidth={2.4}/>
                    </span>
                    {t("openVndPage.coordinationTab.cancelApprovalTitle")}
                </button>
                <div className="min-w-[220px] flex-1 border-l-2 border-[#e8a6a6] pl-3 text-[12px] leading-[1.45] text-[#6b7688]">
                    {t("openVndPage.coordinationTab.cancelApprovalHint")}
                </div>
            </div>
        </div>
    );
}
