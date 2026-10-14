// Шапка карточки СЗ: возврат в реестр, номер, статус, заголовок и действия над запиской.
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

import type {SzCardState} from "@/hooks/sz/useSzCard.ts";
import {
    EDITABLE_STATUSES,
    STATUS_TONE,
    WITHDRAWABLE_STATUSES,
} from "@/utils/szProcess/szCardUtils.ts";

import {SzButton, szButtonClass} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

import {colors} from "@/design/tokens.ts";
import {ArrowLeft, Check, Send} from "lucide-react";

interface SzCardHeaderProps {
    card: SzCardState;
    onToggleWithdraw: () => void;
    onToggleForce: () => void;
}

export function SzCardHeader({card, onToggleWithdraw, onToggleForce}: SzCardHeaderProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const {sz, isNew, isAuthor, editable, saving, canForceStatus, canRegister, save, runAction} = card;

    const tone = sz ? STATUS_TONE[sz.statusCode] ?? colors.status.draft : colors.status.draft;
    const canSubmit = !!sz && isAuthor && EDITABLE_STATUSES.includes(sz.statusCode);
    const canWithdraw = !!sz && isAuthor && WITHDRAWABLE_STATUSES.includes(sz.statusCode);

    return (
        <>
            {/* Назад к служебным запискам */}
            <button
                onClick={() => navigate("/sz")}
                className="inline-flex items-center gap-1.5 mb-3 border-none bg-transparent text-[13px] font-medium text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
            >
                <ArrowLeft className="w-4 h-4"/> {t("szCard.back")}
            </button>

            <div className="flex items-start justify-between gap-4">
                {/* Номер, статус, тема */}
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

                {/* Кнопки */}
                <div className="flex items-center gap-2">
                    {/* Новая записка: «Отмена» возвращает в реестр, «Создать черновик-записку» сохраняет.
                        Вид кнопок — как на создании ВНД (CreateVndPage), только синяя. */}
                    {isNew && (
                        <button
                            onClick={() => navigate("/sz")}
                            disabled={saving}
                            className="h-11 px-[18px] rounded-[11px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[13.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {t("szCard.actions.cancelCreate")}
                        </button>
                    )}
                    {/* Создать черновик-записку (новая) / Сохранить (правка) */}
                    {editable && (isNew ? (
                        <button
                            onClick={save}
                            disabled={saving}
                            className={`inline-flex items-center gap-2 h-11 px-[22px] rounded-[11px] border-none font-semibold text-[14px] ${
                                saving
                                    ? "bg-[#e5e9f0] text-[#a3adbd] cursor-not-allowed"
                                    : "bg-[#2f68f5] text-white cursor-pointer hover:brightness-[1.06] shadow-[0_8px_20px_-8px_#2f68f5]"
                            }`}
                        >
                            <Check className="w-[18px] h-[18px]" strokeWidth={2}/>
                            {saving ? t("szCard.actions.creatingDraft") : t("szCard.actions.createDraft")}
                        </button>
                    ) : (
                        <SzButton variant="primary" onClick={save} disabled={saving}>
                            {saving ? t("szCard.actions.saving") : t("szCard.actions.save")}
                        </SzButton>
                    ))}
                    {/* Отправить на регистрацию/Согласование */}
                    {sz && canSubmit && (
                        <SzButton variant="outline" onClick={() => setConfirmSubmit(true)} disabled={saving}>
                            {sz.regNumber
                                ? t("szCard.actions.submitForApproval")
                                : t("szCard.actions.submitForRegistration")}
                        </SzButton>
                    )}
                    {/* Зарегистрировать — только Сектор делопроизводства (право RegisterSz) */}
                    {sz?.statusCode === "PendingRegistration" && canRegister && (
                        <SzButton variant="success" onClick={() => runAction("register")} disabled={saving}>
                            {t("szCard.actions.register")}
                        </SzButton>
                    )}
                    {/* Печатная форма нужна и электронной записке - например, для подшивки в дело. */}
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
                    {/* Отозвать */}
                    {canWithdraw && (
                        <SzButton onClick={onToggleWithdraw} disabled={saving}>
                            {t("szCard.actions.withdraw")}
                        </SzButton>
                    )}
                    {/* Перевести статус */}
                    {sz && canForceStatus && (
                        <SzButton onClick={onToggleForce} disabled={saving}>
                            {t("szCard.actions.forceStatus")}
                        </SzButton>
                    )}
                    {/* Удалить */}
                    {sz?.statusCode === "Draft" && isAuthor && (
                        <SzButton variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
                            {t("szCard.actions.delete")}
                        </SzButton>
                    )}
                </div>
            </div>

            {/* Подтверждение отправки: на регистрацию (нет номера) или на согласование */}
            <ConfirmActionModal
                open={confirmSubmit}
                onClose={() => setConfirmSubmit(false)}
                onConfirm={async () => {
                    await runAction("submit");
                    setConfirmSubmit(false);
                }}
                title={sz?.regNumber ? t("szCard.submitConfirm.approvalTitle") : t("szCard.submitConfirm.registrationTitle")}
                message={sz?.regNumber ? t("szCard.submitConfirm.approvalMessage") : t("szCard.submitConfirm.registrationMessage")}
                confirmLabel={sz?.regNumber ? t("szCard.actions.submitForApproval") : t("szCard.actions.submitForRegistration")}
                loadingLabel={t("szCard.submitConfirm.processing")}
                loading={saving}
                variant="primary"
                icon={Send}
                wideConfirm
            />

            <ConfirmDeleteModal
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await runAction("delete");
                    setConfirmDelete(false);
                }}
                title={t("szCard.deleteConfirm.title")}
                message={t("szCard.deleteConfirm.message")}
                loading={saving}
            />
        </>
    );
}
