// Какая редакция открыта в окнах просмотра её документов (вложения, ТИД, лист согласования,
// матрица разногласий). Окна независимы: из "Вложений" можно открыть ТИД поверх.
import {useState} from "react";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

export function useRedactionDocumentModals() {
    const [attachments, setAttachments] = useState<VndRedactionResponse | null>(null);
    const [tid, setTid] = useState<VndRedactionResponse | null>(null);
    const [approvalSheet, setApprovalSheet] = useState<VndRedactionResponse | null>(null);
    const [disagreementMatrix, setDisagreementMatrix] = useState<VndRedactionResponse | null>(null);

    return {
        attachments, setAttachments,
        tid, setTid,
        approvalSheet, setApprovalSheet,
        disagreementMatrix, setDisagreementMatrix,
    };
}

export type RedactionDocumentModalsState = ReturnType<typeof useRedactionDocumentModals>;
