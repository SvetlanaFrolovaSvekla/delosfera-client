// Карточка "Лист согласования" на вкладке "Ход согласования": лист формируется по текущим решениям,
// поэтому после каждой резолюции открывается уже обновлённым. Открывает ApprovalSheetLiveModal.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {ClipboardCheck} from "lucide-react";
import {ApprovalSheetLiveModal} from "./ApprovalSheetLiveModal.tsx";

interface VndApprovalSheetCardProps {
    vndId: number;
    processId: number;
    redactionCode: string;
}

export function VndApprovalSheetCard({vndId, processId, redactionCode}: VndApprovalSheetCardProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#e9edf3] bg-white p-4">
            <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                    <ClipboardCheck size={17} strokeWidth={1.8}/>
                </span>
                <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-[#1c2740]">{t("approvalSheetLive.title")}</div>
                    <div className="text-[11.5px] leading-[1.5] text-[#8b97ab]">{t("approvalSheetLive.cardHint")}</div>
                </div>
            </div>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] border-none bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:brightness-[1.06]"
            >
                {t("approvalSheetLive.open")}
            </button>
            {open && (
                <ApprovalSheetLiveModal
                    vndId={vndId}
                    processId={processId}
                    redactionCode={redactionCode}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    );
}
