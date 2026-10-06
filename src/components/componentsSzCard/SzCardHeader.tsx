// Шапка карточки СЗ: возврат в реестр, номер, статус, заголовок и действия над запиской.
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft} from "lucide-react";
import {colors} from "@/design/tokens.ts";
import type {SzCardState} from "@/hooks/sz/useSzCard.ts";
import {SzButton, szButtonClass} from "@/components/componentsSzCard/SzButton.tsx";
import {
    EDITABLE_STATUSES,
    STATUS_TONE,
    WITHDRAWABLE_STATUSES,
} from "@/components/componentsSzCard/szCardUtils.ts";

interface SzCardHeaderProps {
    card: SzCardState;
    onToggleWithdraw: () => void;
    onToggleForce: () => void;
}

export function SzCardHeader({card, onToggleWithdraw, onToggleForce}: SzCardHeaderProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {sz, isNew, isAuthor, editable, saving, canForceStatus, save, runAction} = card;

    const tone = sz ? STATUS_TONE[sz.statusCode] ?? colors.status.draft : colors.status.draft;
    const canSubmit = !!sz && isAuthor && EDITABLE_STATUSES.includes(sz.statusCode);
    const canWithdraw = !!sz && isAuthor && WITHDRAWABLE_STATUSES.includes(sz.statusCode);

    return (
        <>
            <button
                onClick={() => navigate("/sz")}
                className="inline-flex items-center gap-1.5 mb-3 border-none bg-transparent text-[13px] font-medium text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
            >
                <ArrowLeft className="w-4 h-4"/> {t("szCard.back")}
            </button>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[13px] text-[#55617a]">
                            {sz?.regNumber ?? t("szCard.noNumber")}
                        </span>
                        {sz && (
                            <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                  style={{color: tone.fg, background: tone.bg}}>
                                {t(`szRegistry.status.${sz.statusCode}`)}
                            </span>
                        )}
                    </div>
                    <h1 className="mt-1.5 mb-0 text-[21px] font-bold tracking-[-0.02em]">
                        {isNew ? t("szCard.newTitle") : sz?.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {editable && (
                        <SzButton variant="primary" onClick={save} disabled={saving}>
                            {saving ? t("szCard.actions.saving") : t("szCard.actions.save")}
                        </SzButton>
                    )}
                    {sz && canSubmit && (
                        <SzButton variant="outline" onClick={() => runAction("submit")} disabled={saving}>
                            {sz.regNumber
                                ? t("szCard.actions.submitForApproval")
                                : t("szCard.actions.submitForRegistration")}
                        </SzButton>
                    )}
                    {sz?.statusCode === "PendingRegistration" && (
                        <SzButton variant="success" onClick={() => runAction("register")} disabled={saving}>
                            {t("szCard.actions.register")}
                        </SzButton>
                    )}
                    {/* Печатная форма нужна и электронной записке — например, для подшивки в дело. */}
                    {sz && sz.statusCode !== "Draft" && (
                        <a
                            href={`/sz/${sz.id}/print`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${szButtonClass("muted")} no-underline`}
                        >
                            {t("szCard.actions.print")}
                        </a>
                    )}
                    {canWithdraw && (
                        <SzButton onClick={onToggleWithdraw} disabled={saving}>
                            {t("szCard.actions.withdraw")}
                        </SzButton>
                    )}
                    {sz && canForceStatus && (
                        <SzButton onClick={onToggleForce} disabled={saving}>
                            {t("szCard.actions.forceStatus")}
                        </SzButton>
                    )}
                    {sz?.statusCode === "Draft" && isAuthor && (
                        <SzButton variant="danger" onClick={() => runAction("delete")} disabled={saving}>
                            {t("szCard.actions.delete")}
                        </SzButton>
                    )}
                </div>
            </div>
        </>
    );
}
