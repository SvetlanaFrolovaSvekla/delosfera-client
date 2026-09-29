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
    ResolutionChoice, ResolutionEcpSignature,
} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/VndApproverResolutionPanel.tsx";

const DECISION_MAP: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};

/** Итог отправки резолюции: true — сохранена; false — ошибка (текст в decisionError);
 * "resign" — backend отклонил подпись как устаревшую для текущего состояния (документ/комментарий
 * изменились после подписания, подпись старая или уже использована) — нужно подписать заново;
 * "reauth" — подпись принадлежит не тому лицу/не привязанной к учётке ЭЦП — нужно сбросить
 * ЭЦП-сессию и ввести ПИН заново. */
export type ResolutionSubmitResult = boolean | "resign" | "reauth";

const RESIGN_CODES = new Set(["document_changed", "stale_signature", "signature_reused"]);
const REAUTH_CODES = new Set(["identity_mismatch"]);

/** Сообщение backend ({ message }) полезнее общего "Request failed with status code 409". */
function apiErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
    return err instanceof Error ? err.message : fallback;
}

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
        ecpSignature?: ResolutionEcpSignature,
        withoutEcp?: boolean,
    ): Promise<ResolutionSubmitResult> => {
        // true - резолюция сохранена (панель резолюции по нему стирает свой черновик в браузере).
        if (!myStage || decisionInFlightRef.current) return false;
        decisionInFlightRef.current = true;
        setSubmitting(true);
        setDecisionError(null);
        try {
            await coordinationService.decide(vndId, myStage.id, {
                decision: DECISION_MAP[choice],
                comment: comment || undefined,
                files: files.length > 0 ? files : undefined,
                quotes: quotes.length > 0 ? quotes : undefined,
                // ЭЦП ГП «Инфоком» - обязательна для "Согласовать" (см. EcpSignModal/useEcpApproval).
                ecpSignatureBase64: ecpSignature?.signatureBase64,
                ecpCertToken: ecpSignature?.certToken,
                ecpHash: ecpSignature?.hash,
                ecpPersonIdnp: ecpSignature?.personIdnp,
                ecpTimestamp: ecpSignature?.timestamp,
                // ТЕСТ: согласование без ЭЦП для локальных учёток (backend перепроверяет Source).
                withoutEcp: withoutEcp || undefined,
            });
            await reload();
            toast.success(t("openVndPage.coordinationTab.decisionSubmittedToastTitle"), t("openVndPage.coordinationTab.decisionSubmittedToastDescription"));
            return true;
        } catch (err) {
            setDecisionError(apiErrorMessage(err, t("openVndPage.coordinationTab.decisionErrorDefault")));
            const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
            if (code && RESIGN_CODES.has(code)) return "resign";
            if (code && REAUTH_CODES.has(code)) return "reauth";
            return false;
        } finally {
            decisionInFlightRef.current = false;
            setSubmitting(false);
        }
    };

    return {submitting, decisionError, submit};
}

export type UseResolutionDecisionReturn = ReturnType<typeof useResolutionDecision>;
