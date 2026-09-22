// Отправка резолюции согласующего (см. VndApproverResolutionPanel.onSubmit).
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {toast} from "@/service/toastService.ts";
import {
    ApprovalDecisionType,
    type ApprovalQuoteItem,
    type ApprovalStageResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {
    ResolutionChoice
} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/VndApproverResolutionPanel.tsx";

const DECISION_MAP: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};

export function useResolutionDecision(vndId: number, reload: () => Promise<void>) {
    const {t} = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [decisionError, setDecisionError] = useState<string | null>(null);
    const decisionInFlightRef = useRef(false);

    // Принимает "мой" этап от вызывающей стороны (а не хранит process/myStage сам) - по той же
    // причине, что и useApprovalRouteEditing.handleRequestRemoveApprover, см. комментарий там.
    const submit = async (
        myStage: ApprovalStageResponse | undefined,
        choice: ResolutionChoice,
        comment: string,
        files: File[],
        quotes: ApprovalQuoteItem[],
    ) => {
        if (!myStage || decisionInFlightRef.current) return;
        decisionInFlightRef.current = true;
        setSubmitting(true);
        setDecisionError(null);
        try {
            await coordinationService.decide(vndId, myStage.id, {
                decision: DECISION_MAP[choice],
                comment: comment || undefined,
                files: files.length > 0 ? files : undefined,
                quotes: quotes.length > 0 ? quotes : undefined,
            });
            await reload();
            toast.success(t("openVndPage.coordinationTab.decisionSubmittedToastTitle"), t("openVndPage.coordinationTab.decisionSubmittedToastDescription"));
        } catch (err) {
            setDecisionError(err instanceof Error ? err.message : t("openVndPage.coordinationTab.decisionErrorDefault"));
        } finally {
            decisionInFlightRef.current = false;
            setSubmitting(false);
        }
    };

    return {submitting, decisionError, submit};
}

export type UseResolutionDecisionReturn = ReturnType<typeof useResolutionDecision>;
