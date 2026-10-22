// Подтверждение резолюции без ЭЦП КР - локальной подписью системы «Делосфера» (право
// SignWithoutNationalEcp, для сотрудников без гражданства КР). Вместо ПИН/кода/подписи ГП «Инфоком»
// пользователь подтверждает решение здесь; печать системы ставит backend над тем же хэшем резолюции,
// что показан в окне (backend сверяет его с пересчитанным, см. ResolutionSignatureService
// .BuildSystemSignatureAsync). Для "Отклонить" это окно заменяет обычное подтверждение отклонения.
import {useTranslation} from "react-i18next";
import {ShieldCheck, X} from "lucide-react";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import type {ResolutionChoice} from "./resolutionPanelTypes.ts";

interface SystemSignConfirmModalProps {
    choice: ResolutionChoice | null;
    /** Хэш резолюции с backend; null - ещё загружается или не получен. */
    hash: string | null;
    hashLoading: boolean;
    hashError: string | null;
    submitting?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function SystemSignConfirmModal({
    choice, hash, hashLoading, hashError, submitting, onConfirm, onClose,
}: SystemSignConfirmModalProps) {
    const {t} = useTranslation();
    if (choice === null) return null;

    const isReject = choice === "reject";
    const blocked = hashLoading || !!hashError || !hash;

    return (
        <ConfirmActionModal
            open
            onClose={onClose}
            onConfirm={() => { if (!blocked) onConfirm(); }}
            title={t(`resolutionPanel.systemSign.title.${choice}`)}
            message={t("resolutionPanel.systemSign.message")}
            confirmLabel={t(`resolutionPanel.systemSign.confirm.${choice}`)}
            loadingLabel={t("resolutionPanel.sending")}
            loading={submitting || hashLoading}
            error={hashError}
            variant={isReject ? "danger" : "primary"}
            accent="violet"
            icon={isReject ? X : ShieldCheck}
            wide
            wideConfirm
        >
            <div className="flex flex-col gap-3 text-left">
                <div className="rounded-[12px] border border-[#bfe3dd] bg-[#eef8f6] px-4 py-3 text-[12.5px] leading-[1.55] text-[#0f5e5a]">
                    <div className="mb-1 font-semibold">{t("resolutionPanel.systemSign.noticeTitle")}</div>
                    {t("resolutionPanel.systemSign.notice")}
                </div>
                {isReject && (
                    <div className="rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3.5 py-2 text-[12.5px] text-[#c0392b]">
                        {t("resolutionPanel.rejectConfirm.message")}
                    </div>
                )}

            </div>
        </ConfirmActionModal>
    );
}
