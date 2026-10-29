// Резолюция текущего пользователя: доступна только тому, чья задача сейчас активна.
// Решение подписывается ЭЦП ГП «Инфоком» — как резолюция согласующего ВНД. Сотрудник с правом
// «Подпись без ЭЦП КР» (SignWithoutNationalEcp) подписывает локальной подписью системы «Делосфера».
import {ShieldCheck} from "lucide-react";
import type {SzSignableResolution} from "@/service/szService/szEcpService.ts";
import type {ResolutionChoice} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/resolutionPanel/resolutionPanelTypes.ts";
import {SystemSignConfirmModal} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/resolutionPanel/SystemSignConfirmModal.tsx";
import {useTranslation} from "react-i18next";
import type {SzApprovalState} from "@/hooks/sz/useSzApproval.ts";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {EcpSessionCountdown} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/resolutionPanel/EcpSessionCountdown.tsx";

interface SzDecisionPanelProps {
    approval: SzApprovalState;
    saving: boolean;
}

/** Решение СЗ → вариант окна подтверждения ВНД (тексты окна общие). */
const CHOICE: Record<SzSignableResolution, ResolutionChoice> = {
    Approved: "approve",
    ApprovedWithRemarks: "approveWithComment",
    Rejected: "reject",
};

export function SzDecisionPanel({approval, saving}: SzDecisionPanelProps) {
    const {t} = useTranslation();
    const {session, isValid} = useEcpSession();
    const {
        comment, setComment, commentError, commentRef, isSigningStep, needsQualified, oepAvailable, allowWithoutEcp, ecp,
        resolve, signAndResolve, testSignAndResolve, allowSzTestEcp, setOepModalOpen,
        systemSignMode, systemSealConfigured, pendingSystem, setPendingSystem, systemHash, systemHashLoading,
        systemHashError, openSystemConfirm, confirmSystemSign,
    } = approval;
    // Основной путь: ЭЦП ГП «Инфоком», а у обладателя права «Подпись без ЭЦП КР» — подпись системы.
    const decide = (type: SzSignableResolution) =>
        systemSignMode ? openSystemConfirm(type) : void signAndResolve(type);
    const systemBlocked = systemSignMode && !systemSealConfigured;
    const approveLabel = t(isSigningStep ? "szCard.approval.sign" : "szCard.approval.approve");
    const rejectLabel = t("szCard.approval.reject");
    const busy = saving || ecp.quietSigning || ecp.modalOpen || pendingSystem !== null;

    return (
        <div className="mt-4 rounded-[10px] border border-[#cbddff] bg-[#f5f8ff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-[#0f1b2d]">
                    {t(isSigningStep ? "szCard.approval.decisionTitleSigning" : "szCard.approval.decisionTitle")}
                </div>
                {session && isValid() && <EcpSessionCountdown expireAt={session.expireAt}/>}
            </div>

          {/*  <div className="mt-2 flex items-start gap-2 rounded-[9px] border border-[#cbddff] bg-white px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#55617a]">
                <ShieldCheck size={16} className="mt-[2px] flex-none text-[#4e57d6]"/>
                <span>{t("szCard.approval.ecpNotice")}</span>
            </div>*/}

            <textarea
                ref={commentRef}
                value={comment}
                aria-invalid={!!commentError}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t(isSigningStep
                    ? "szCard.approval.commentPlaceholderSigning"
                    : "szCard.approval.commentPlaceholder")}
                className={`mt-2 w-full px-3 py-2.5 rounded-[9px] border bg-white text-[13px] outline-none resize-y ${
                    commentError
                        ? "border-[#e0483a] bg-[#fff8f7] shadow-[0_0_0_3px_rgba(224,72,58,0.12)] focus:border-[#e0483a]"
                        : "border-[#e5e9f0] focus:border-[#2f68f5]"
                }`}
            />
            {commentError && (
                <div role="alert" className="mt-1 text-[12px] font-medium text-[#c0392b]">{commentError}</div>
            )}

            {systemSignMode && (
                <div className={`mt-2.5 rounded-[9px] border px-3 py-2 text-[12px] leading-[1.5] ${
                    systemBlocked
                        ? "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]"
                        : "border-[#bfe3dd] bg-[#eef8f6] text-[#0f5e5a]"}`}>
                    {t(systemBlocked ? "resolutionPanel.systemSign.unavailable" : "resolutionPanel.systemSign.banner")}
                </div>
            )}

            {/* Основной путь — решение с подписью ЭЦП (или подписью системы — см. decide). */}
            <div className="mt-2.5 flex flex-wrap gap-2">
                <SzButton variant="success" size="sm" onClick={() => decide("Approved")} disabled={busy || systemBlocked}
                          className="gap-1.5">
                    <ShieldCheck size={14}/>
                    {approveLabel}
                </SzButton>
                {!isSigningStep && (
                    <SzButton variant="warning" size="sm" onClick={() => decide("ApprovedWithRemarks")}
                              disabled={busy || systemBlocked} className="gap-1.5">
                        <ShieldCheck size={14}/>
                        {t("szCard.approval.withRemarks")}
                    </SzButton>
                )}
                <SzButton variant="danger" size="sm" onClick={() => decide("Rejected")} disabled={busy || systemBlocked}
                          className="gap-1.5">
                    <ShieldCheck size={14}/>
                    {rejectLabel}
                </SzButton>
            </div>

            {/* Этап требует квалифицированной подписи: ЭЦП ГП «Инфоком» её и даёт, но остаются
                прежние способы — криптопровайдер на рабочем месте и облачная ЭП. */}
            {needsQualified && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[#8b97ab]">
                    <span>{t("szCard.approval.otherSignMethods")}</span>
                    <SzButton variant="muted" size="xs" onClick={() => void resolve("Approved")} disabled={busy}>
                        {t("szCard.approval.cryptoProviderSign")}
                    </SzButton>
                    {oepAvailable && (
                        <SzButton variant="brandSoft" size="xs" onClick={() => setOepModalOpen(true)} disabled={busy}>
                            {t("szCard.approval.cloudSign")}
                        </SzButton>
                    )}
                </div>
            )}

            {/* ТЕСТ только для СЗ (EcpSigning:AllowSzTestEcp): имитация всего пути ЭЦП — ПИН, код, токен,
                подпись — без ГП «Инфоком». В листе согласования печатается «ТЕСТОВАЯ ИМИТАЦИЯ ЭЦП». */}
            {allowSzTestEcp && (
                <div className="mt-3 rounded-[9px] border border-dashed border-[#f0dcae] bg-[#fffaf0] px-3 py-2.5">
                    <div className="mb-2 text-[11.5px] font-semibold text-[#8a5a00]">
                        {t("szCard.approval.testEcpTitle")}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <SzButton variant="successOutline" size="xs" className="gap-1"
                                  onClick={() => void testSignAndResolve("Approved")} disabled={busy}>
                            <ShieldCheck size={13}/>
                            {approveLabel} · {t("szCard.approval.testEcp")}
                        </SzButton>
                        {!isSigningStep && (
                            <SzButton variant="warning" size="xs" className="gap-1"
                                      onClick={() => void testSignAndResolve("ApprovedWithRemarks")} disabled={busy}>
                                <ShieldCheck size={13}/>
                                {t("szCard.approval.withRemarks")} · {t("szCard.approval.testEcp")}
                            </SzButton>
                        )}
                        <SzButton variant="danger" size="xs" className="gap-1"
                                  onClick={() => void testSignAndResolve("Rejected")} disabled={busy}>
                            <ShieldCheck size={13}/>
                            {rejectLabel} · {t("szCard.approval.testEcp")}
                        </SzButton>
                    </div>
                </div>
            )}

            {/* Тестовый режим сервера (EcpSigning:AllowWithoutEcp) — решения без подписи, как у ВНД. */}
            {allowWithoutEcp && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-[#cbddff] pt-3">
                    <SzButton variant="successOutline" size="xs" onClick={() => void resolve("Approved")} disabled={busy}>
                        {approveLabel} · {t("szCard.approval.withoutEcpTest")}
                    </SzButton>
                    {!isSigningStep && (
                        <SzButton variant="warning" size="xs" onClick={() => void resolve("ApprovedWithRemarks")}
                                  disabled={busy}>
                            {t("szCard.approval.withRemarks")} · {t("szCard.approval.withoutEcpTest")}
                        </SzButton>
                    )}
                    <SzButton variant="danger" size="xs" onClick={() => void resolve("Rejected")} disabled={busy}>
                        {rejectLabel} · {t("szCard.approval.withoutEcpTest")}
                    </SzButton>
                </div>
            )}

            <SystemSignConfirmModal
                choice={pendingSystem ? CHOICE[pendingSystem] : null}
                hash={systemHash}
                hashLoading={systemHashLoading}
                hashError={systemHashError}
                submitting={saving}
                onConfirm={() => void confirmSystemSign()}
                onClose={() => setPendingSystem(null)}
            />
        </div>
    );
}
