// Заявка на закупку, выросшая из записки: номер со ссылкой и стадия закупки.
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {SzDetails} from "@/service/szService/szService.ts";
import {SzPanel} from "@/components/componentsSzCard/SzPanel.tsx";

export function SzProcurementLink({sz}: { sz: SzDetails }) {
    const {t} = useTranslation();
    if (!sz.procurementRequestId) return null;

    return (
        <SzPanel>
            <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd] mb-2">
                {t("szCard.procurement.title")}
            </div>
            <Link
                to={`/prc/${sz.procurementRequestId}`}
                className="text-[14px] font-semibold text-[#2f68f5] no-underline hover:underline"
            >
                {sz.procurementRegNumber ?? t("szCard.noNumber")}
            </Link>
            {sz.procurementStatusCode && (
                <span className="ml-2 text-[13px] text-[#55617a]">
                    {t(`szCard.procurement.status.${sz.procurementStatusCode}`, {defaultValue: sz.procurementStatusCode})}
                </span>
            )}
        </SzPanel>
    );
}
