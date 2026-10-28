// Подпись ЭЦП документов заявки на замещение — общая для раздела «Подписание документов» и
// кнопок в маршруте согласования. Сначала окно выбора места подписи на листе (SubstitutionSignPlacementModal),
// затем тот же порядок, что у резолюций СЗ: сохранённая идентификация → ЭЦП-сессия → окно ПИН/кода.
import {useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {
    substitutionService,
    type SubstitutionSignerRole,
    type SubstitutionSigningDocument,
    type SubstitutionSigningState,
    type SubstitutionSignPlacement,
} from "@/service/substitutionService/substitutionService.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import {useEcpHashSigning} from "@/hooks/useEcpHashSigning.ts";
import {EcpSignModal} from "@/components/componentsSigning/EcpSignModal.tsx";
import {toast} from "@/service/toastService.ts";
import {SubstitutionSignPlacementModal} from "./SubstitutionSignPlacementModal.tsx";

const CANCELLED = "Подписание отменено";

export const signingErrorOf = (e: unknown) => {
    const data = (e as { response?: { data?: { message?: string; code?: string } } })?.response?.data;
    return {message: data?.message, code: data?.code};
};

interface PlacementRequest {
    doc: SubstitutionSigningDocument;
    role: SubstitutionSignerRole;
    /** Чьё место подписи (для дополнительных подписантов от Банка — их несколько). */
    signerUserId: number | null;
    test: boolean;
}

/** Ключ места подписи: у дополнительных подписантов от Банка роль одна, мест несколько. */
export const signingKey = (docId: number, role: SubstitutionSignerRole, signerUserId?: number | null) =>
    `${docId}-${role}-${signerUserId ?? ""}`;

export function useSubstitutionSigning(requestId: number, onChange: (state: SubstitutionSigningState) => void) {
    const {t} = useTranslation();
    const ecp = useEcpHashSigning();
    const [busyKey, setBusyKey] = useState<string | null>(null);
    // Окно выбора места подписи — открыто для этого документа и роли.
    const [placing, setPlacing] = useState<PlacementRequest | null>(null);

    /** «Подписать ЭЦП»: сначала выбрать место подписи на листе. */
    function sign(doc: SubstitutionSigningDocument, role: SubstitutionSignerRole, signerUserId: number | null = null) {
        setPlacing({doc, role, signerUserId, test: false});
    }

    /** «Тест»: тоже с выбором места — тестовая подпись встаёт там же, где встала бы настоящая. */
    function signTest(doc: SubstitutionSigningDocument, role: SubstitutionSignerRole, signerUserId: number | null = null) {
        setPlacing({doc, role, signerUserId, test: true});
    }

    async function signEcp(doc: SubstitutionSigningDocument, role: SubstitutionSignerRole, placement: SubstitutionSignPlacement,
                           signerUserId: number | null) {
        const key = signingKey(doc.id, role, signerUserId);
        let signature: ResolutionEcpSignature;
        try {
            signature = await ecp.requestSignature({
                getHash: () => substitutionService.signingHash(requestId, doc.id, role, signerUserId),
                signStored: () => substitutionService.signStored(requestId, doc.id, role, signerUserId),
            });
        } catch (e) {
            if (e instanceof Error && e.message === CANCELLED) return;
            toast.error(t("substitutionSigning.signFailed"), signingErrorOf(e).message);
            return;
        }

        setBusyKey(key);
        try {
            const next = await substitutionService.sign(requestId, doc.id, role, signature, placement, signerUserId);
            onChange(next);
            toast.success(t("substitutionSigning.signed"), doc.title);
            if (next.allSigned) toast.success(t("substitutionSigning.allSigned"), t("substitutionSigning.allSignedText"));
        } catch (e) {
            const {message, code} = signingErrorOf(e);
            // Подпись чужая — сбрасываем сессию, чтобы в следующий раз спросить ПИН заново.
            if (code === "identity_mismatch") ecp.resetSession();
            toast.error(t("substitutionSigning.signFailed"),
                code === "document_changed" ? t("substitutionSigning.documentChanged") : message);
            if (code === "document_changed") {
                substitutionService.signingState(requestId).then(onChange).catch(() => {
                });
            }
        } finally {
            setBusyKey(null);
        }
    }

    async function signTestAt(doc: SubstitutionSigningDocument, role: SubstitutionSignerRole, placement: SubstitutionSignPlacement,
                              signerUserId: number | null) {
        setBusyKey(signingKey(doc.id, role, signerUserId));
        try {
            const next = await substitutionService.signTest(requestId, doc.id, role, placement, signerUserId);
            onChange(next);
            toast.warning(t("substitutionSigning.signedTest"), doc.title);
        } catch (e) {
            toast.error(t("substitutionSigning.signFailed"), signingErrorOf(e).message);
        } finally {
            setBusyKey(null);
        }
    }

    function confirmPlacement(placement: SubstitutionSignPlacement) {
        if (!placing) return;
        const {doc, role, signerUserId, test} = placing;
        setPlacing(null);
        void (test ? signTestAt(doc, role, placement, signerUserId) : signEcp(doc, role, placement, signerUserId));
    }

    const modal: ReactNode = (
        <>
            {placing && (
                <SubstitutionSignPlacementModal
                    requestId={requestId}
                    doc={placing.doc}
                    role={placing.role}
                    signerUserId={placing.signerUserId}
                    test={placing.test}
                    onCancel={() => setPlacing(null)}
                    onConfirm={confirmPlacement}
                />
            )}
            {ecp.modalOpen && ecp.modalGetHash && (
                <EcpSignModal getHash={ecp.modalGetHash} onSigned={ecp.handleModalSigned} onClose={ecp.handleModalClose}/>
            )}
        </>
    );

    return {busyKey, quietSigning: ecp.quietSigning, sign, signTest, modal};
}
