// Блок "Данная редакция:"/"Новая редакция" - заголовок с кнопкой сравнения (если есть с чем
// сравнивать) и карточка редакции. Общий для видов согласующего и инициатора в
// VndCoordinationTab.
import {useTranslation} from "react-i18next";
import {Columns2} from "lucide-react";
import {
    RedactionSummaryCard
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionSummaryCard.tsx";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

interface VndCurrentRedactionSectionProps {
    vnd: VndResponse;
    isFirstRedaction: boolean;
    redaction: VndRedactionResponse | undefined;
    previousRedaction: VndRedactionResponse | undefined;
    downloadingId: number | null;
    downloadError: string | null;
    onDownload: (fileId: number, name: string) => void;
    onView: (redaction: VndRedactionResponse, language: RedactionViewTarget) => void;
    onCompareClick: () => void;
    /** У редакции уже есть промежуточные версии ("Р2.1", "Р2.2"... - после согласования с
     * замечаниями) - сравнение доступно, даже если это первая редакция ВНД. */
    hasRevisions?: boolean;
    /** Отступ снизу у заголовка - у видов согласующего и инициатора он исторически отличался
     * (mb-2 / mb-4 в оригинальном файле) - явно передаётся вызывающей стороной, а не зашит
     * здесь, чтобы визуально ничего не изменилось при переносе. Стоит присмотреться, не
     * опечатка ли это - см. сопроводительное сообщение к рефакторингу. */
    headerClassName: string;
}

export function VndCurrentRedactionSection({
    vnd, isFirstRedaction, redaction, previousRedaction, downloadingId, downloadError,
    onDownload, onView, onCompareClick, headerClassName, hasRevisions = false,
}: VndCurrentRedactionSectionProps) {
    const {t} = useTranslation();

    return (
        <>
            <div className={`flex items-center justify-between gap-3 ${headerClassName}`}>
                <div className="text-[13.5px] font-bold text-[#1c2740]">
                    {isFirstRedaction
                        ? t("openVndPage.coordinationTab.firstRedactionLabel")
                        : t("openVndPage.coordinationTab.newRedactionLabel")}
                </div>
                {redaction && ((!isFirstRedaction && previousRedaction) || hasRevisions) && (
                    <button
                        type="button"
                        onClick={onCompareClick}
                        className="cursor-pointer flex h-[35px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                    >
                        <Columns2 size={15} strokeWidth={2}/>
                        {t("openVndPage.coordinationTab.compareButton")}
                    </button>
                )}
            </div>
            {redaction && (
                <RedactionSummaryCard
                    vnd={vnd}
                    redaction={redaction}
                    previousRedaction={!isFirstRedaction ? previousRedaction : undefined}
                    downloadingId={downloadingId}
                    downloadError={downloadError}
                    onDownload={onDownload}
                    onView={onView}
                />
            )}
        </>
    );
}
