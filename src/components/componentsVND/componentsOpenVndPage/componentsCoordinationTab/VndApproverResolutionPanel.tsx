import {useRef, useState} from "react";
import {Check, MessageSquare, Paperclip, X, AlertCircle} from "lucide-react";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {
    MAX_RESOLUTION_ATTACHMENTS,
    MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES,
    MAX_RESOLUTION_COMMENT_LENGTH,
} from "@/constants/coordinationParams.ts";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";

export type ResolutionChoice = "approve" | "approveWithComment" | "reject";
export type ResolutionPhase = "primary" | "repeated" | "finalHold";

interface VndApproverResolutionPanelProps {
    onSubmit: (choice: ResolutionChoice, comment: string, files: File[]) => Promise<void> | void;
    submitting?: boolean;
    error?: string | null;
    phase?: ResolutionPhase;
}

interface OptionConfig {
    id: ResolutionChoice;
    title: string;
    subtitle: string;
}

// approve и approveWithComment — зелёная тема (оба позитивные исходы), reject — красная
const CHOICE_THEME: Record<ResolutionChoice, {
    border: string; bg: string; dot: string; buttonBg: string; buttonHover: string; icon: typeof Check;
}> = {
    approve: {
        border: "border-[#7fd4a3]", bg: "bg-[#eef9f2]", dot: "bg-[#2f9e5c]",
        buttonBg: "bg-[#1f7a4c]", buttonHover: "hover:bg-[#1a6b42]", icon: Check,
    },
    approveWithComment: {
        border: "border-[#7fd4a3]", bg: "bg-[#eef9f2]", dot: "bg-[#2f9e5c]",
        buttonBg: "bg-[#1f7a4c]", buttonHover: "hover:bg-[#1a6b42]", icon: MessageSquare,
    },
    reject: {
        border: "border-[#e8a6a6]", bg: "bg-[#fdf1f1]", dot: "bg-[#c0392b]",
        buttonBg: "bg-[#c0392b]", buttonHover: "hover:bg-[#a53023]", icon: X,
    },
};

const DEFAULT_OPTIONS: OptionConfig[] = [
    {
        id: "approve",
        title: "Согласовать",
        subtitle: "Выбирая данный вариант Вы подтверждаете согласование данной редакции.",
    },
    {
        id: "approveWithComment",
        title: "Согласовать с замечаниями",
        subtitle: "Текст замечания/комментариев является обязательным.",
    },
    {
        id: "reject",
        title: "Отклонить",
        subtitle: "Причина отклонения данной редакции ВНД является обязательной для указания. В случае выбора этого варианта - ВНД с данной редакцией вернется инициатору, он должен будет создать новую редакцию и заново её согласовывать. ",
    },
];

// На финальной выдержке замечание/отклонение НЕ создают новую редакцию — инициатор дорабатывает
// ту же самую и отправляет заново, минуя финальную выдержку, сразу на повторное согласование
// (т.к. финальная выдержка идёт только после круга с замечаниями)
const FINAL_HOLD_OPTIONS: OptionConfig[] = [
    {
        id: "approve",
        title: "Согласовать",
        subtitle: "Замечаний нет. Этот шаг необязателен — если ничего не сделать, документ пройдёт дальше сам.",
    },
    {
        id: "approveWithComment",
        title: "Согласовать с замечаниями",
        subtitle: "Текст замечания/комментариев является обязательным. Документ вернётся инициатору на доработку — той же редакции, без создания новой — и после исправлений снова придёт вам на повторное согласование.",
    },
    {
        id: "reject",
        title: "Отклонить",
        subtitle: "Причина отклонения является обязательной. Документ вернётся инициатору на доработку той же редакции и после исправлений снова придёт на повторное согласование.",
    },
];

const OPTIONS_BY_PHASE: Record<ResolutionPhase, OptionConfig[]> = {
    primary: DEFAULT_OPTIONS,
    repeated: DEFAULT_OPTIONS,
    finalHold: FINAL_HOLD_OPTIONS,
};

const SUBMIT_LABEL: Record<ResolutionChoice, string> = {
    approve: "Согласовать и подписать (ЭП)",
    approveWithComment: "Согласовать с замечаниями (ЭП)",
    reject: "Отклонить редакцию (ЭП)",
};

const COMMENT_PLACEHOLDER: Record<ResolutionChoice, string> = {
    approve: "Комментарий…",
    approveWithComment: "Комментарий / текст замечаний…",
    reject: "Причина отклонения…",
};

export function VndApproverResolutionPanel({
                                               onSubmit,
                                               submitting,
                                               error,
                                               phase = "primary",
                                           }: VndApproverResolutionPanelProps) {
    const [choice, setChoice] = useState<ResolutionChoice>("approve");
    const [comment, setComment] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [attachmentCountLimitHit, setAttachmentCountLimitHit] = useState(false);
    const [oversizedFileNames, setOversizedFileNames] = useState<string[]>([]);
    const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
    // Пересоздаём сам <input type="file"> после каждого выбора (через key), а не просто
    // чистим его .value — второй способ на части машин (Windows, некоторые сборки Chrome/Edge)
    // не всегда даёт браузеру повторно открыть диалог или корректно прочитать новый выбор
    // подряд без промежуточного клика в другое место страницы. Полная пересборка input'а
    // гарантированно снимает это состояние.
    const [fileInputKey, setFileInputKey] = useState(0);

    const options = OPTIONS_BY_PHASE[phase];
    const theme = CHOICE_THEME[choice];
    const SubmitIcon = theme.icon;

    const commentRequired = choice !== "approve";
    const commentMissing = commentRequired && comment.trim().length === 0;
    const canSubmit = !commentMissing;

    const attachmentSlotsLeft = MAX_RESOLUTION_ATTACHMENTS - files.length;
    const attachmentLimitReached = attachmentSlotsLeft <= 0;

    const handleFilesPicked = (picked: FileList | null) => {
        if (picked && picked.length > 0) {
            const incoming = Array.from(picked);
            // Лимит по размеру — на КАЖДЫЙ файл отдельно (а не суммарно на все вложения):
            // слишком большой файл не добавляем вообще, остальные (в пределах свободных
            // слотов по количеству) добавляются как обычно.
            const withinSizeLimit = incoming.filter((f) => f.size <= MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES);
            const oversized = incoming.filter((f) => f.size > MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES);
            const accepted = withinSizeLimit.slice(0, Math.max(0, attachmentSlotsLeft));

            setFiles((prev) => [...prev, ...accepted]);
            // Не влезло из-за лимита по количеству (файлы подходящего размера, для которых
            // просто не хватило свободных слотов).
            setAttachmentCountLimitHit(accepted.length < withinSizeLimit.length);
            // Отдельно показываем, какие именно файлы отклонены как слишком большие.
            setOversizedFileNames(oversized.map((f) => f.name));
        }
        // См. комментарий у fileInputKey — пересобираем input, а не чистим .value.
        setFileInputKey((k) => k + 1);
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setAttachmentCountLimitHit(false);
    };

    // Синхронная защита от повторной отправки. Одного React-стейта `submitting` (которым
    // мы дизейблим кнопку) недостаточно: он обновляется у родителя асинхронно, и если
    // пользователь успевает кликнуть (или дважды сработать клик) до перерисовки — оба
    // клика проходят проверку `!submitting`, и на сервер улетает два запроса подряд.
    // Первый решает этап успешно, второй получает 409 "уже принято", и пользователь видит
    // ошибку, хотя резолюция на самом деле уже сохранилась. Ref обновляется мгновенно,
    // без ожидания рендера, поэтому второй клик блокируется гарантированно.
    const submitLockRef = useRef(false);

    const doSubmit = async () => {
        if (submitLockRef.current) return;
        submitLockRef.current = true;
        try {
            await onSubmit(choice, comment.trim(), files);
        } finally {
            submitLockRef.current = false;
        }
    };

    const handleSubmit = () => {
        if (!canSubmit || submitting || submitLockRef.current) return;
        if (choice === "reject") {
            setRejectConfirmOpen(true);
            return;
        }
        void doSubmit();
    };

    const handleConfirmReject = () => {
        setRejectConfirmOpen(false);
        void doSubmit();
    };

    return (
        <div className="rounded-[16px] border border-[#e9edf3] bg-white p-5">
            <div className="text-[15px] font-bold text-[#1c2740]">Ваша резолюция</div>
            {/*     <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                Резолюция фиксируется ЕСИА с отметкой времени и хешем версии.
            </div>*/}

            <div className="mt-4 flex flex-col gap-2.5">
                {options.map((opt) => {
                    const selected = choice === opt.id;
                    const optTheme = CHOICE_THEME[opt.id];
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setChoice(opt.id)}
                            className={`cursor-pointer flex items-start gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors ${
                                selected
                                    ? `${optTheme.border} ${optTheme.bg}`
                                    : "border-[#e9edf3] bg-white hover:border-[#d7dee8]"
                            }`}
                        >
                            <span
                                className={`mt-[3px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-2 ${
                                    selected ? optTheme.border : "border-[#c7cede]"
                                }`}
                            >
                                {selected && <span className={`h-[8px] w-[8px] rounded-full ${optTheme.dot}`}/>}
                            </span>
                            <span>
                                <div className="text-[13.5px] font-semibold text-[#1c2740]">{opt.title}</div>
                                <div className="text-[12px] text-[#8b97ab]">{opt.subtitle}</div>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#1c2740]">
                    Комментарий{commentRequired
                        ? <span className="text-[#d62815]"> *</span>
                        : <span className="font-normal text-[#8b97ab]"> (необязательно)</span>}
                </span>
                <CharCounter length={comment.length} max={MAX_RESOLUTION_COMMENT_LENGTH}/>
            </div>

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_RESOLUTION_COMMENT_LENGTH))}
                placeholder={COMMENT_PLACEHOLDER[choice]}
                maxLength={MAX_RESOLUTION_COMMENT_LENGTH}
                rows={3}
                className={`mt-1.5 w-full resize-none rounded-[10px] border bg-[#fbfcfe] px-3.5 py-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] ${
                    commentMissing ? "border-[#e8b4b4]" : "border-[#e9edf3]"
                }`}
            />

            <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                        Добавлено {files.length} из {MAX_RESOLUTION_ATTACHMENTS} файлов максимум
                        <HelpTooltip
                            content={`Количество файлов, прикладываемых к резолюции, ограничено — не более ${MAX_RESOLUTION_ATTACHMENTS}, и каждый файл не больше ${formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)}. Вложения хранятся, пока идёт согласование, и удаляются, как только редакция становится согласованной (текст комментария остаётся).`}
                            side="bottom"
                            className="h-5 w-5"
                        />
                    </span>

                    {/* Label вместо button+ref.click(): активация файлового диалога через нативную
                        связку <label>/<input> надёжнее программного .click() — не зависит от того,
                        сохраняется ли между кликами "доверенность" пользовательского жеста, и не
                        ломается на повторных открытиях диалога подряд. key у input пересобирает
                        его после каждого выбора (см. fileInputKey выше). */}
                    {attachmentLimitReached ? (
                        <Tooltip
                            content={`Достигнут максимум — ${MAX_RESOLUTION_ATTACHMENTS} файлов на резолюцию`}
                            side="top"
                        >
                            <span
                                className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-[8px] border border-[#e9edf3] bg-[#f6f8fb] px-3 py-[7px] text-[12.5px] font-semibold text-[#b7bfcc]"
                            >
                                <Paperclip size={14}/>
                                Прикрепить файл
                            </span>
                        </Tooltip>
                    ) : (
                        <label
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] border border-[#d7dee8] bg-white px-3 py-[7px] text-[12.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                        >
                            <input
                                key={fileInputKey}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFilesPicked(e.target.files)}
                            />
                            <Paperclip size={14}/>
                            Прикрепить файл
                        </label>
                    )}
                </div>

                {attachmentCountLimitHit && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>
                            Часть выбранных файлов не добавлена — максимум {MAX_RESOLUTION_ATTACHMENTS} файлов на резолюцию.
                        </span>
                    </div>
                )}

                {oversizedFileNames.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>
                            Не добавлен{oversizedFileNames.length > 1 ? "ы" : ""} «{oversizedFileNames.join("», «")}»
                            {" "}— размер файла не должен превышать {formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)}.
                        </span>
                    </div>
                )}

                {files.length > 0 && (
                    <div className="mt-3 rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-3">
                        <div className="mb-2 text-[11.5px] font-semibold text-[#8b97ab]">
                            Ваши прикреплённые файлы:
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-2 rounded-[8px] border border-[#e9edf3] bg-white px-3 py-[7px] text-[12px] text-[#3a4560]"
                                >
                                    <Paperclip size={13} className="flex-none text-[#8b97ab]"/>
                                    <Tooltip content={file.name} side="top" className="min-w-0 flex-1">
                                        <span className="block truncate">{file.name}</span>
                                    </Tooltip>
                                    <span className="flex-none text-[#8b97ab]">{formatFileSize(file.size)}</span>
                                    <Tooltip content="Удалить файл" side="top">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                        >
                                            <X size={13}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-3 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3.5 py-2 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={`cursor-pointer mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-[13.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${theme.buttonBg} ${theme.buttonHover}`}
            >
                <SubmitIcon className="h-4 w-4" strokeWidth={2.5}/>
                {submitting ? "Отправка…" : SUBMIT_LABEL[choice]}
            </button>

            {commentMissing && (
                <div className="mt-3 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                    <span>
                        Поле "{choice === "reject" ? "Причина отклонения" : "Комментарий / текст замечаний"}" является обязательным при данном выборе
                    </span>
                </div>
            )}

            <ConfirmActionModal
                open={rejectConfirmOpen}
                onClose={() => setRejectConfirmOpen(false)}
                onConfirm={handleConfirmReject}
                title="Отклонить редакцию?"
                message="ВНД вернётся инициатору — потребуется создать новую редакцию и заново пройти согласование."
                confirmLabel="Отклонить"
                loadingLabel="Отклоняю…"
                loading={submitting}
                variant="danger"
                icon={X}
            />
        </div>
    );
}