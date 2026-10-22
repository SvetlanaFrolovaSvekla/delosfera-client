import {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import type {ApprovalQuoteItem} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {ecpCredentialService} from "@/service/ecpCredentialService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {
    MAX_RESOLUTION_ATTACHMENTS,
    MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES,
    MAX_RESOLUTION_COMMENT_LENGTH,
} from "@/constants/validation/coordinationValidatuon.ts";
import {CHOICE_TO_DECISION} from "@/constants/vndConstants/resolutionDecisionTheme.ts";
import {useEcpApproval} from "@/hooks/useEcpApproval.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import type {QuoteAnchorContext} from "@/utils/docxWork/quoteAnchor.ts";
import {quoteDisplayText, quoteMatchText} from "@/utils/vndProcess/quoteText.ts";
import {composeResolutionComment, loadDraft, nextDraftId, saveDraft} from "@/utils/vndProcess/coordination/resolutionDraft.ts";
import {EcpSignModal} from "@/components/componentsSigning/EcpSignModal.tsx";
import type {DraftTextRemark, DecisionMode, ResolutionChoice, ResolutionPhase} from "./resolutionPanel/resolutionPanelTypes.ts";
import {EcpSessionCountdown} from "./resolutionPanel/EcpSessionCountdown.tsx";
import {ResolutionRemarksSection} from "./resolutionPanel/ResolutionRemarksSection.tsx";
import {ResolutionAttachments} from "./resolutionPanel/ResolutionAttachments.tsx";
import {ResolutionDecisionButtons} from "./resolutionPanel/ResolutionDecisionButtons.tsx";
import {SystemSignConfirmModal} from "./resolutionPanel/SystemSignConfirmModal.tsx";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {X, AlertCircle} from "lucide-react";

/** Типы панели - реэкспорт, чтобы импорты в других файлах не менялись. */
export type {DraftTextRemark, ResolutionChoice, ResolutionPhase};

import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";

/** Данные ЭЦП, приложенные к резолюции "Согласовать"*/
export type {ResolutionEcpSignature};



interface VndApproverResolutionPanelProps {
    /** Нужны для получения ЭЦП-хэша резолюции */
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
        /** ТЕСТ: имитация ЭЦП (EcpSigning:AllowVndTestEcp, backend перепроверяет настройку). */
        testEcp?: boolean,
        /** Без ЭЦП КР: локальная подпись системы «Делосфера» (право SignWithoutNationalEcp, backend
         * перепроверяет); hash - показанный в модалке подтверждения. */
        systemSign?: {hash: string | null},
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
    // "Отклонить" ждёт подтверждения; mode - какой кнопкой (с ЭЦП или тестовой) нажато.
    const [pendingReject, setPendingReject] = useState<{mode: DecisionMode} | null>(null);
    // Последняя нажатая кнопка решения - на ней показываем "Отправка…".
    const [lastAction, setLastAction] = useState<{choice: ResolutionChoice; mode: DecisionMode} | null>(null);
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
            // Лимит по размеру
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

    // Новое замечание к выделенному фрагменту
    const insertQuote = useCallback((
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
    }, [remarks, choice]);

    useImperativeHandle(ref, () => ({insertQuote}), [insertQuote]);

    const updateRemarkNote = (id: number, note: string) =>
        setRemarks((prev) => prev.map((r) => (r.id === id ? {...r, note} : r)));

    const handleRemoveRemark = (id: number) => {
        setRemarks((prev) => prev.filter((r) => r.id !== id));
        noteRefs.current.delete(id);
    };

    // Синхронная защита от повторной отправки
    const submitLockRef = useRef(false);

    // Любое решение согласующего ("Согласовать", "с замечаниями", "Отклонить") подписывается ЭЦП
    const ecp = useEcpApproval();
    const {session: ecpSession, isValid: ecpSessionValid} = useEcpSession();
    const [resignNeeded, setResignNeeded] = useState<"resign" | "reauth" | null>(null);

    const [testMode, setTestMode] = useState(false);
    const [testEcpMode, setTestEcpMode] = useState(false);
    // Сотрудник без ЭЦП КР (право SignWithoutNationalEcp): решения подписывает система «Делосфера» -
    // основные кнопки открывают SystemSignConfirmModal вместо ПИН/кода ГП «Инфоком».
    const {hasPermission} = useAuth();
    const systemSignMode = hasPermission(PermissionCode.SignWithoutNationalEcp);
    const [systemSealConfigured, setSystemSealConfigured] = useState(true);
    const [pendingSystem, setPendingSystem] = useState<ResolutionChoice | null>(null);
    const [systemHash, setSystemHash] = useState<string | null>(null);
    const [systemHashLoading, setSystemHashLoading] = useState(false);
    const [systemHashError, setSystemHashError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        ecpCredentialService.testMode()
            .then((r) => {
                if (cancelled) return;
                setTestMode(r.allowWithoutEcp);
                setTestEcpMode(r.allowVndTestEcp === true);
                // Старый backend поле не отдаёт - считаем настроенным, backend всё равно перепроверит.
                setSystemSealConfigured(r.systemSealConfigured !== false);
            })
            .catch(() => { /* нет ответа - тестовых кнопок просто не будет */ });
        return () => { cancelled = true; };
    }, []);

    const doSubmit = async (decisionChoice: ResolutionChoice, ecpSignature?: ResolutionEcpSignature,
                            mode: DecisionMode = "ecp") => {
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
            const ok = await onSubmit(decisionChoice, composedComment, files, quotesToSend, ecpSignature,
                mode === "withoutEcp" || undefined, mode === "testEcp" || undefined,
                mode === "system" ? {hash: systemHash} : undefined);
            // Черновик стираем только после успешной отправки - при ошибке он нужен, чтобы
            // пользователь ничего не потерял.
            if (ok === true) saveDraft(draftStorageKey, null);
            if (ok === "reauth") ecp.resetSession();
            setResignNeeded(ok === "resign" || ok === "reauth" ? ok : null);
        } finally {
            submitLockRef.current = false;
        }
    };

    // Кнопка решения: c - решение, mode - с подписью ЭЦП, тестовое без ЭЦП или тестовая имитация ЭЦП.
    // Для "с замечаниями"/"отклонить" нужен текст - без него показываем подсказку (commentMissing по
    // выбранному решению), запрос не отправляем. "Отклонить" - через подтверждение.
    const busy = submitting || ecp.quietSigning || ecp.modalOpen || pendingSystem !== null;
    const missingFor = (c: ResolutionChoice) => c !== "approve" && comment.trim().length === 0 && !hasRemarkNotes;

    // Системная подпись: окно подтверждения с хэшем резолюции (тот же, что подписывался бы ЭЦП; backend
    // при сохранении пересчитает его и сверит - подписывается ровно то, что показано).
    const openSystemConfirm = (c: ResolutionChoice) => {
        setPendingSystem(c);
        setSystemHash(null);
        setSystemHashError(null);
        setSystemHashLoading(true);
        coordinationService.getResolutionHash(vndId, stageId, composedComment, CHOICE_TO_DECISION[c])
            .then((r) => setSystemHash(r.hash))
            .catch((err: unknown) => {
                const message = (err as {response?: {data?: {message?: string}}}).response?.data?.message;
                setSystemHashError(message ?? t("resolutionPanel.systemSign.hashError"));
            })
            .finally(() => setSystemHashLoading(false));
    };

    const handleConfirmSystem = () => {
        const c = pendingSystem;
        if (c === null || !systemHash) return;
        setPendingSystem(null);
        setLastAction({choice: c, mode: "system"});
        void doSubmit(c, undefined, "system");
    };

    const runDecision = (c: ResolutionChoice, mode: DecisionMode) => {
        if (mode === "system") {
            openSystemConfirm(c);
            return;
        }
        setLastAction({choice: c, mode});
        if (mode !== "ecp") {
            // Без ЭЦП / имитация ЭЦП: ПИН, код и подпись пропускаются, "подпись"-имитацию (с настоящим
            // хэшем резолюции) строит backend, если включён EcpSigning:AllowVndTestEcp.
            void doSubmit(c, undefined, mode);
            return;
        }
        // requestSignature сама решает: подписать сохранённой идентификацией / действующей сессией
        // тихо или открыть EcpSignModal. Решение входит в подписываемый хэш (он считается на backend,
        // тот же хэш backend перепроверит при сохранении резолюции).
        ecp.requestSignature(vndId, stageId, composedComment, CHOICE_TO_DECISION[c])
            .then((signature) => doSubmit(c, signature))
            .catch(() => {});
    };

    const handleAction = (c: ResolutionChoice, mode: DecisionMode) => {
        if (busy || submitLockRef.current) return;
        setChoice(c);
        setResignNeeded(null);
        if (missingFor(c) || composedTooLong) return;
        // "Отклонить" системной подписью подтверждается в том же окне системной подписи.
        if (c === "reject" && mode !== "system") {
            setPendingReject({mode});
            return;
        }
        runDecision(c, mode);
    };

    const handleConfirmReject = () => {
        const pending = pendingReject;
        setPendingReject(null);
        if (pending) runDecision("reject", pending.mode);
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
                <ResolutionRemarksSection
                    remarks={remarks}
                    flashRemarkId={flashRemarkId}
                    noteRefs={noteRefs}
                    onCiteRequest={onCiteRequest}
                    onJumpToQuote={onJumpToQuote}
                    onNoteChange={updateRemarkNote}
                    onRemoveRemark={handleRemoveRemark}
                />
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

            <ResolutionAttachments
                files={files}
                attachmentLimitReached={attachmentLimitReached}
                attachmentCountLimitHit={attachmentCountLimitHit}
                oversizedFileNames={oversizedFileNames}
                fileInputKey={fileInputKey}
                onFilesPicked={handleFilesPicked}
                onRemoveFile={handleRemoveFile}
            />

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
                    <button type="button" onClick={() => handleAction(choice, systemSignMode ? "system" : "ecp")}
                            disabled={busy}
                            className="cursor-pointer shrink-0 rounded-[8px] border border-[#e0c47a] bg-white px-3 py-1 text-[12px] font-semibold text-[#8a6100] disabled:opacity-50">
                        {t("resolutionPanel.resignAgain")}
                    </button>
                </div>
            )}

            {/* Решения: слева кнопки с подписью ЭЦП (обязательна для любого решения; в тестовом режиме
                рядом - кнопки без ЭЦП, только пока на сервере включён EcpSigning:AllowWithoutEcp),
                справа - пояснение, к чему приведёт именно это решение на текущей фазе. */}
            <ResolutionDecisionButtons
                phase={phase}
                testMode={testMode}
                testEcpMode={testEcpMode}
                systemSignMode={systemSignMode}
                systemSealUnavailable={!systemSealConfigured}
                busy={busy}
                composedTooLong={composedTooLong}
                submitting={submitting}
                lastAction={lastAction}
                onAction={handleAction}
            />

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

            <SystemSignConfirmModal
                choice={pendingSystem}
                hash={systemHash}
                hashLoading={systemHashLoading}
                hashError={systemHashError}
                submitting={submitting}
                onConfirm={handleConfirmSystem}
                onClose={() => setPendingSystem(null)}
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
