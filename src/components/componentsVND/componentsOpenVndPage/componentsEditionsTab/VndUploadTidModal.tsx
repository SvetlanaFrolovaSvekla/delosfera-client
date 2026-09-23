// Модалка "Сформировать или загрузить ТИД/ Загрузка ТИД"
import {useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

import {useTidDiffRows} from "@/hooks/vndHooks/useTidDiffRows.ts";
import {downloadBlob} from "@/utils/docxWork/docxTidExport.ts";
import {formatBytes} from "@/utils/formatBytes.ts";
import {MAX_FILE_SIZE} from "@/constants/validation/totalValidatuon.ts";
import {
    TidChangesTable
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/TidChangesTable.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

import tidTemplateBlankUrl from "@/assets/tid/tidTemplateBlank.docx?url";
import {Download, FileUp, Loader2, Trash2, X} from "lucide-react";

interface VndUploadTidModalProps {
    vndId: number;
    redactionCode: string;
    /** Название ВНД на русском (vnd.titleRu) - подставляется в заголовок "к «…»" шаблона ТИД. */
    vndTitle: string;
    /** RU-файл действующей редакции (до этого черновика) — источник для автосравнения. null,
     * если действующей редакции нет (первая редакция ВНД ТИД не требует, сюда попасть не должна). */
    previousFileId: number | null;
    /** RU-файл черновика редакции, к которому прикладывается ТИД. */
    draftFileId: number | null;
    /** Локальный (ещё не отправленный) RU-файл новой редакции - если задан, автосравнение идёт
     * с ним вместо draftFileId. Используется на доработке после замечаний (VndRevisionNeededPanel),
     * когда инициатор уже выбрал исправленный документ на замену, но ещё не отправил его. */
    draftFile?: File | null;
    /** Тот, кто сейчас формирует ТИД (обычно - текущий пользователь, будущий инициатор
     * согласования) - предзаполняет строку "Разработчик:" под таблицей. См. canSelectResponsible
     * ниже: не-главный редактор это значение изменить не может, поэтому оно и должно быть именно
     * им самим, а не, например, ответственным за актуализацию (это другая роль). */
    defaultResponsibleUserId: number | null;
    defaultResponsibleUserName: string | null;
    /** Право изменять поле "Разработчик" сформированного ТИД — доступно главному редактору и
     * администратору; остальные видят поле без выпадающего списка. */
    canSelectResponsible: boolean;
    /** Доступна ли этому пользователю публикация редакции без согласования — влияет только на
     * формулировку вводного текста модалки (см. ниже). */
    canUploadWithoutApproval: boolean;
    onClose: () => void;
    /** Обычный режим - ТИД сразу загружается на сервер к последней редакции
     * (vndService.uploadTidForLastRedaction). Не нужен в режиме прикрепления (onAttach). */
    onUploaded?: (redaction: VndRedactionResponse) => void;
    /** Режим "прикрепить к отправке" (доработка после замечаний, см. VndRevisionNeededPanel):
     * файл ТИД на сервер НЕ загружается - модалка просто отдаёт выбранный файл вызывающей
     * стороне, а та отправит его вместе с исправленной редакцией (coordinationService.resubmit). */
    onAttach?: (file: File) => void;
    /** Уже прикреплённый ранее файл ТИД (режим onAttach) - чтобы при повторном открытии модалки
     * было видно, что выбрано, и можно было заменить. */
    initialFile?: File | null;
}

export function VndUploadTidModal({
                                      vndId, redactionCode, vndTitle, previousFileId, draftFileId, draftFile,
                                      defaultResponsibleUserId, defaultResponsibleUserName, canSelectResponsible,
                                      canUploadWithoutApproval,
                                      onClose, onUploaded, onAttach, initialFile,
                                  }: VndUploadTidModalProps) {
    const {t} = useTranslation();
    const isAttachMode = !!onAttach;
    const [tid, setTid] = useState<File | null>(initialFile ?? null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Пока таблица изменений не сформирована по кнопке "Сформировать ТИД" (см. TidChangesTable),
    // сама таблица не показывается - вместо неё там просто кнопка формирования.
    const [tidFormed, setTidFormed] = useState(false);

    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch(tidTemplateBlankUrl);
            if (!response.ok) {
                // Не удалось скачать шаблон ТИД
                setError(t("vndUploadTidModal.templateDownloadError"));
                return;
            }
            const blob = await response.blob();
            // ТИД_шаблон.docx
            downloadBlob(blob, t("vndUploadTidModal.templateFileName"));
        } catch (e) {
            // Не удалось скачать шаблон ТИД
            setError(e instanceof Error ? e.message : t("vndUploadTidModal.templateDownloadError"));
        }
    };

    // Публикация без согласования доступна этому пользователю только если он одновременно может
    // и загружать редакции без согласования, и менять разработчика ТИД - иначе текст ниже говорит
    // только про отправку на согласование.
    const canPublishWithoutApproval = canUploadWithoutApproval && canSelectResponsible;

    const {rows, status} = useTidDiffRows(previousFileId, draftFile ?? draftFileId);

    const handlePick = (picked: File | null) => {
        if (picked && picked.size > MAX_FILE_SIZE) {
            // Файл «${picked.name}» превышает допустимый размер (${formatBytes(MAX_FILE_SIZE, t)})
            setError(
                t("vndUploadTidModal.fileTooLarge", {
                    fileName: picked.name,
                    maxSize: formatBytes(MAX_FILE_SIZE),
                })
            );
            return;
        }
        setError(null);
        setTid(picked);
    };

    const handleSubmit = async () => {
        if (!tid) return;
        if (onAttach) {
            onAttach(tid);
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.uploadTidForLastRedaction(vndId, tid);
            onUploaded?.(result);
        } catch (e) {
            // Не удалось загрузить ТИД
            setError(e instanceof Error ? e.message : t("vndUploadTidModal.uploadError"));
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div
                className="flex max-h-[90vh] w-[95vw] max-w-[1240px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">

                <div className="flex flex-none items-center justify-between border-b border-[#eef2f7] px-6 py-4">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">
                        {/* Загрузка ТИД — {redactionCode} / ТИД к исправленной редакции — {redactionCode} */}
                        {isAttachMode
                            ? t("vndUploadTidModal.revisionTitle", {redactionCode})
                            : t("vndUploadTidModal.title", {redactionCode})}
                    </h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {isAttachMode ? (
                    <Clue className="mb-4">
                        {t("vndUploadTidModal.introRevisionRound")}
                    </Clue>
                    ) : (
                    <Clue className="mb-4">
                        {/* ТИД (Таблица изменений и дополнений) — документ, необходимый для отправки этой
                        редакции на согласование{canPublishWithoutApproval ? " или публикации без согласования" : ""}. */}
                        {t("vndUploadTidModal.introRequiredForApproval")}
                        {canPublishWithoutApproval && t("vndUploadTidModal.introOrPublishWithoutApproval")}
                        {/* Ниже — автоматически сформированная таблица изменений между действующей и новой
                        редакцией: используйте её как основу при подготовке и заполнении самого файла ТИД
                        (пожалуйста, проверьте корректность сформированного текста, добавьте обоснование
                        изменений, отредактируйте необходимые места). */}
                        {t("vndUploadTidModal.introAutoTableExplanation")}
                        {/* Вы также обладаете правом изменения поля "Разработчик". */}
                        {canPublishWithoutApproval && t("vndUploadTidModal.introDeveloperFieldRight")}
                        {" "}
                        {/* Далее Вы можете скачать сформированный ТИД, проверить корректность сформированного
                        по шаблону ТИД и загрузить его в систему. */}
                        {t("vndUploadTidModal.introDownloadCheckUpload")}
                    </Clue>
                    )}

                    <div
                        className="mb-6 flex flex-col gap-3 rounded-[14px] border border-[#e5e9f0] bg-[#f9fafc] p-4 sm:flex-row sm:items-center">
                        <div className="flex-1">
                            <div className="mb-[6px] flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[12.5px] font-semibold text-[#26324a]">
                                    {/* Загрузите ТИД (Таблица изменений и дополнений) к данной редакции: */}
                                    {t("vndUploadTidModal.uploadTidLabel")} <span className="text-[#c0392b]">*</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="flex flex-none cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e5e9f0] bg-white px-[10px] py-[5px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#f6f8fb]"
                                >
                                    <Download size={13}/>
                                    {/* Скачать шаблон ТИД в формате DOCX */}
                                    {t("vndUploadTidModal.downloadTemplateButton")}
                                </button>
                            </div>
                            {!tid ? (
                                <label
                                    htmlFor="upload-tid-file"
                                    className="flex h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-white text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                >
                                    <FileUp size={18}/>
                                    <span className="text-[11.5px]">
                                        {/* Выбрать файл (DOCX) */}
                                        {t("vndUploadTidModal.chooseFile")}
                                    </span>
                                    <input
                                        id="upload-tid-file"
                                        type="file"
                                        accept=".doc,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            handlePick(e.target.files?.[0] ?? null);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                            ) : (
                                <div
                                    className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
                                    <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{tid.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setTid(null)}
                                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                    >
                                        <Trash2 size={15}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <TidChangesTable
                        autoRows={rows}
                        loading={status === "loading"}
                        unavailable={status === "unavailable" || status === "error"}
                        exportFileName={`ТИД_${redactionCode}.docx`}
                        defaultResponsibleUserId={defaultResponsibleUserId}
                        defaultResponsibleUserName={defaultResponsibleUserName}
                        canSelectResponsible={canSelectResponsible}
                        vndTitle={vndTitle}
                        formed={tidFormed}
                        onForm={() => setTidFormed(true)}
                    />

                    {error && (
                        <div
                            className="mb-6 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex flex-none justify-end gap-2 border-t border-[#eef2f7] px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        {/* Отмена */}
                        {t("vndUploadTidModal.cancel")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!tid || submitting}
                        className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={15} className="animate-spin"/>}
                        {/* Загрузить / Прикрепить ТИД */}
                        {isAttachMode ? t("vndUploadTidModal.attach") : t("vndUploadTidModal.upload")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}