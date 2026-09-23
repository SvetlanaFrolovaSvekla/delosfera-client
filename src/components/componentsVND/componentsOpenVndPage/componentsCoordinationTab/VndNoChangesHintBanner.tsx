// Плашка "актуализация без изменений" - показывается и согласующему, и инициатору (текст
// разный, разметка одна и та же) над остальным содержимым таба "Ход согласования".
//
// При повторном согласовании той же редакции (актуализация без изменений - см.
// ApprovalProcessResponse.isNoChangesActualization) плашка дополнительно перечисляет, когда эта
// редакция уже согласовывалась раньше (прежние листы согласования), - чтобы и согласующему, и
// инициатору было видно, что это не первое согласование документа.
import {FileCheck2} from "lucide-react";
import {useTranslation} from "react-i18next";
import type {VndRedactionApprovalSheetResponse} from "@/service/vndService/vndServiceType.ts";
import {approvalSheetCaption} from "@/utils/vndProcess/approvalSheets.ts";

interface VndNoChangesHintBannerProps {
    message: string;
    /** Прежние листы согласования этой редакции (без листа текущего процесса). Не передан -
     * блок "Ранее редакция уже согласовывалась" не показывается. */
    previousSheets?: VndRedactionApprovalSheetResponse[];
    redactionCode?: string;
    onDownloadSheet?: (fileId: number, name: string) => void;
}

export function VndNoChangesHintBanner({message, previousSheets, redactionCode, onDownloadSheet}: VndNoChangesHintBannerProps) {
    const {t} = useTranslation();

    return (
        <div className="mb-3 inline-flex items-start gap-2.5 rounded-[12px] border border-[#dde0fa] bg-[#f4f5fd] px-3.5 py-3 max-w-full">
            <FileCheck2 size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#4e57d6]"/>
            <div className="min-w-0 text-[12.5px] leading-[1.55] text-[#3a4560]">
                <p className="font-semibold text-[#2f3a9e]">{t("approvalSheets.bannerTitle")}</p>
                <p>{message}</p>
                {previousSheets && (
                    previousSheets.length > 0 ? (
                        <div className="mt-1.5">
                            <p>{t("approvalSheets.bannerPrevious", {code: redactionCode ?? ""})}</p>
                            <ul className="mt-0.5 flex flex-col gap-0.5">
                                {previousSheets.map((sheet) => (
                                    <li key={`${sheet.id}-${sheet.fileId}`} className="flex flex-wrap items-center gap-x-2">
                                        <span>• {approvalSheetCaption(t, sheet)}</span>
                                        {onDownloadSheet && (
                                            <button
                                                type="button"
                                                onClick={() => onDownloadSheet(sheet.fileId, sheet.fileName)}
                                                className="cursor-pointer text-[12px] font-semibold text-[#4e57d6] hover:underline"
                                            >
                                                {t("approvalSheets.processSheetButton")}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="mt-1.5 text-[#6b7488]">
                            {t("approvalSheets.bannerNoPrevious", {code: redactionCode ?? ""})}
                        </p>
                    )
                )}
            </div>
        </div>
    );
}
