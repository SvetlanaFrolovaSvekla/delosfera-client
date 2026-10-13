// Окна просмотра документов редакции: вложения, ТИД, лист согласования, матрица разногласий
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {RedactionDocumentModalsState} from "@/hooks/vndHooks/useRedactionDocumentModals.ts";
import {
    RedactionAttachmentsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/redactionDocumentModals/RedactionAttachmentsModal.tsx";
import {
    RedactionTidModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/redactionDocumentModals/RedactionTidModal.tsx";
import {
    RedactionApprovalSheetModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/redactionDocumentModals/RedactionApprovalSheetModal.tsx";
import {
    RedactionDisagreementMatrixModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/redactionDocumentModals/RedactionDisagreementMatrixModal.tsx";

interface RedactionDocumentModalsProps {
    vnd: VndResponse;
    docs: RedactionDocumentModalsState;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
}

export function RedactionDocumentModals({vnd, docs, downloadingId, onDownload}: RedactionDocumentModalsProps) {
    const {attachments, tid, approvalSheet, disagreementMatrix} = docs;

    return (
        <>
            {attachments && (
                <RedactionAttachmentsModal
                    redaction={attachments}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onView={(target) => {
                        if (target === "tid") docs.setTid(attachments);
                        else if (target === "approvalSheet") docs.setApprovalSheet(attachments);
                        else docs.setDisagreementMatrix(attachments);
                    }}
                    onClose={() => docs.setAttachments(null)}
                />
            )}

            {tid && (
                <RedactionTidModal
                    vnd={vnd}
                    redaction={tid}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onClose={() => docs.setTid(null)}
                />
            )}

            {approvalSheet && (
                <RedactionApprovalSheetModal
                    vnd={vnd}
                    redaction={approvalSheet}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onClose={() => docs.setApprovalSheet(null)}
                />
            )}

            {disagreementMatrix && (
                <RedactionDisagreementMatrixModal
                    vnd={vnd}
                    redaction={disagreementMatrix}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onClose={() => docs.setDisagreementMatrix(null)}
                />
            )}
        </>
    );
}
