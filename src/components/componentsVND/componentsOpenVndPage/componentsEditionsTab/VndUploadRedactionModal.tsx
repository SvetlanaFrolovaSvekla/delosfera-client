// Компонента загрузки новой редакции
import {useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {FileUp, Loader2, Paperclip, Trash2, X, Check} from "lucide-react";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {
    VND_REDACTION_DESCRIPTION_MAX_LENGTH,
    VND_REDACTION_MAX_ATTACHMENTS,
} from "@/constants/validation/vndValidation.ts";

interface VndUploadRedactionModalProps {
    vndId: number;
    /** "actualization" — модалка открыта из цикла актуализации (ВНД в статусе "На актуализации"):
     * меняется заголовок, а решение "требуется ли согласование" больше не выбирается здесь -
     * оно уже зафиксировано при старте цикла (см. lockedRequiresApproval). */
    mode?: "default" | "actualization";
    /** Только для mode="actualization": vnd.actualizationRequiresApproval — решение "с
     * согласованием / без", зафиксированное при старте текущего цикла актуализации. Чекбокс
     * "Требуется согласование" в этом режиме скрыт, значение берётся отсюда. */
    lockedRequiresApproval?: boolean;
    onClose: () => void;
    onUploaded: (redaction: VndRedactionResponse) => void;
}

interface FileSlotProps {
    label: string;
    required?: boolean;
    hint?: string;
    accept?: string;
    file: File | null;
    onChange: (file: File | null) => void;
    /** Вызывается с текстом ошибки, если выбранный файл превышает MAX_FILE_SIZE
     * (в этом случае файл НЕ принимается — onChange не вызывается вовсе). Передать
     * null явно на успешный выбор, чтобы сбросить возможную предыдущую ошибку. */
    onError?: (message: string | null) => void;
}

function FileSlot({
                      label,
                      required,
                      hint,
                      accept = ".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx",
                      file,
                      onChange,
                      onError,
                  }: FileSlotProps) {
    const inputId = `redaction-file-${label}`;

    const handlePick = (picked: File | null) => {
        if (picked && picked.size > MAX_FILE_SIZE) {
            onError?.(`Файл «${picked.name}» превышает допустимый размер (${formatBytes(MAX_FILE_SIZE)})`);
            return;
        }
        onError?.(null);
        onChange(picked);
    };

    return (
        <div>
            <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">
                {label} {required && <span className="text-[#c0392b]">*</span>}
            </div>
            {hint && <div className="mb-[6px] text-[11.5px] text-[#8b97ab]">{hint}</div>}
            {!file ? (
                <label
                    htmlFor={inputId}
                    className={`flex h-[70px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb] ${
                        required ? "border-[#e8b4b4] bg-[#fdf1f1]" : "border-[#d5dae3] bg-[#fbfcfe]"
                    }`}
                >
                    <FileUp size={18}/>
                    <span className="text-[11.5px]">Выбрать файл (DOCX)</span>
                    <input
                        id={inputId}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                            handlePick(e.target.files?.[0] ?? null);
                            e.target.value = ""; // чтобы можно было выбрать тот же файл повторно после ошибки
                        }}
                    />
                </label>
            ) : (
                <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
                    <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{file.name}</span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                    >
                        <Trash2 size={15}/>
                    </button>
                </div>
            )}
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ

export function VndUploadRedactionModal({
                                            vndId, mode = "default", lockedRequiresApproval,
                                            onClose, onUploaded,
                                        }: VndUploadRedactionModalProps) {
    const {user, hasPermission} = useAuth();
    const isActualization = mode === "actualization";
    // Право обойтись без согласования — не имеет значения в mode="actualization", там решение
    // уже зафиксировано при старте цикла (lockedRequiresApproval), см. AddRedactionAsync на бэке,
    // которая тоже игнорирует request.RequiresApproval в рамках открытого цикла актуализации.
    const canSkipApproval = !isActualization && hasPermission(PermissionCode.CreateVndWithoutApproval);

    // Роли пользователя, которые конкретно дают это право - чтобы показать в подсказке
    const grantingRoleNames = useMemo(() => {
        if (!canSkipApproval || !user) return [];
        return user.roles
            .filter((role) => role.permissionCodes.includes(PermissionCode.CreateVndWithoutApproval))
            .map((role) => role.name);
    }, [canSkipApproval, user]);

    const [docRu, setDocRu] = useState<File | null>(null);
    const [docKg, setDocKg] = useState<File | null>(null);
    const [docEn, setDocEn] = useState<File | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentCountLimitHit, setAttachmentCountLimitHit] = useState(false);
    const [description, setDescription] = useState("");
    const [requiresApproval, setRequiresApproval] = useState(true);
    // В режиме актуализации решение уже зафиксировано на старте цикла - используем его напрямую,
    // а не локальное состояние чекбокса (которого в этом режиме нет).
    const effectiveRequiresApproval = isActualization ? !!lockedRequiresApproval : requiresApproval;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = docRu !== null && !submitting;

    const attachmentSlotsLeft = VND_REDACTION_MAX_ATTACHMENTS - attachments.length;
    const attachmentLimitReached = attachmentSlotsLeft <= 0;

    const handleAddAttachments = (files: FileList | null) => {
        if (!files) return;
        const incoming = Array.from(files);

        const oversized = incoming.find((f) => f.size > MAX_FILE_SIZE);
        if (oversized) {
            setError(`Файл «${oversized.name}» превышает допустимый размер (50 МБ)`);
            return;
        }

        setError(null);
        const accepted = incoming.slice(0, Math.max(0, attachmentSlotsLeft));
        setAttachmentCountLimitHit(accepted.length < incoming.length);
        setAttachments((prev) => [...prev, ...accepted]);
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
        setAttachmentCountLimitHit(false);
    };

    const handleSubmit = async () => {
        if (!docRu) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.addRedaction(vndId, {
                docRu,
                docKg,
                docEn,
                description: description.trim() || undefined,
                // В режиме актуализации - решение, зафиксированное на старте цикла. Иначе, если
                // права на согласование без него нет - всегда true, независимо от чекбокса.
                // (Бэк всё равно перепроверяет и переопределяет это сам для открытого цикла
                // актуализации — см. VndService.AddRedactionAsync — это лишь для UX.)
                requiresApproval: isActualization
                    ? effectiveRequiresApproval
                    : (canSkipApproval ? requiresApproval : true),
                attachments,
            });
            onUploaded(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось загрузить редакцию");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            {/* flex-col + max-h-[90vh] (строго меньше высоты экрана) с overflow-y-auto только
                на среднем блоке (контент) — заголовок и кнопки снизу остаются на месте, даже
                если вложений/полей много и контент не помещается. Раньше overflow-y-auto стоял
                на всём модальном окне с max-h-[110vh] — бо́льше высоты экрана, из-за чего при
                большом количестве вложений низ окна (в т.ч. кнопки "Отмена"/"Загрузить")
                уходил за пределы видимой области и не был доступен для прокрутки. */}
            <div
                className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none items-center justify-between px-6 pt-6 pb-5">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">
                        {mode === "actualization"
                            ? "Актуализация ВНД — загрузка новой редакции"
                            : "Загрузка новой редакции"}
                    </h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6">
                    <div
                        className="mb-2 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[11.5px] leading-[1.5] text-[#8b97ab]">
                        Допустимый формат: DOCX. Максимальный
                        размер каждого файла — {formatBytes(MAX_FILE_SIZE)}.
                        {isActualization && (
                            <>
                                {" "}ТИД (Таблицу изменений и дополнений) для этой редакции вы
                                сможете загрузить позже — после её загрузки, отдельным шагом.
                            </>
                        )}
                    </div>
                    <div className="flex flex-col gap-4">
                        <FileSlot label="Русский" required file={docRu} onChange={setDocRu} onError={setError}/>
                        <FileSlot label="Кыргызча" file={docKg} onChange={setDocKg} onError={setError}/>
                        <FileSlot label="English" file={docEn} onChange={setDocEn} onError={setError}/>

                        <div>
                            <div className="mb-[6px] flex flex-col gap-1">
                            <span className="text-[12.5px] font-semibold text-[#26324a]">
                                Вложения <span
                                className="text-[#8b97ab] font-normal">(необязательно, можно несколько)</span>
                            </span>
                                <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                                    Добавлено {attachments.length} из {VND_REDACTION_MAX_ATTACHMENTS} файлов максимум
                                    <HelpTooltip
                                        content={`Количество вложений к редакции ограничено — не более ${VND_REDACTION_MAX_ATTACHMENTS}, каждый файл не больше 50 МБ.`}
                                        side="top"
                                        className="h-5 w-5"
                                    />
                                </span>
                            </div>

                            {attachmentLimitReached ? (
                                <Tooltip
                                    content={`Достигнут максимум — ${VND_REDACTION_MAX_ATTACHMENTS} вложений на редакцию`}
                                    side="top"
                                    className="w-full"
                                >
                                <span
                                    className="flex h-[56px] w-full cursor-not-allowed flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#e5e9f0] bg-[#f6f8fb] text-[#b7bfcc]"
                                >
                                    <span className="flex items-center gap-2 text-[11.5px]">
                                        <Paperclip size={15}/>
                                        Добавить файлы
                                    </span>
                                </span>
                                </Tooltip>
                            ) : (
                                <label
                                    htmlFor="redaction-attachments"
                                    className="flex h-[56px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                >
                                <span className="flex items-center gap-2 text-[11.5px]">
                                    <Paperclip size={15}/>
                                    Добавить файлы
                                </span>
                                    <input
                                        id="redaction-attachments"
                                        type="file"
                                        multiple
                                        accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx"
                                        className="hidden"
                                        onChange={(e) => {
                                            handleAddAttachments(e.target.files);
                                            e.target.value = ""; // сброс, чтобы можно было выбрать тот же файл повторно
                                        }}
                                    />
                                </label>
                            )}

                            {attachmentCountLimitHit && (
                                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                                <span>
                                    Часть выбранных файлов не добавлена — максимум {VND_REDACTION_MAX_ATTACHMENTS} вложений на редакцию.
                                </span>
                                </div>
                            )}

                            {attachments.length > 0 && (
                                <div className="mt-2 flex flex-col gap-[6px]">
                                    {attachments.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-[8px]"
                                        >
                                            <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                                            <span
                                                className="flex-1 truncate text-[12px] text-[#26324a]">{file.name}</span>
                                            <span className="flex-none text-[11px] text-[#a3adbd]">
                                            {formatBytes(file.size)}
                                        </span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
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
                                placeholder="Что изменилось в этой редакции…"
                                rows={3}
                                maxLength={VND_REDACTION_DESCRIPTION_MAX_LENGTH}
                                className="w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                            />
                        </div>

                        {/* В режиме актуализации решение "с согласованием / без" уже зафиксировано при
                        старте цикла - показываем как информацию, менять здесь нельзя */}
                        {isActualization && (
                            <div
                                className="rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[12.5px] text-[#55617a]">
                                Согласование: <span className="font-semibold text-[#26324a]">
                                {effectiveRequiresApproval ? "требуется" : "не требуется"}
                            </span> — определено при старте актуализации
                            </div>
                        )}

                        {/* Чекбокс показываем только тем, у кого есть права на публикацию редакции без согласования */}
                        {canSkipApproval && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setRequiresApproval((v) => !v)}
                                    className="inline-flex items-center gap-2  rounded-[9px]  bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer select-none w-fit"
                                >
                                <span
                                    className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                                    style={{
                                        borderColor: requiresApproval ? "#4e57d6" : "#cbd3df",
                                        background: requiresApproval ? "#4e57d6" : "white",
                                    }}
                                >
                                    <Check
                                        className="w-[13px] h-[13px] text-white"
                                        strokeWidth={3}
                                        style={{opacity: requiresApproval ? 1 : 0}}
                                    />
                                </span>
                                    Требуется согласование
                                </button>

                                <Clue>
                                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                                    <span>
                                        Вы можете загрузить редакцию без согласования — это право Вам дают
                                        {grantingRoleNames.length === 1 ? " роль:" : " роли:"}
                                    </span>
                                    {grantingRoleNames.map((name) => (
                                        <span
                                            key={name}
                                            className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#ececfc] text-[11.5px] font-semibold text-[#4e57d6] whitespace-nowrap"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </span>
                                </Clue>
                            </>
                        )}

                        {error && (
                            <div
                                className="rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="pb-6"/>
                </div>

                <div className="flex flex-none justify-end gap-2 border-t border-[#eef0f5] px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={15} className="animate-spin"/>}
                        Загрузить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}