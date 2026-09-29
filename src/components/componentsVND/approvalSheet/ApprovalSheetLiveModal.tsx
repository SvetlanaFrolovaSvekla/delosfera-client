// Модалка "Лист согласования" для текущего (или любого) процесса согласования ВНД - оформление как
// у RedactionApprovalSheetModal, внутри ApprovalSheetLiveView с двумя режимами.
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {ClipboardCheck, X} from "lucide-react";
import {ApprovalSheetLiveView} from "./ApprovalSheetLiveView.tsx";

interface ApprovalSheetLiveModalProps {
    vndId: number;
    processId: number;
    redactionCode: string;
    onClose: () => void;
}

export function ApprovalSheetLiveModal({vndId, processId, redactionCode, onClose}: ApprovalSheetLiveModalProps) {
    const {t} = useTranslation();

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl"
            >
                <div className="flex flex-none items-center justify-between gap-3 px-6 pb-2 pt-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <ClipboardCheck size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">{redactionCode}</h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                {t("approvalSheetLive.title")}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="flex-none cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>
                <ApprovalSheetLiveView vndId={vndId} processId={processId} redactionCode={redactionCode}/>
            </div>
        </div>,
        document.body,
    );
}
