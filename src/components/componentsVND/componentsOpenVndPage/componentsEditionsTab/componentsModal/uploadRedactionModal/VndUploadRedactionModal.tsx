// Компонента загрузки новой редакции
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";

import type {VndRedactionAttachmentResponse, VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {VND_REDACTION_DESCRIPTION_MAX_LENGTH} from "@/constants/validation/vndValidation.ts";
import {formatBytes, REDACTION_MAX_FILE_SIZE} from "@/utils/vndProcess/uploadRedactionFiles.ts";
import {useUploadRedactionForm} from "@/hooks/vndHooks/useUploadRedactionForm.ts";

import {
    UploadRedactionFileSlot
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/uploadRedactionModal/UploadRedactionFileSlot.tsx";
import {
    UploadRedactionAttachments
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/uploadRedactionModal/UploadRedactionAttachments.tsx";
import {
    UploadRedactionApprovalToggle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/uploadRedactionModal/UploadRedactionApprovalToggle.tsx";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {Loader2, X} from "lucide-react";

interface VndUploadRedactionModalProps {
    vndId: number;
    /** "actualization" - модалка открыта из цикла актуализации (ВНД в статусе "На актуализации"):
     * меняется заголовок, а решение "требуется ли согласование" больше не выбирается здесь -
     * оно уже зафиксировано при старте цикла (см. lockedRequiresApproval). */
    mode?: "default" | "actualization";
    /** Только для mode="actualization": vnd.actualizationRequiresApproval — решение "с
     * согласованием / без", зафиксированное при старте текущего цикла актуализации. Чекбокс
     * "Требуется согласование" в этом режиме скрыт, значение берётся отсюда. */
    lockedRequiresApproval?: boolean;
    /** Вложения предыдущей редакции этого же ВНД - предзаполняют блок "Вложения" (по умолчанию
     * все перенесены), чтобы не грузить одни и те же файлы заново при каждой актуализации.
     * Можно убрать ненужные и добавить новые. Сервер к тому же сам не дублирует новые вложения,
     * совпадающие по содержимому с уже приложенными к этому ВНД (см. AddRedactionAsync).
     * Не передаётся для самой первой редакции нового ВНД. */
    previousAttachments?: VndRedactionAttachmentResponse[];
    onClose: () => void;
    onUploaded: (redaction: VndRedactionResponse) => void;
}

export function VndUploadRedactionModal({
                                            vndId, mode = "default", lockedRequiresApproval, previousAttachments,
                                            onClose, onUploaded,
                                        }: VndUploadRedactionModalProps) {
    const {t} = useTranslation();
    const isActualization = mode === "actualization";
    const form = useUploadRedactionForm({vndId, isActualization, lockedRequiresApproval, previousAttachments, onUploaded});

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div
                className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none items-center justify-between px-6 pt-6 pb-5">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">
                        {isActualization
                            ? t("vndUploadRedactionModal.titleActualization")
                            : t("vndUploadRedactionModal.titleDefault")}
                    </h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6">
                    <div
                        className="mb-2 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[11.5px] leading-[1.5] text-[#8b97ab]">
                        {t("vndUploadRedactionModal.formatHint", {maxSize: formatBytes(REDACTION_MAX_FILE_SIZE, t)})}
                        {/* ТИД для этой редакции загружается позже, отдельным шагом */}
                        {isActualization && <>{" "}{t("vndUploadRedactionModal.actualizationTidHint")}</>}
                    </div>
                    <div className="flex flex-col gap-4">
                        <UploadRedactionFileSlot label={t("vndUploadRedactionModal.docLabelRu")} required
                                                 file={form.docRu} onChange={form.setDocRu} onError={form.setError}/>
                        <UploadRedactionFileSlot label={t("vndUploadRedactionModal.docLabelKg")}
                                                 file={form.docKg} onChange={form.setDocKg} onError={form.setError}/>
                        <UploadRedactionFileSlot label={t("vndUploadRedactionModal.docLabelEn")}
                                                 file={form.docEn} onChange={form.setDocEn} onError={form.setError}/>

                        <UploadRedactionAttachments
                            previousAttachments={previousAttachments}
                            removedExistingIds={form.removedExistingAttachmentIds}
                            onToggleRemoveExisting={form.toggleRemoveExistingAttachment}
                            attachments={form.attachments}
                            onAdd={form.addAttachments}
                            onRemove={form.removeAttachment}
                            totalCount={form.totalAttachmentCount}
                            limitReached={form.attachmentLimitReached}
                            countLimitHit={form.attachmentCountLimitHit}
                        />

                        <div>
                            <div className="mb-[6px] flex items-center justify-between">
                                <span className="text-[12.5px] font-semibold text-[#26324a]">
                                    {t("vndUploadRedactionModal.descriptionLabel")}{" "}
                                    <span className="text-[#8b97ab] font-normal">{t("vndUploadRedactionModal.optional")}</span>
                                </span>
                                <CharCounter length={form.description.length} max={VND_REDACTION_DESCRIPTION_MAX_LENGTH}/>
                            </div>
                            <textarea
                                value={form.description}
                                onChange={(e) => form.setDescription(e.target.value)}
                                placeholder={t("vndUploadRedactionModal.descriptionPlaceholder")}
                                rows={3}
                                maxLength={VND_REDACTION_DESCRIPTION_MAX_LENGTH}
                                className="w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                            />
                        </div>

                        {/* Чекбокс показываем только тем, у кого есть права на публикацию редакции без согласования */}
                        {form.canSkipApproval && (
                            <UploadRedactionApprovalToggle
                                checked={form.requiresApproval}
                                onToggle={() => form.setRequiresApproval((v) => !v)}
                                grantingRoleNames={form.grantingRoleNames}
                            />
                        )}

                        {form.error && (
                            <div
                                className="rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                                {form.error}
                            </div>
                        )}
                    </div>
                    <div className="pb-6"/>
                </div>

                <div className="flex flex-none justify-end gap-2 border-t border-[#eef0f5] px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={form.submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        {t("vndUploadRedactionModal.cancel")}
                    </button>
                    <button
                        onClick={form.submit}
                        disabled={!form.canSubmit}
                        className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.submitting && <Loader2 size={15} className="animate-spin"/>}
                        {t("vndUploadRedactionModal.upload")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
