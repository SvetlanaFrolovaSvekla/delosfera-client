// Строка таблицы согласующих в ProcessBlock: ФИО и должность, решение, дата и статус подписи.
import {useTranslation} from "react-i18next";
import type {VndAuthenticityApprover} from "@/service/vndService/vndAuthenticityService.ts";
import {formatDateTime} from "@/utils/vndProcess/authenticityUtils.ts";
import {STATE_STYLE} from "./styles/authenticityStyles.ts";

export function ApproverRow({approver, locale}: { approver: VndAuthenticityApprover; locale: string }) {
    const {t} = useTranslation();
    return (
        <tr className="border-t border-[#eef1f5] align-top">
            <td className="py-2.5 pr-3">
                <div className="font-semibold text-[#1c2740]">{approver.fullName}</div>
                <div className="text-[11px] text-[#8b97ab]">
                    {[approver.position, approver.stageTitle].filter(Boolean).join(" · ")}
                </div>
            </td>
            <td className="py-2.5 pr-3 text-[#1c2740]">
                {t(`vndAuthenticity.decision.${approver.decision}`)}
                {approver.decision !== "pending" && approver.phase !== "primary" && (
                    <div className="text-[11px] text-[#8b97ab]">{t(`vndAuthenticity.phase.${approver.phase}`)}</div>
                )}
            </td>
            <td className="py-2.5 pr-3 whitespace-nowrap text-[#55617a]">{formatDateTime(approver.decidedAt, locale)}</td>
            <td className="py-2.5">
                <span
                    className={`inline-block rounded-[8px] border px-2 py-0.5 text-[11.5px] ${STATE_STYLE[approver.signatureState]}`}>
                    {t(`vndAuthenticity.signatureState.${approver.signatureState}`)}
                </span>
            </td>
        </tr>
    );
}
