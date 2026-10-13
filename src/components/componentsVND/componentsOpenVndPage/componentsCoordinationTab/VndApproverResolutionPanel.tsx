import {useTranslation} from "react-i18next";
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import {Check, MessageSquare, Paperclip, Quote, X, AlertCircle, Search, Trash2, TextQuote} from "lucide-react";
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
import type {ApprovalQuoteItem} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import type {QuoteAnchorContext} from "@/utils/docxWork/quoteAnchor.ts";
import {
    formatQuoteLine, QUOTE_NOTE_PREFIX, quoteDisplayText, quoteMatchText,
} from "@/utils/vndProcess/quoteText.ts";
import {EcpSignModal} from "@/components/signing/EcpSignModal.tsx";
import {useEcpApproval} from "@/hooks/useEcpApproval.ts";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {ecpCredentialService} from "@/service/ecpCredentialService.ts";
import {ApprovalDecisionType} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {formatEcpCountdown} from "@/utils/formatEcpDuration.ts";

export type ResolutionChoice = "approve" | "approveWithComment" | "reject";

import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";

/** Данные ЭЦП, приложенные к резолюции "Согласовать" — см. useEcpApproval/EcpSignModal.
 * Реэкспорт: VndCoordinationTab.tsx импортирует этот тип отсюда, а не из useEcpApproval.ts. */
export type {ResolutionEcpSignature};

/** Обратный отсчёт до истечения ЭЦП-сессии (статичный токен ГП «Инфоком») — опциональная
 * подсказка, пока действует сессия можно "Согласовать" ещё раз без повторного пин-кода. */
function EcpSessionCountdown({expireAt}: { expireAt: string }) {
    const {t} = useTranslation();
    const [msLeft, setMsLeft] = useState(() => new Date(expireAt).getTime() - Date.now());

    useEffect(() => {
        const tick = () => setMsLeft(new Date(expireAt).getTime() - Date.now());
        tick();
        // Статичный токен может жить месяцами — тикать раз в секунду всё это время незачем:
        // ниже часа секунды видны в бейдже (mm:ss), дальше формат укрупняется (formatEcpCountdown),
        // поэтому раз в минуту достаточно, чтобы бейдж не "застывал" надолго.
        const remaining = new Date(expireAt).getTime() - Date.now();
        const intervalMs = remaining < 3600_000 ? 1000 : 60_000;
        const id = setInterval(tick, intervalMs);
        return () => clearInterval(id);
    }, [expireAt]);

    if (msLeft <= 0) return null;

    return (
        <span className="rounded-full border border-[#cfe3d6] bg-[#f2f9f5] px-2.5 py-1 text-[11px] font-medium text-[#1c7a4d]">
            {t("resolutionPanel.ecpCountdown", {time: formatEcpCountdown(msLeft)})}
        </span>
    );
}
export type ResolutionPhase = "primary" | "repeated" | "finalHold";

/** Одно замечание к фрагменту текста редакции - карточка в блоке "Замечания к тексту".
 * Хранится отдельно от общего комментария (раньше цитата вставлялась прямо в текст комментария
 * строкой "Цитата: «...»", и связь "цитата ↔ маркер в тексте" держалась на том, что эту строку
 * никто не правил руками - любая правка молча отвязывала цитату). Итоговый текст резолюции
 * собирается из общего комментария и карточек только в момент отправки (см. composeResolutionComment). */
export interface DraftTextRemark {
    /** Отрицательный локальный id - не пересекается с id сохранённых цитат (они > 0), поэтому
     * черновик можно подсвечивать в тексте документа вместе с чужими цитатами. */
    id: number;
    documentTarget: RedactionViewTarget;
    /** Текст для поиска в документе (без многоточия, см. quoteMatchText). */
    text: string;
    /** Текст для отображения в резолюции (обрезанный с многоточием, см. quoteDisplayText). */
    displayText: string;
    prefix: string | null;
    suffix: string | null;
    occurrence: number | null;
    /** Замечание к этому фрагменту - необязательно. */
    note: string;
}

interface VndApproverResolutionPanelProps {
    /** Нужны для получения ЭЦП-хэша резолюции (см. useEcpApproval) — хэш того, что реально
     * подписывается (текст резолюции + содержимое редакции + код ВНД), считается на backend,
     * клиент присылает только текст (см. VndApprovalController.ResolutionHash/Decide). */
    vndId: number;
    stageId: number;
    /** Возвращает true, если резолюция успешно отправлена (тогда черновик в браузере стирается);
     * "resign" — подпись не подошла к текущему состоянию документа/комментария (нужно подписать
     * заново), "reauth" — подпись чужая (нужно сбросить ЭЦП-сессию и ввести ПИН заново). */
    onSubmit: (
        choice: ResolutionChoice, comment: string, files: File[], quotes: ApprovalQuoteItem[],
        ecpSignature?: ResolutionEcpSignature,
        /** ТЕСТ: "Согласовать" без ЭЦП (только локальные учётные записи, backend перепроверяет). */
        withoutEcp?: boolean,
    ) => Promise<boolean | "resign" | "reauth" | void> | boolean | void;
    submitting?: boolean;
    error?: string | null;
    phase?: ResolutionPhase;
    /** Открыть просмотр проверяемой редакции в режиме "сослаться на текст" (см. insertQuote
     * у VndApproverResolutionPanelHandle). Кнопка "Добавить замечание к тексту" рисуется только
     * если передан этот проп - вызывающая сторона должна знать, какую редакцию открывать. */
    onCiteRequest?: () => void;
    /** Открыть просмотр редакции с прокруткой к фрагменту одного из черновых замечаний
     * ("Показать в тексте" на карточке) - см. RedactionViewModal.initialFocusQuoteId. */
    onJumpToQuote?: (remark: DraftTextRemark) => void;
    /** Сообщает наверх актуальный список черновых замечаний - чтобы окно просмотра редакции
     * подсвечивало их в тексте (RedactionViewModal.draftQuotes). */
    onDraftRemarksChange?: (remarks: DraftTextRemark[]) => void;
    /** Ключ для автосохранения черновика резолюции в браузере (localStorage) - должен
     * однозначно определять процесс/этап/фазу/версию документа (см. VndCoordinationTab). Без него
     * черновик не сохраняется. */
    draftStorageKey?: string;
}

export interface VndApproverResolutionPanelHandle {
    /** Добавляет замечание к выделенному в редакции фрагменту (см.
     * RedactionViewModal.onInsertQuote) - новой карточкой в блоке "Замечания к тексту", с фокусом
     * на поле замечания. anchor - "якорь" фрагмента (см. utils/docxWork/quoteAnchor.ts). */
    insertQuote: (
        selectedText: string, documentTarget: RedactionViewTarget, anchor: QuoteAnchorContext | null,
    ) => void;
}

// Строка, начинающаяся с "Цитата: «", при отображении резолюции считается цитатой и
// сопоставляется со списком сохранённых цитат ПО ПОРЯДКУ (см. FormattedResolutionComment). Если
// пользователь сам напечатает такую строку в комментарии/замечании, порядок собьётся - поэтому в
// свободном тексте этот префикс слегка меняем.
function neutralizeQuoteMarkers(text: string): string {
    return text.replace(/^(\s*)Цитата: «/gm, "$1Цитата «");
}

/** Итоговый текст резолюции: общий комментарий, затем по каждой карточке строка
 * "Цитата: «...»" и (если есть) строка "Замечание: ...". Формат строк цитат прежний, поэтому
 * история, лист согласования, уведомления и уже отправленные резолюции отображаются как раньше. */
function composeResolutionComment(comment: string, remarks: DraftTextRemark[]): string {
    const blocks: string[] = [];
    const general = neutralizeQuoteMarkers(comment.trim());
    if (general) blocks.push(general);
    for (const r of remarks) {
        const lines = [formatQuoteLine(r.displayText)];
        const note = neutralizeQuoteMarkers(r.note.trim());
        if (note) lines.push(`${QUOTE_NOTE_PREFIX}${note}`);
        blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n");
}

interface StoredDraft {
    choice: ResolutionChoice;
    comment: string;
    remarks: DraftTextRemark[];
    savedAt: number;
}

// Черновик старше этого срока не восстанавливаем - скорее всего он уже неактуален.
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function loadDraft(key: string | undefined): StoredDraft | null {
    if (!key) return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredDraft;
        if (!parsed || !Array.isArray(parsed.remarks) || typeof parsed.comment !== "string") return null;
        if (Date.now() - (parsed.savedAt ?? 0) > DRAFT_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveDraft(key: string | undefined, draft: StoredDraft | null) {
    if (!key) return;
    try {
        if (!draft) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(draft));
    } catch {
        // Приватный режим/переполненное хранилище - черновик просто не сохранится.
    }
}

let draftIdSeq = 0;
function nextDraftId(): number {
    draftIdSeq = (draftIdSeq + 1) % 1000;
    return -(Date.now() * 1000 + draftIdSeq);
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

// Мягкая цветная тень под кнопками решений (в цвет самой кнопки)
const DECISION_BUTTON_SHADOW: Record<ResolutionChoice, string> = {
    approve: "shadow-[0_8px_16px_-8px_rgba(31,122,76,.7)] hover:shadow-[0_10px_20px_-8px_rgba(31,122,76,.8)]",
    approveWithComment: "shadow-[0_8px_16px_-8px_rgba(31,122,76,.7)] hover:shadow-[0_10px_20px_-8px_rgba(31,122,76,.8)]",
    reject: "shadow-[0_8px_16px_-8px_rgba(192,57,43,.7)] hover:shadow-[0_10px_20px_-8px_rgba(192,57,43,.8)]",
};

// Цвет вертикальной черты у пояснения - в тон кнопки
const HINT_ACCENT: Record<ResolutionChoice, string> = {
    approve: "border-[#7fd4a3]",
    approveWithComment: "border-[#7fd4a3]",
    reject: "border-[#e8a6a6]",
};

const ACTIONS: ResolutionChoice[] = ["approve", "approveWithComment", "reject"];

const TEST_ACTION_STYLE: Record<ResolutionChoice, string> = {
    approve: "border-[#9fd3b4] text-[#1f7a45] hover:bg-[#f1faf4]",
    approveWithComment: "border-[#9fd3b4] text-[#1f7a45] hover:bg-[#f1faf4]",
    reject: "border-[#e8a6a6] text-[#c0392b] hover:bg-[#fdf1f1]",
};

const CHOICE_TO_DECISION: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};

export const VndApproverResolutionPanel = forwardRef<
    VndApproverResolutionPanelHandle, VndApproverResolutionPanelProps
>(function VndApproverResolutionPanel({
                                          vndId,
                                          stageId,
                                          onSubmit,
                                          submitting,
                                          error,
                                          phase = "primary",
                                          onCiteRequest,
                                          onJumpToQuote,
                                          onDraftRemarksChange,
                                          draftStorageKey,
                                      }, ref) {
    // Черновик, сохранённый в браузере (см. draftStorageKey) - читаем один раз при монтировании:
    // случайно закрытая вкладка/перезагрузка страницы/переход на другую вкладку ВНД больше не
    // уничтожают набранную резолюцию и замечания к тексту.
    const [restoredDraft] = useState(() => loadDraft(draftStorageKey));
    const [choice, setChoice] = useState<ResolutionChoice>(restoredDraft?.choice ?? "approve");
    const [comment, setComment] = useState(restoredDraft?.comment ?? "");
    const [remarks, setRemarks] = useState<DraftTextRemark[]>(restoredDraft?.remarks ?? []);
    const [draftRestoredNoticeVisible, setDraftRestoredNoticeVisible] = useState(
        !!restoredDraft && (restoredDraft.comment.trim().length > 0 || restoredDraft.remarks.length > 0),
    );
    const [files, setFiles] = useState<File[]>([]);
    const [attachmentCountLimitHit, setAttachmentCountLimitHit] = useState(false);
    const [oversizedFileNames, setOversizedFileNames] = useState<string[]>([]);
    // "Отклонить" ждёт подтверждения; withEcp - какой кнопкой (с ЭЦП или тестовой) нажато.
    const [pendingReject, setPendingReject] = useState<{withEcp: boolean} | null>(null);
    // Последняя нажатая кнопка решения - на ней показываем "Отправка…".
    const [lastAction, setLastAction] = useState<{choice: ResolutionChoice; withEcp: boolean} | null>(null);
    // Пересоздаём сам <input type="file"> после каждого выбора (через key), а не просто
    // чистим его .value — второй способ на части машин (Windows, некоторые сборки Chrome/Edge)
    // не всегда даёт браузеру повторно открыть диалог или корректно прочитать новый выбор
    // подряд без промежуточного клика в другое место страницы. Полная пересборка input'а
    // гарантированно снимает это состояние.
    const [fileInputKey, setFileInputKey] = useState(0);

    // Поля "Замечание" карточек - чтобы поставить фокус в только что добавленную карточку.
    const noteRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
    const [pendingFocusRemarkId, setPendingFocusRemarkId] = useState<number | null>(null);
    // Карточка, которую только что добавили (или попытались добавить повторно) - коротко
    // подсвечиваем, чтобы было видно, куда попало замечание.
    const [flashRemarkId, setFlashRemarkId] = useState<number | null>(null);

    useEffect(() => {
        if (pendingFocusRemarkId === null) return;
        const el = noteRefs.current.get(pendingFocusRemarkId);
        if (el) {
            el.scrollIntoView({block: "center", behavior: "smooth"});
            el.focus({preventScroll: true});
        }
        setPendingFocusRemarkId(null);
    }, [pendingFocusRemarkId, remarks]);

    useEffect(() => {
        if (flashRemarkId === null) return;
        const timer = setTimeout(() => setFlashRemarkId(null), 1600);
        return () => clearTimeout(timer);
    }, [flashRemarkId]);

    // Черновые замечания - наверх, для подсветки в окне просмотра редакции.
    const onDraftRemarksChangeRef = useRef(onDraftRemarksChange);
    onDraftRemarksChangeRef.current = onDraftRemarksChange;
    useEffect(() => {
        onDraftRemarksChangeRef.current?.(remarks);
    }, [remarks]);

    // Автосохранение черновика (с небольшой задержкой, чтобы не писать в хранилище на каждый символ).
    useEffect(() => {
        const timer = setTimeout(() => {
            const empty = comment.trim().length === 0 && remarks.length === 0 && choice === "approve";
            saveDraft(draftStorageKey, empty ? null : {choice, comment, remarks, savedAt: Date.now()});
        }, 400);
        return () => clearTimeout(timer);
    }, [choice, comment, remarks, draftStorageKey]);

    const {t} = useTranslation();

    const composedComment = useMemo(() => composeResolutionComment(comment, remarks), [comment, remarks]);
    const composedTooLong = composedComment.length > MAX_RESOLUTION_COMMENT_LENGTH;
    const hasRemarkNotes = remarks.some((r) => r.note.trim().length > 0);

    // Для "с замечаниями"/"отклонить" нужен хоть какой-то текст: общий комментарий ИЛИ замечание
    // хотя бы к одному фрагменту (одна только ссылка на фрагмент без пояснения замечанием не считается).
    const commentRequired = choice !== "approve";
    const commentMissing = commentRequired && comment.trim().length === 0 && !hasRemarkNotes;

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

    // Новое замечание к выделенному фрагменту (см. RedactionViewModal.onInsertQuote). Если ровно
    // этот фрагмент (та же вкладка, тот же текст, то же вхождение) уже есть в списке - не
    // дублируем, а переводим фокус на существующую карточку.
    const insertQuote = (
        selectedText: string, documentTarget: RedactionViewTarget, anchor: QuoteAnchorContext | null,
    ) => {
        const text = quoteMatchText(selectedText);
        if (!text) return;

        const existing = remarks.find((r) =>
            r.documentTarget === documentTarget && r.text === text
            && (r.occurrence ?? null) === (anchor?.occurrence ?? null));
        if (existing) {
            setPendingFocusRemarkId(existing.id);
            setFlashRemarkId(existing.id);
            return;
        }

        const remark: DraftTextRemark = {
            id: nextDraftId(),
            documentTarget,
            text,
            displayText: quoteDisplayText(selectedText),
            prefix: anchor?.prefix ?? null,
            suffix: anchor?.suffix ?? null,
            occurrence: anchor?.occurrence ?? null,
            note: "",
        };
        setRemarks((prev) => [...prev, remark]);
        setPendingFocusRemarkId(remark.id);
        setFlashRemarkId(remark.id);
        // Добавление замечания к тексту почти всегда означает "есть замечания" - если пользователь
        // ещё не выбрал вариант, подсказываем подходящий (он может поменять его обратно).
        if (choice === "approve") setChoice("approveWithComment");
    };

    useImperativeHandle(ref, () => ({insertQuote}), [remarks, choice]);

    const updateRemarkNote = (id: number, note: string) =>
        setRemarks((prev) => prev.map((r) => (r.id === id ? {...r, note} : r)));

    const handleRemoveRemark = (id: number) => {
        setRemarks((prev) => prev.filter((r) => r.id !== id));
        noteRefs.current.delete(id);
    };

    // Синхронная защита от повторной отправки. Одного React-стейта `submitting` (которым
    // мы дизейблим кнопку) недостаточно: он обновляется у родителя асинхронно, и если
    // пользователь успевает кликнуть (или дважды сработать клик) до перерисовки — оба
    // клика проходят проверку `!submitting`, и на сервер улетает два запроса подряд.
    // Первый решает этап успешно, второй получает 409 "уже принято", и пользователь видит
    // ошибку, хотя резолюция на самом деле уже сохранилась. Ref обновляется мгновенно,
    // без ожидания рендера, поэтому второй клик блокируется гарантированно.
    const submitLockRef = useRef(false);

    // Любое решение согласующего ("Согласовать", "с замечаниями", "Отклонить") подписывается ЭЦП
    // ГП «Инфоком» (документация провайдера: ЭП нельзя использовать как первый фактор входа, только
    // как второй/третий при уже выполненном действии - здесь это действие). Решение входит в хэш.
    //
    // Токен статичный (см. EcpSessionContext): пока он не истёк, useEcpApproval подписывает
    // тихо, без EcpSignModal - полный флоу (методы → пин → токен) открывается только когда
    // действующей сессии ещё нет или она истекла.
    const ecp = useEcpApproval();
    const {session: ecpSession, isValid: ecpSessionValid} = useEcpSession();
    // Backend отклонил подпись при сохранении: документ/комментарий изменились после подписания
    // (или подпись устарела) — предлагаем подписать заново; подпись чужая — заново с вводом ПИН.
    const [resignNeeded, setResignNeeded] = useState<"resign" | "reauth" | null>(null);

    // ТЕСТ: кнопки решений без ЭЦП - всем пользователям, пока на сервере включён тестовый режим
    // (EcpSigning:AllowWithoutEcp). Сервер проверяет это сам и без режима отклонит решение без подписи.
    const [testMode, setTestMode] = useState(false);
    useEffect(() => {
        let cancelled = false;
        ecpCredentialService.testMode()
            .then((r) => { if (!cancelled) setTestMode(r.allowWithoutEcp); })
            .catch(() => { /* нет ответа - тестовых кнопок просто не будет */ });
        return () => { cancelled = true; };
    }, []);

    const doSubmit = async (decisionChoice: ResolutionChoice, ecpSignature?: ResolutionEcpSignature, withoutEcp?: boolean) => {
        if (submitLockRef.current) return;
        submitLockRef.current = true;
        try {
            const quotesToSend: ApprovalQuoteItem[] = remarks.map((r) => ({
                documentTarget: r.documentTarget,
                text: r.text,
                prefix: r.prefix,
                suffix: r.suffix,
                occurrence: r.occurrence,
                note: r.note.trim() || null,
            }));
            const ok = await onSubmit(decisionChoice, composedComment, files, quotesToSend, ecpSignature, withoutEcp);
            // Черновик стираем только после успешной отправки - при ошибке он нужен, чтобы
            // пользователь ничего не потерял.
            if (ok === true) saveDraft(draftStorageKey, null);
            if (ok === "reauth") ecp.resetSession();
            setResignNeeded(ok === "resign" || ok === "reauth" ? ok : null);
        } finally {
            submitLockRef.current = false;
        }
    };

    // Кнопка решения: c - решение, withEcp - с подписью (левая колонка) или тестовое без ЭЦП (правая).
    // Для "с замечаниями"/"отклонить" нужен текст - без него показываем подсказку (commentMissing по
    // выбранному решению), запрос не отправляем. "Отклонить" - через подтверждение.
    const busy = submitting || ecp.quietSigning || ecp.modalOpen;
    const missingFor = (c: ResolutionChoice) => c !== "approve" && comment.trim().length === 0 && !hasRemarkNotes;

    const runDecision = (c: ResolutionChoice, withEcp: boolean) => {
        setLastAction({choice: c, withEcp});
        if (!withEcp) {
            void doSubmit(c, undefined, true);
            return;
        }
        // requestSignature сама решает: подписать сохранённой идентификацией / действующей сессией
        // тихо или открыть EcpSignModal. Решение входит в подписываемый хэш (он считается на backend,
        // тот же хэш backend перепроверит при сохранении резолюции). Отмена в модалке отклоняет
        // промис - резолюция не отправляется.
        ecp.requestSignature(vndId, stageId, composedComment, CHOICE_TO_DECISION[c])
            .then((signature) => doSubmit(c, signature))
            .catch(() => {});
    };

    const handleAction = (c: ResolutionChoice, withEcp: boolean) => {
        if (busy || submitLockRef.current) return;
        setChoice(c);
        setResignNeeded(null);
        if (missingFor(c) || composedTooLong) return;
        if (c === "reject") {
            setPendingReject({withEcp});
            return;
        }
        runDecision(c, withEcp);
    };

    const handleConfirmReject = () => {
        const pending = pendingReject;
        setPendingReject(null);
        if (pending) runDecision("reject", pending.withEcp);
    };

    const handleDiscardDraft = () => {
        setComment("");
        setRemarks([]);
        setChoice("approve");
        setDraftRestoredNoticeVisible(false);
        saveDraft(draftStorageKey, null);
    };

    return (
        <div className="rounded-[16px] border border-[#e9edf3] bg-white p-5">
            <div className="flex items-center justify-between gap-2">
                <div className="text-[15px] font-bold text-[#1c2740]">{t("resolutionPanel.title")}</div>
                {ecpSession && ecpSessionValid() && <EcpSessionCountdown expireAt={ecpSession.expireAt}/>}
            </div>

            {draftRestoredNoticeVisible && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#d4d6f8] bg-[#f5f6fd] px-3.5 py-2 text-[12px] text-[#3c424a]">
                    <span>
                        {t("resolutionPanel.draftRestored")}
                    </span>
                    <span className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setDraftRestoredNoticeVisible(false)}
                            className="cursor-pointer font-semibold text-[#4e57d6] hover:text-[#3f47bd]"
                        >
                            {t("resolutionPanel.draftContinue")}
                        </button>
                        <button
                            type="button"
                            onClick={handleDiscardDraft}
                            className="cursor-pointer font-semibold text-[#8b97ab] hover:text-[#c0392b]"
                        >
                            {t("resolutionPanel.draftDiscard")}
                        </button>
                    </span>
                </div>
            )}

            {/* --- Замечания к тексту --- */}
            {(onCiteRequest || remarks.length > 0) && (
                <div className="mt-4 rounded-[12px] border border-[#e9edf3] bg-[#fbfcfe] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[#1c2740]">
                            <TextQuote size={14} className="text-[#4e57d6]"/>
                            {t("resolutionPanel.remarksTitle")}{remarks.length > 0 ? ` (${remarks.length})` : ""}
                            <HelpTooltip
                                content={t("resolutionPanel.remarksHelp")}
                                side="bottom"
                                className="h-5 w-5"
                            />
                        </span>
                        {onCiteRequest && (
                            <button
                                type="button"
                                onClick={onCiteRequest}
                                className="cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] border border-[#d7dee8] bg-white px-3 py-[6px] text-[12px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                            >
                                <Quote size={13}/>
                                {t("resolutionPanel.addRemark")}
                            </button>
                        )}
                    </div>

                    {remarks.length === 0 ? (
                        <div className="mt-2 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                            {t("resolutionPanel.remarksEmptyHint")}
                        </div>
                    ) : (
                        <div className="mt-2.5 flex flex-col gap-2">
                            {remarks.map((r, index) => (
                                <div
                                    key={r.id}
                                    className={`rounded-[10px] border bg-white px-3 py-2.5 transition-shadow ${
                                        flashRemarkId === r.id
                                            ? "border-[#4e57d6] shadow-[0_0_0_3px_#ececfc]"
                                            : "border-[#e9edf3]"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="mt-[1px] flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-[#ececfc] px-1 text-[10px] font-bold text-[#4e57d6]">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.03em] text-[#a3adbd]">
                                                {t("resolutionPanel.fragment")} · {t(`resolutionPanel.targets.${r.documentTarget}`, {defaultValue: r.documentTarget})}
                                            </div>
                                            <Tooltip content={r.displayText} side="top" className="block min-w-0">
                                                <div className="mt-0.5 line-clamp-3 break-words border-l-2 border-[#4e57d6]/50 pl-2 text-[12px] italic leading-[1.45] text-[#3a4560]">
                                                    «{r.displayText}»
                                                </div>
                                            </Tooltip>
                                        </div>
                                        <div className="flex flex-none items-center gap-1">
                                            {onJumpToQuote && (
                                                <Tooltip content={t("resolutionPanel.showInText")} side="top">
                                                    <button
                                                        type="button"
                                                        onClick={() => onJumpToQuote(r)}
                                                        className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[7px] text-[#4e57d6] hover:bg-[#ececfc]"
                                                    >
                                                        <Search size={13}/>
                                                    </button>
                                                </Tooltip>
                                            )}
                                            <Tooltip content={t("resolutionPanel.deleteRemark")} side="top">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRemark(r.id)}
                                                    className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#fdf1f1] hover:text-[#c0392b]"
                                                >
                                                    <Trash2 size={13}/>
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <textarea
                                        ref={(el) => {
                                            if (el) noteRefs.current.set(r.id, el);
                                            else noteRefs.current.delete(r.id);
                                        }}
                                        value={r.note}
                                        onChange={(e) => updateRemarkNote(r.id, e.target.value)}
                                        placeholder={t("resolutionPanel.remarkPlaceholder")}
                                        rows={2}
                                        className="mt-2 w-full resize-y rounded-[8px] border border-[#e9edf3] bg-[#fbfcfe] px-3 py-2 text-[12.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] focus:bg-white"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[#1c2740]">
                    {remarks.length > 0 ? t("resolutionPanel.commentGeneral") : t("resolutionPanel.comment")}
                    {commentRequired && remarks.length === 0
                        ? <span className="text-[#d62815]"> *</span>
                        : <span className="font-normal text-[#8b97ab]"> {t("resolutionPanel.optional")}</span>}
                </span>
                <Tooltip content={t("resolutionPanel.lengthTooltip")} side="top">
                    <span><CharCounter length={composedComment.length} max={MAX_RESOLUTION_COMMENT_LENGTH}/></span>
                </Tooltip>
            </div>

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_RESOLUTION_COMMENT_LENGTH))}
                placeholder={remarks.length > 0 ? t("resolutionPanel.commentGeneralPlaceholder") : t(`resolutionPanel.commentPlaceholder.${choice}`)}
                maxLength={MAX_RESOLUTION_COMMENT_LENGTH}
                rows={3}
                className={`mt-1.5 w-full resize-y rounded-[10px] border bg-[#fbfcfe] px-3.5 py-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] ${
                    remarks.length > 0 ? "h-[120px]" : "h-[200px]"
                } ${commentMissing ? "border-[#e8b4b4]" : "border-[#e9edf3]"}`}
            />

            <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                        {t("resolutionPanel.filesAdded", {count: files.length, max: MAX_RESOLUTION_ATTACHMENTS})}
                        <HelpTooltip
                            content={t("resolutionPanel.filesHelp", {max: MAX_RESOLUTION_ATTACHMENTS, size: formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)})}
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
                            content={t("resolutionPanel.filesLimitReached", {max: MAX_RESOLUTION_ATTACHMENTS})}
                            side="top"
                        >
                            <span
                                className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-[8px] border border-[#e9edf3] bg-[#f6f8fb] px-3 py-[7px] text-[12.5px] font-semibold text-[#b7bfcc]"
                            >
                                <Paperclip size={14}/>
                                {t("resolutionPanel.attachFile")}
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
                            {t("resolutionPanel.attachFile")}
                        </label>
                    )}
                </div>

                {attachmentCountLimitHit && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>
                            {t("resolutionPanel.filesNotAdded", {max: MAX_RESOLUTION_ATTACHMENTS})}
                        </span>
                    </div>
                )}

                {oversizedFileNames.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>
                            {t(oversizedFileNames.length > 1 ? "resolutionPanel.oversizedMany" : "resolutionPanel.oversizedOne", {
                                names: oversizedFileNames.join("», «"),
                                size: formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES),
                            })}
                        </span>
                    </div>
                )}

                {files.length > 0 && (
                    <div className="mt-3 rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-3">
                        <div className="mb-2 text-[11.5px] font-semibold text-[#8b97ab]">
                            {t("resolutionPanel.yourFiles")}
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
                                    <Tooltip content={t("resolutionPanel.deleteFile")} side="top">
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

            {resignNeeded && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-[#f3dfb0] bg-[#fdf7e8] px-3.5 py-2 text-[12.5px] text-[#8a6100]">
                    <span>
                        {resignNeeded === "resign"
                            ? t("resolutionPanel.resignStale")
                            : t("resolutionPanel.resignOtherPerson")}
                    </span>
                    <button type="button" onClick={() => handleAction(choice, true)}
                            disabled={busy}
                            className="cursor-pointer shrink-0 rounded-[8px] border border-[#e0c47a] bg-white px-3 py-1 text-[12px] font-semibold text-[#8a6100] disabled:opacity-50">
                        {t("resolutionPanel.resignAgain")}
                    </button>
                </div>
            )}

            {/* Решения: слева кнопки с подписью ЭЦП (обязательна для любого решения; в тестовом режиме
                рядом - кнопки без ЭЦП, только пока на сервере включён EcpSigning:AllowWithoutEcp),
                справа - пояснение, к чему приведёт именно это решение на текущей фазе. */}
            <div className="mt-5 flex flex-col gap-3">
                {ACTIONS.map((c) => {
                    const actionTheme = CHOICE_THEME[c];
                    const Icon = actionTheme.icon;
                    const isRunning = submitting && lastAction?.choice === c;
                    const hint = t(`resolutionPanel.hints.${phase}.${c}`);
                    return (
                        <div key={c} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex flex-none flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => handleAction(c, true)}
                                    disabled={busy || composedTooLong}
                                    className={`group cursor-pointer flex w-[380px] max-w-full items-center justify-center gap-2.5 rounded-[12px] px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${DECISION_BUTTON_SHADOW[c]} ${actionTheme.buttonBg} ${actionTheme.buttonHover}`}
                                >
                                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
                                        <Icon className="h-[14px] w-[14px]" strokeWidth={2.6}/>
                                    </span>
                                    {isRunning && lastAction?.withEcp ? t("resolutionPanel.sending") : t(`resolutionPanel.ecpLabel.${c}`)}
                                </button>
                                {testMode && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction(c, false)}
                                        disabled={busy || composedTooLong}
                                        className={`cursor-pointer flex w-[300px] max-w-full items-center justify-center gap-2 rounded-[12px] border border-dashed bg-white px-4 py-[11px] text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TEST_ACTION_STYLE[c]}`}
                                    >
                                        <Icon className="h-4 w-4" strokeWidth={2.5}/>
                                        {isRunning && !lastAction?.withEcp ? t("resolutionPanel.sending") : t(`resolutionPanel.testLabel.${c}`)}
                                    </button>
                                )}
                            </div>
                            {hint && (
                                <div className={`min-w-[220px] flex-1 border-l-2 pl-3 text-[12px] leading-[1.45] text-[#6b7688] ${HINT_ACCENT[c]}`}>
                                    {hint}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {commentMissing && (
                <div className="mt-3 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                    <span>
                        {choice === "reject"
                            ? t("resolutionPanel.commentMissingReject")
                            : t("resolutionPanel.commentMissingOther")}
                    </span>
                </div>
            )}

            {composedTooLong && (
                <div className="mt-3 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                    <span>
                        {t("resolutionPanel.tooLong", {max: MAX_RESOLUTION_COMMENT_LENGTH})}
                    </span>
                </div>
            )}

            <ConfirmActionModal
                open={pendingReject !== null}
                onClose={() => setPendingReject(null)}
                onConfirm={handleConfirmReject}
                title={t("resolutionPanel.rejectConfirm.title")}
                message={t("resolutionPanel.rejectConfirm.message")}
                confirmLabel={t("resolutionPanel.rejectConfirm.confirm")}
                loadingLabel={t("resolutionPanel.rejectConfirm.loading")}
                loading={submitting}
                variant="danger"
                icon={X}
            />

            {ecp.modalOpen && (
                <EcpSignModal
                    vndId={vndId}
                    stageId={stageId}
                    payloadText={ecp.modalPayload}
                    decision={ecp.modalDecision}
                    onSigned={ecp.handleModalSigned}
                    onClose={ecp.handleModalClose}
                />
            )}
        </div>
    );
});
