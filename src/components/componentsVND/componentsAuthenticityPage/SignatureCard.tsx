// Карточка ЭЦП-подписи решения: кто и когда подписал, решение, сертификат, комментарий,
// хэши и кнопка повторной проверки подписи у провайдера.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {type VndAuthenticitySignature} from "@/service/vndService/vndAuthenticityService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ResolutionSignatureVerifyResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {toast} from "@/service/toastService.ts";
import {formatDateTime} from "@/utils/vndProcess/authenticityUtils.ts";
import {Field} from "./Field.tsx";
import {HashLine} from "./HashLine.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {BTN_SECONDARY, STATE_STYLE, VERIFY_STYLE} from "./styles/authenticityStyles.ts";
import {CheckCircle2, ShieldCheck, XCircle} from "lucide-react";

export function SignatureCard({vndId, signature, locale}: {
    vndId: number; signature: VndAuthenticitySignature; locale: string;
}) {
    const {t} = useTranslation();
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState<ResolutionSignatureVerifyResponse | string | null>(null);

    const verify = async () => {
        setVerifying(true);
        try {
            const result = await coordinationService.verifySignature(vndId, signature.id);
            setVerifyResult(result);
            if (result.status === "valid") toast.success(t("vndAuthenticity.verifyOk"));
            else toast.warning(result.message);
        } catch (e) {
            const response = (e as { response?: { status?: number; data?: { message?: string } } }).response;
            const message = response?.status === 429
                ? t("ecp.journal.tooMany")
                : response?.data?.message ?? t("ecp.journal.verifyFailed");
            setVerifyResult(message);
            toast.error(t("ecp.journal.verifyFailed"), message);
        } finally {
            setVerifying(false);
        }
    };

    const signer = signature.personFio ?? signature.certCommonName ?? signature.accountFullName ?? "—";

    return (
        <div className="rounded-[12px] border border-[#eef1f5] bg-white p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <span className={`inline-block rounded-[8px] border px-2 py-0.5 text-[11px] ${
                    signature.underThisText ? STATE_STYLE.signed_this_text : STATE_STYLE.signed_other_text}`}>
                    {signature.underThisText
                        ? t("vndAuthenticity.signatureState.signed_this_text")
                        : t("vndAuthenticity.signatureState.signed_other_text")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                    <Tooltip content={t("vndAuthenticity.verifyHelp")}>
                        <button type="button" onClick={() => void verify()} disabled={verifying}
                                className={`${BTN_SECONDARY} !text-[#4e57d6]`}>
                            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2}/>
                            {verifying ? t("ecp.journal.verifying") : t("vndAuthenticity.verifyAtProvider")}
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={t("vndAuthenticity.fields.signer")}>
                    <span className="font-semibold">{signer}</span>
                    {signature.accountFullName && signature.personFio && signature.accountFullName !== signature.personFio && (
                        <div className="text-[11px] text-[#8b97ab]">
                            {t("ecp.journal.account", {name: signature.accountFullName})}
                        </div>
                    )}
                </Field>
                <Field label={t("vndAuthenticity.fields.signedAt")}>
                    {formatDateTime(signature.cmsSigningTime ?? signature.signedAt, locale)}
                    <div className="text-[11px] text-[#8b97ab]">
                        {t(`vndAuthenticity.phase.${signature.phase}`)}
                        {signature.phase !== "primary" && `, ${t("ecp.journal.round", {n: signature.roundNumber})}`}
                    </div>
                </Field>
                <Field label={t("vndAuthenticity.fields.decision")}>
                    {t(`vndAuthenticity.decision.${signature.decision}`)}
                    {signature.stageTitle && <div className="text-[11px] text-[#8b97ab]">{signature.stageTitle}</div>}
                </Field>
                <Field label={t("vndAuthenticity.fields.certificate")}>
                    {signature.verified ? t("ecp.journal.verified") : t("ecp.journal.notVerified")}
                    <div className="text-[11px] text-[#8b97ab]">
                        {[signature.organizationName,
                            signature.certIssuerCommonName && t("ecp.journal.issuer", {name: signature.certIssuerCommonName}),
                        ].filter(Boolean).join(" · ")}
                    </div>
                </Field>
            </div>

            {signature.commentText && (
                <div className="mt-3 rounded-[10px] bg-[#f6f8fb] px-3 py-2 text-[12.5px] text-[#55617a]">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#a3adbd]">
                        {t("vndAuthenticity.fields.comment")}
                    </span>
                    <div className="whitespace-pre-wrap">«{signature.commentText}»</div>
                </div>
            )}

            <div className="mt-3 flex flex-col gap-1">
                <HashLine label={`${t("vndAuthenticity.signedHash")} (${signature.hashSchemaVersion})`}
                          value={signature.hash}/>
                <HashLine label={t("vndAuthenticity.textDigest")} value={signature.contentDigest}/>
            </div>

            {verifyResult && (
                <div className={`mt-3 flex items-start gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] ${
                    typeof verifyResult === "string" ? VERIFY_STYLE.signature_invalid : VERIFY_STYLE[verifyResult.status]
                }`}>
                    {typeof verifyResult !== "string" && verifyResult.status === "valid"
                        ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
                        : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0"/>}
                    <span>{typeof verifyResult === "string" ? verifyResult : verifyResult.message}</span>
                </div>
            )}
        </div>
    );
}
