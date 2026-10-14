// Резолюция текущего пользователя: доступна только тому,
// чья задача сейчас активна.
import {Trans, useTranslation} from "react-i18next";
import type {SzApprovalState} from "@/hooks/sz/useSzApproval.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";

interface SzDecisionPanelProps {
    approval: SzApprovalState;
    saving: boolean;
}

export function SzDecisionPanel({approval, saving}: SzDecisionPanelProps) {
    const {t} = useTranslation();
    const {comment, setComment, isSigningStep, needsQualified, oepAvailable, resolve, setOepModalOpen} = approval;
    const approveLabel = t(isSigningStep ? "szCard.approval.sign" : "szCard.approval.approve");

    return (
        <div className="mt-4 rounded-[10px] border border-[#cbddff] bg-[#f5f8ff] p-4">
            <div className="text-[13px] font-semibold text-[#0f1b2d]">
                {t(isSigningStep ? "szCard.approval.decisionTitleSigning" : "szCard.approval.decisionTitle")}
            </div>

            {needsQualified && (
                <div className="mt-2 rounded-[9px] border border-[#cbddff] bg-white px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#55617a]">
                    <Trans
                        i18nKey="szCard.approval.qualifiedNotice"
                        values={{action: approveLabel}}
                        components={{b: <b/>}}
                    />
                </div>
            )}
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t(isSigningStep
                    ? "szCard.approval.commentPlaceholderSigning"
                    : "szCard.approval.commentPlaceholder")}
                className="mt-2 w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none resize-y focus:border-[#2f68f5]"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
                <SzButton variant="success" size="sm" onClick={() => resolve("Approved")} disabled={saving}>
                    {approveLabel}
                </SzButton>
                {needsQualified && oepAvailable && (
                    <SzButton variant="brandSoft" size="sm" onClick={() => setOepModalOpen(true)} disabled={saving}>
                        {t("szCard.approval.cloudSign")}
                    </SzButton>
                )}
                {!isSigningStep && (
                    <SzButton variant="warning" size="sm" onClick={() => resolve("ApprovedWithRemarks")} disabled={saving}>
                        {t("szCard.approval.withRemarks")}
                    </SzButton>
                )}
                <SzButton variant="danger" size="sm" onClick={() => resolve("Rejected")} disabled={saving}>
                    {t(isSigningStep ? "szCard.approval.returnForRevision" : "szCard.approval.reject")}
                </SzButton>
            </div>
        </div>
    );
}
