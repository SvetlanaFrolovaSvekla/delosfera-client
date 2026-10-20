// Модалка просмотра печатных форм заявки на замещение (глазик в блоке «Подписание документов») —
// как «Лист согласования» у ВНД: табы документов, ниже — «С подписями ЭЦП» / «Для подписи от руки».
import {useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Eye, X} from "lucide-react";
import {
    substitutionPrintUrl,
    type SubstitutionPrintForm,
    type SubstitutionPrintMode,
} from "@/service/substitutionService/substitutionService.ts";
import {SubstitutionDocumentsViewer} from "./SubstitutionDocumentsViewer.tsx";

interface Props {
    requestId: number;
    regNumber?: string | null;
    initialForm?: SubstitutionPrintForm;
    initialMode?: SubstitutionPrintMode;
    onClose: () => void;
}

export function SubstitutionDocumentsModal({requestId, regNumber, initialForm = "order", initialMode = "signed", onClose}: Props) {
    const {t} = useTranslation();
    const [form, setForm] = useState<SubstitutionPrintForm>(initialForm);
    const [mode, setMode] = useState<SubstitutionPrintMode>(initialMode);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}
                 className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none items-center justify-between gap-3 px-6 pb-2 pt-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#e9f0ff] text-[#2f68f5]">
                            <Eye size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {t("substitutionCard.printPage.modalTitle")}{regNumber ? ` · ${regNumber}` : ""}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                {t("substitutionCard.printPage.modalSubtitle")}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label={t("substitutionCard.printPage.close")}
                            className="flex-none cursor-pointer border-none bg-transparent text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-6 pb-5">
                    <SubstitutionDocumentsViewer
                        requestId={requestId}
                        regNumber={regNumber}
                        form={form}
                        mode={mode}
                        onFormChange={setForm}
                        onModeChange={setMode}
                        scrollable
                        // Печать — со страницы печатной формы: там лист уходит на A4 без обвязки модалки.
                        onPrint={() => window.open(`${substitutionPrintUrl(requestId, form, mode)}&autoprint=1`, "_blank", "noopener")}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}
