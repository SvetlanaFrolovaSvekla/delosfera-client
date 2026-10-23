// Шапка карточки СЗ: возврат в реестр, номер, статус, заголовок и действия над запиской.
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {szPrintUrl} from "@/service/szService/szPaperService.ts";
import type {SzCardState} from "@/hooks/sz/useSzCard.ts";
import {
    EDITABLE_STATUSES,
    STATUS_TONE,
    WITHDRAWABLE_STATUSES,
} from "@/utils/szProcess/szCardUtils.ts";

import {SzButton, szButtonClass} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {SzFavoriteButton} from "@/components/componentsSz/componentsSzRegistry/SzFavoriteButton.tsx";

import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

import {colors} from "@/design/tokens.ts";
import {
    ArrowLeft,
    ArrowRightLeft,
    BadgeCheck,
    Download,
    FilePlus,
    PencilLine,
    Save,
    Send,
    Trash2,
    Undo2,
    X
} from "lucide-react";

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
    const [confirmRegister, setConfirmRegister] = useState(false);
    const [confirmCorrect, setConfirmCorrect] = useState(false);
    const {sz, isNew, isAuthor, canEditAny, canWithdrawAny, editable, saving, canForceStatus, canRegister, save, runAction} = card;
    // Сколько подписей уже собрано в текущем круге — от этого зависит предупреждение.
    const visas = card.route?.steps.reduce((n, s) => n + s.participants.filter((p) => p.resolution).length, 0) ?? 0;

    const tone = sz ? STATUS_TONE[sz.statusCode] ?? colors.status.draft : colors.status.draft;
    const canSubmit = !!sz && (isAuthor || canEditAny) && EDITABLE_STATUSES.includes(sz.statusCode);
    const canWithdraw = !!sz && (isAuthor || canWithdrawAny) && WITHDRAWABLE_STATUSES.includes(sz.statusCode);

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
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* Новая записка: «Отмена» возвращает в реестр, «Создать черновик-записку» сохраняет.
                        Вид кнопок — как на создании ВНД (CreateVndPage), только синяя. */}
                    {isNew && (
                        <button
                            onClick={() => navigate("/sz")}
                            disabled={saving}
                            className="inline-flex items-center gap-2 h-11 px-[18px] rounded-[11px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[13.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <X className="w-[18px] h-[18px]" strokeWidth={2}/>
                            {t("szCard.actions.cancelCreate")}
                        </button>
                    )}
                    {/* Создать черновик-записку (новая) / Сохранить (правка) */}
                    {editable && (isNew ? (
                        <button
                            onClick={() => void save()}
                            disabled={saving}
                            className={`inline-flex items-center gap-2 h-11 px-[22px] rounded-[11px] border-none font-semibold text-[14px] ${
                                saving
                                    ? "bg-[#e5e9f0] text-[#a3adbd] cursor-not-allowed"
                                    : "bg-[#2f68f5] text-white cursor-pointer hover:brightness-[1.06] shadow-[0_8px_20px_-8px_#2f68f5]"
                            }`}
                        >
                            <FilePlus className="w-[18px] h-[18px]" strokeWidth={2}/>
                            {saving ? t("szCard.actions.creatingDraft") : t("szCard.actions.createDraft")}
                        </button>
                    ) : (
                        <SzButton variant="primary" icon={<Save size={16}/>} onClick={() => void save()} disabled={saving}>
                            {saving ? t("szCard.actions.saving") : t("szCard.actions.save")}
                        </SzButton>
                    ))}
                    {/* Отправить на регистрацию/Согласование */}
                    {sz && canSubmit && (
                        <SzButton variant="outline" icon={<Send size={16}/>} onClick={() => setConfirmSubmit(true)} disabled={saving}>
                            {sz.regNumber
                                ? t("szCard.actions.submitForApproval")
                                : t("szCard.actions.submitForRegistration")}
                        </SzButton>
                    )}
                    {/* Зарегистрировать — только Сектор делопроизводства (право RegisterSz) */}
                    {sz?.statusCode === "PendingRegistration" && canRegister && (
                        <SzButton variant="success" icon={<BadgeCheck size={16}/>} onClick={() => setConfirmRegister(true)} disabled={saving}>
                            {t("szCard.actions.register")}
                        </SzButton>
                    )}
                    {/* Печатная форма нужна и электронной записке - например, для подшивки в дело.
                        Две версии листа согласования, как у ВНД: с подписями ЭЦП и для подписи от руки.
                        Рядом — «Скачать / печать»: PDF, DOCX или сразу на принтер. */}
                    {sz && sz.statusCode !== "Draft" && (
                        <>
                            <Tooltip content={t("szCard.document.menuHint")} side="bottom">
                                <a
                                    href={szPrintUrl(sz.id, "signed")}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`${szButtonClass("muted")} no-underline gap-1.5`}
                                >
                                    <Download size={15}/>
                                    {t("szCard.document.menu")}
                                </a>
                            </Tooltip>
                        </>
                    )}
                    {/* Корректировать на согласовании (право CorrectSzOnApproval) */}
                    {card.canCorrectOnApproval && !card.correcting && (
                        <SzButton icon={<PencilLine size={16}/>} onClick={() => setConfirmCorrect(true)} disabled={saving}>
                            {t("szCard.correction.start")}
                        </SzButton>
                    )}
                    {card.correcting && (
                        <SzButton icon={<X size={16}/>} disabled={saving}
                                  onClick={() => { card.setCorrecting(false); void card.reload(); }}>
                            {t("szCard.correction.cancel")}
                        </SzButton>
                    )}
                    {/* Отозвать */}
                    {canWithdraw && (
                        <SzButton icon={<Undo2 size={16}/>} onClick={onToggleWithdraw} disabled={saving}>
                            {t("szCard.actions.withdraw")}
                        </SzButton>
                    )}
                    {/* Перевести статус */}
                    {sz && canForceStatus && (
                        <SzButton icon={<ArrowRightLeft size={16}/>} onClick={onToggleForce} disabled={saving}>
                            {t("szCard.actions.forceStatus")}
                        </SzButton>
                    )}

                    {/* Избранное и удаление черновика */}
                    {sz && !isNew && (
                        <>
                            {/* Избранное - личная отметка, как у ВНД; появится на вкладке «Избранное» в реестре */}
                            <SzFavoriteButton variant="button" szId={sz.id} isFavorite={!!sz.isFavorite}/>
                            {/* Удалить - только корзинка */}
                            {sz.statusCode === "Draft" && isAuthor && (
                                <Tooltip content={t("szCard.actions.delete")} side="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        disabled={saving}
                                        aria-label={t("szCard.actions.delete")}
                                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[#f1c9c2] bg-white text-[#c0392b] transition-colors hover:bg-[#fbeae7] disabled:opacity-50"
                                    >
                                        <Trash2 size={15}/>
                                    </button>
                                </Tooltip>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Подтверждение отправки: на регистрацию (нет номера) или на согласование */}
            <ConfirmActionModal
                open={confirmCorrect}
                onClose={() => setConfirmCorrect(false)}
                onConfirm={async () => {
                    card.setCorrecting(true);
                    setConfirmCorrect(false);
                }}
                title={t("szCard.correction.confirmTitle")}
                message={visas > 0
                    ? t("szCard.correction.confirmWithVisas", {count: visas})
                    : t("szCard.correction.confirmNoVisas")}
                confirmLabel={t("szCard.correction.start")}
                loadingLabel={t("szCard.correction.start")}
                loading={saving}
                variant="primary"
                icon={PencilLine}
            />

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
                accent="blue"
                icon={Send}
                wideConfirm

            />

            {/* Подтверждение регистрации: присваивает номер и запускает согласование - необратимо */}
            <ConfirmActionModal
                open={confirmRegister}
                onClose={() => setConfirmRegister(false)}
                onConfirm={async () => {
                    await runAction("register");
                    setConfirmRegister(false);
                }}
                title={t("szCard.submitConfirm.registerTitle")}
                message={t("szCard.submitConfirm.registerMessage")}
                confirmLabel={t("szCard.actions.register")}
                loadingLabel={t("szCard.submitConfirm.registerProcessing")}
                loading={saving}
                variant="primary"
                accent="blue"
                icon={BadgeCheck}
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
