// Компонента прямого редактирования последней редакции (замена файлов/описания, без согласования)
import React, {useState} from "react";
import {createPortal} from "react-dom";
import {
    CheckCircle2, Download, Eye, FileText, Loader2, Paperclip, RefreshCcw, RotateCcw, Trash2, X,
} from "lucide-react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {VND_REDACTION_DESCRIPTION_MAX_LENGTH, VND_REDACTION_MAX_ATTACHMENTS} from "@/constants/validation/vndValidation.ts";
import {resolveVndDocTitle, buildRedactionFileName} from "@/utils/fileNaming.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {downloadWithToast} from "@/utils/downloadFile.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import type {RedactionLanguage, RedactionViewTarget} from "@/utils/redactionLanguagePanelUtils.ts";
import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import {MAX_FILE_SIZE} from "@/constants/validation/totalValidatuon.ts";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import { Tooltip } from "@/components/componentsGeneral/Tooltip";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

interface VndEditLastRevisionModalProps {
    vndId: number;
    /** Нужен для отображения названия документа на каждом языке (см. resolveVndDocTitle), для
     * имени файла при скачивании (см. buildRedactionFileName) и для просмотра (RedactionViewModal) -
     * как в RedactionDocumentsPanel/VndCoordinationTab. */
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    /** Роли текущего пользователя, дающие право "Редактировать последнюю редакцию напрямую"
     * (см. editLastRevisionRoleNames в VndEditionsTab) - показываются подсказкой в модалке,
     * тот же паттерн, что и у "Сделать редакцию действующей без согласования". */
    roleNames: string[];
    onClose: () => void;
    onSaved: (redaction: VndRedactionResponse) => void;
}

interface DocSlotDef {
    lang: RedactionLanguage;
    label: string;
    /** Уже загружен ли документ на этом языке (RU - всегда, KG/EN - опционально). */
    exists: boolean;
    fileId: number | null;
    /** Русский обязателен и его нельзя удалить - только заменить; KG/EN необязательны, их можно
     * убрать совсем (см. кнопку "Удалить" в DocReplaceSlot). */
    required: boolean;
    deletable: boolean;
    /** Название документа по паспорту ВНД на этом языке (см. resolveVndDocTitle) - показывается,
     * пока новый файл не выбран. */
    title: string | null;
}

// Документы редакции (RU/KG/EN) - строго DOCX: только такие файлы умеет открывать одиночный
// просмотр (см. кнопку "Просмотр"/RedactionViewModal, парсящий OOXML). Для вложений формат
// свободнее - см. ATTACHMENT_ACCEPT ниже.
const DOC_ACCEPT = ".docx";
const ATTACHMENT_ACCEPT = ".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx";

/** Строка одного документа редакции - показывает уже загруженный файл (его название по паспорту
 * ВНД) с кнопками просмотра и скачивания (только иконки), и кнопку "Заменить" (или "Добавить
 * документ", если на этом языке файла ещё нет). После выбора нового файла - подпись
 * "Обновлено"/"Добавлено" и кнопка "Вернуть" для отмены замены; для необязательных языков (KG/EN)
 * дополнительно доступна кнопка "Удалить"/"Отменить удаление" (тот же паттерн, что и на странице
 * согласования при исправлении замечаний - см. DocReplaceRow в VndRevisionNeededPanel). Русский
 * обязателен - помечен красной звёздочкой и без кнопки удаления. */
function DocReplaceSlot({def, file, removed, onFileSelected, onRevert, onDownload, onView, onToggleRemove}: {
    def: DocSlotDef;
    file: File | null;
    removed: boolean;
    onFileSelected: (file: File) => void;
    onRevert: () => void;
    onDownload: () => void;
    onView: () => void;
    onToggleRemove?: () => void;
}) {
    const isUpdated = file !== null;
    // Пересоздаём сам <input type="file"> после каждого выбора (через key), а не чистим
    // .value - на части машин (Windows, некоторые сборки Chrome/Edge) простая очистка .value
    // не всегда даёт браузеру повторно открыть диалог/прочитать новый выбор подряд без
    // промежуточного клика в другое место страницы. Активация через <label>, а не
    // button+ref.click() - тот же приём и обоснование, что и в VndApproverResolutionPanel
    // (fileInputKey): не зависит от "доверенности" пользовательского жеста между кликами.
    const [inputKey, setInputKey] = useState(0);

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0];
        if (picked) onFileSelected(picked);
        setInputKey((k) => k + 1);
    };

    return (
        <div
            className={`flex flex-wrap items-center gap-2.5 rounded-[9px] border px-3 py-[10px] ${
                removed
                    ? "border-[#f0c4c4] bg-[#fdf5f5]"
                    : isUpdated
                        ? "border-[#bfe3cc] bg-[#f4fbf6]"
                        : def.exists
                            ? "border-[#e5e9f0] bg-white"
                            : "border-dashed border-[#d5dae3] bg-[#fbfcfe]"
            }`}
        >
            <FileText
                size={16}
                className={`flex-none ${removed ? "text-[#c0392b]" : def.exists || isUpdated ? "text-[#4e57d6]" : "text-[#c3c9d4]"}`}
            />

            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                    {def.label} {def.required && <span className="text-[#c0392b]">*</span>}
                </span>
                <span className={`truncate text-[13px] ${removed ? "text-[#c0392b] line-through" : "text-[#26324a]"}`}>
                    {isUpdated ? file!.name : def.title ?? "Документ не загружен"}
                </span>
            </span>

            {removed ? (
                <span className="flex-none text-[11px] font-semibold text-[#c0392b]">Будет удалено</span>
            ) : isUpdated && (
                <span className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e8e3e]">
                    <CheckCircle2 size={12} className="flex-none"/>
                    {def.exists ? "Обновлено" : "Добавлено"}
                </span>
            )}

            {def.exists && !removed && (
                <>
                    <Tooltip content="Просмотреть документ (DOCX)" side="top">
                        <button
                            type="button"
                            onClick={onView}
                            className="cursor-pointer flex-none rounded-[7px] border border-[#e5e9f0] bg-white p-[6px] text-[#8b97ab] hover:border-[#4e57d6]/40 hover:text-[#4e57d6]"
                        >
                            <Eye size={14}/>
                        </button>
                    </Tooltip>
                    <Tooltip content="Скачать текущий файл" side="top">
                        <button
                            type="button"
                            onClick={onDownload}
                            className="cursor-pointer flex-none rounded-[7px] border border-[#e5e9f0] bg-white p-[6px] text-[#8b97ab] hover:border-[#4e57d6]/40 hover:text-[#4e57d6]"
                        >
                            <Download size={14}/>
                        </button>
                    </Tooltip>
                </>
            )}

            {!removed && (
                isUpdated ? (
                    <button
                        type="button"
                        onClick={onRevert}
                        className="cursor-pointer flex-none inline-flex items-center gap-1.5 rounded-[7px] border border-[#e5e9f0] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#8b97ab] hover:border-[#c0392b]/40 hover:text-[#c0392b]"
                    >
                        <RotateCcw size={13}/>
                        Вернуть
                    </button>
                ) : (
                    <label
                        className="cursor-pointer flex-none inline-flex items-center gap-1.5 rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                    >
                        <input key={inputKey} type="file" accept={DOC_ACCEPT} className="hidden" onChange={handlePick}/>
                        {def.exists ? <RefreshCcw size={13}/> : <Paperclip size={13}/>}
                        {def.exists ? "Заменить" : "Добавить документ"}
                    </label>
                )
            )}

            {def.deletable && def.exists && !isUpdated && onToggleRemove && (
                <button
                    type="button"
                    onClick={onToggleRemove}
                    className={`cursor-pointer flex-none rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                        removed
                            ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                            : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                    }`}
                >
                    {removed ? "Отменить удаление" : "Удалить"}
                </button>
            )}
        </div>
    );
}

export function VndEditLastRevisionModal({vndId, vnd, redaction, roleNames, onClose, onSaved}: VndEditLastRevisionModalProps) {
    const [docRu, setDocRu] = useState<File | null>(null);
    const [docKg, setDocKg] = useState<File | null>(null);
    const [docEn, setDocEn] = useState<File | null>(null);
    const [removedDocLangs, setRemovedDocLangs] = useState<Set<"kg" | "en">>(new Set());
    const [description, setDescription] = useState(redaction.description ?? "");

    // Вложения редакции - новые (добавленные сейчас) и id уже существующих, помеченных на
    // удаление (само удаление произойдёт только при сохранении, см. handleSubmit).
    const [newAttachments, setNewAttachments] = useState<File[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<Set<number>>(new Set());
    // См. комментарий у inputKey в DocReplaceSlot / fileInputKey в VndApproverResolutionPanel -
    // пересоздаём input через key после каждого выбора, активация через <label>.
    const [attachmentsInputKey, setAttachmentsInputKey] = useState(0);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Просмотр одного документа (только DOCX) - тот же RedactionViewModal, что и на странице
    // согласования.
    const [viewLang, setViewLang] = useState<RedactionViewTarget | null>(null);
    const viewDownload = useAsyncAction<number>();
    const handleViewDownload = (fileId: number, name: string) =>
        viewDownload.run(fileId, () => downloadWithToast(fileId, name), "Не удалось скачать документ");

    const docSlots: {def: DocSlotDef; file: File | null; setFile: (file: File | null) => void}[] = [
        {
            def: {
                lang: "ru", label: "Русский", exists: true, fileId: redaction.docFileRuId,
                required: true, deletable: false, title: resolveVndDocTitle(vnd, "ru"),
            },
            file: docRu,
            setFile: setDocRu,
        },
        {
            def: {
                lang: "kg", label: "Кыргызча", exists: redaction.docFileKgId !== null, fileId: redaction.docFileKgId,
                required: false, deletable: true,
                title: redaction.docFileKgId !== null ? resolveVndDocTitle(vnd, "kg") : null,
            },
            file: docKg,
            setFile: setDocKg,
        },
        {
            def: {
                lang: "en", label: "English", exists: redaction.docFileEnId !== null, fileId: redaction.docFileEnId,
                required: false, deletable: true,
                title: redaction.docFileEnId !== null ? resolveVndDocTitle(vnd, "en") : null,
            },
            file: docEn,
            setFile: setDocEn,
        },
    ];

    const toggleRemoveDoc = (lang: "kg" | "en") => {
        setRemovedDocLangs((prev) => {
            const next = new Set(prev);
            if (next.has(lang)) next.delete(lang);
            else next.add(lang);
            return next;
        });
    };

    const existingAttachmentCount = redaction.attachments.filter((a) => !removedAttachmentIds.has(a.fileId)).length;
    const totalAttachmentCount = existingAttachmentCount + newAttachments.length;
    const attachmentLimitReached = totalAttachmentCount >= VND_REDACTION_MAX_ATTACHMENTS;

    const toggleRemoveAttachment = (fileId: number) => {
        setRemovedAttachmentIds((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
            return next;
        });
    };

    const handleAttachmentsPicked = (files: FileList | null) => {
        if (files && files.length > 0) {
            const slotsLeft = VND_REDACTION_MAX_ATTACHMENTS - totalAttachmentCount;
            setNewAttachments((prev) => [...prev, ...Array.from(files).slice(0, slotsLeft)]);
        }
        setAttachmentsInputKey((k) => k + 1);
    };

    const hasChanges =
        docRu !== null || docKg !== null || docEn !== null
        || removedDocLangs.size > 0
        || description !== (redaction.description ?? "")
        || newAttachments.length > 0 || removedAttachmentIds.size > 0;

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.editLastRevisionDirectly(vndId, {
                docRu: docRu ?? undefined,
                docKg: docKg ?? undefined,
                docEn: docEn ?? undefined,
                removeDocKg: docKg === null && removedDocLangs.has("kg"),
                removeDocEn: docEn === null && removedDocLangs.has("en"),
                description,
                newAttachments: newAttachments.length > 0 ? newAttachments : undefined,
                removedAttachmentFileIds: removedAttachmentIds.size > 0 ? Array.from(removedAttachmentIds) : undefined,
            });
            onSaved(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось сохранить изменения");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[16px] font-bold text-[#1c2740]">Редактировать редакцию {redaction.code}</h2>
                            <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                                <X size={20}/>
                            </button>
                        </div>
                        <p className="mb-4 text-[12px] text-[#8b97ab]">
                            Изменения применятся напрямую — без запуска согласования, без создания новой редакции
                            и без изменения даты актуализации.
                        </p>

                        <div className="mb-4 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[11.5px] leading-[1.5] text-[#8b97ab]">
                            Допустимый формат: DOCX. Максимальный
                            размер каждого файла — {formatFileSize(MAX_FILE_SIZE)}.
                        </div>

                        <div className="flex flex-col gap-4">
                            {docSlots.map(({def, file, setFile}) => (
                                <DocReplaceSlot
                                    key={def.lang}
                                    def={def}
                                    file={file}
                                    removed={def.lang !== "ru" && removedDocLangs.has(def.lang)}
                                    onFileSelected={setFile}
                                    onRevert={() => setFile(null)}
                                    onDownload={() => {
                                        if (def.fileId === null) return;
                                        handleViewDownload(def.fileId, buildRedactionFileName(redaction.code, vnd.name, def.lang));
                                    }}
                                    onView={() => setViewLang(def.lang)}
                                    onToggleRemove={def.lang !== "ru" ? () => toggleRemoveDoc(def.lang as "kg" | "en") : undefined}
                                />
                            ))}

                            <div>
                                <div className="mb-[6px] flex items-center justify-between gap-2">
                                    <span className="text-[12.5px] font-semibold text-[#26324a]">
                                Вложения <span
                                        className="text-[#8b97ab] font-normal">(необязательно)</span>
                            </span>


                                    <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                                    Добавлено {totalAttachmentCount} из {VND_REDACTION_MAX_ATTACHMENTS} файлов максимум
                                    <HelpTooltip
                                        content={`Количество вложений к редакции ограничено — не более ${VND_REDACTION_MAX_ATTACHMENTS}, каждый файл не больше 50 МБ.`}
                                        side="top"
                                        className="h-5 w-5"
                                    />
                                </span>
                                </div>

                                <div className="flex flex-col gap-[6px]">
                                    {redaction.attachments.map((attachment) => {
                                        const willBeRemoved = removedAttachmentIds.has(attachment.fileId);
                                        return (
                                            <div
                                                key={attachment.fileId}
                                                className={`flex items-center gap-2 rounded-[9px] border px-3 py-[8px] ${
                                                    willBeRemoved ? "border-[#f0c4c4] bg-[#fdf5f5]" : "border-[#e5e9f0] bg-white"
                                                }`}
                                            >
                                                <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                                                <span
                                                    className={`flex-1 truncate text-[12.5px] ${
                                                        willBeRemoved ? "text-[#c0392b] line-through" : "text-[#26324a]"
                                                    }`}
                                                >
                                                    {attachment.fileName}
                                                </span>
                                                {!willBeRemoved && (
                                                    <Tooltip content="Скачать" side="top">
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadWithToast(attachment.fileId, attachment.fileName)}
                                                            className="cursor-pointer flex-none rounded-[7px] border border-[#e5e9f0] bg-white p-[6px] text-[#8b97ab] hover:border-[#4e57d6]/40 hover:text-[#4e57d6]"
                                                        >
                                                            <Download size={14}/>
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRemoveAttachment(attachment.fileId)}
                                                    className={`cursor-pointer flex-none rounded-[7px] border px-2.5 py-[5px] text-[11px] font-semibold transition-colors ${
                                                        willBeRemoved
                                                            ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                                                            : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                                                    }`}
                                                >
                                                    {willBeRemoved ? "Отменить удаление" : "Удалить"}
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {newAttachments.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[8px]"
                                        >
                                            <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                                            <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{file.name}</span>
                                            <span className="flex-none text-[11px] text-[#a3adbd]">
                                                {formatFileSize(file.size)}
                                            </span>
                                            <span className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e8e3e]">
                                                <CheckCircle2 size={12} className="flex-none"/>
                                                Добавлено
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setNewAttachments((prev) => prev.filter((_, i) => i !== index))}
                                                className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Активация через <label>/<input>, а не button+ref.click() - нативная связка
                                    надёжнее программного .click() и не ломается на повторных открытиях диалога
                                    подряд (см. тот же приём в VndApproverResolutionPanel/DocReplaceSlot). key у
                                    input пересобирает его после каждого выбора вместо очистки .value. */}
                                {attachmentLimitReached ? (
                                    <span
                                        className="mt-[6px] flex h-[38px] w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#e5e9f0] bg-[#f6f8fb] text-[11.5px] text-[#b7bfcc]"
                                    >
                                        <Paperclip size={14}/>
                                        Достигнут лимит вложений к редакции
                                    </span>
                                ) : (
                                    <label
                                        className="mt-[6px] flex h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[11.5px] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                    >
                                        <input
                                            key={attachmentsInputKey}
                                            type="file"
                                            multiple
                                            accept={ATTACHMENT_ACCEPT}
                                            className="hidden"
                                            onChange={(e) => handleAttachmentsPicked(e.target.files)}
                                        />
                                        <Paperclip size={14}/>
                                        Добавить файлы
                                    </label>
                                )}
                            </div>

                            <div>
                                <div className="mb-[6px] flex items-center justify-between">
                                    <span className="text-[12.5px] font-semibold text-[#26324a]">
                                        Описание редакции <span className="text-[#8b97ab] font-normal">(необязательно)</span>
                                    </span>
                                    <CharCounter length={description.length} max={VND_REDACTION_DESCRIPTION_MAX_LENGTH}/>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={6}
                                    maxLength={VND_REDACTION_DESCRIPTION_MAX_LENGTH}
                                    className="w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                                />
                            </div>

                            {error && (
                                <div className="rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !hasChanges}
                                className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting && <Loader2 size={15} className="animate-spin"/>}
                                Сохранить
                            </button>
                        </div>

                        {roleNames.length > 0 && (
                            <Clue className="mt-4">
                                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                                    <span>
                                        Право на данное редактирование Вам дают роли:
                                        {roleNames.length === 1 ? " роль:" : " роли:"}
                                    </span>
                                    {roleNames.map((name) => (
                                        <span
                                            key={name}
                                            className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#ececfc] text-[11.5px] font-semibold text-[#4e57d6] whitespace-nowrap"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </span>
                            </Clue>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {viewLang && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={redaction}
                    initialLanguage={viewLang}
                    downloadingId={viewDownload.activeId}
                    onDownload={handleViewDownload}
                    onClose={() => setViewLang(null)}
                />
            )}
        </>
    );
}
