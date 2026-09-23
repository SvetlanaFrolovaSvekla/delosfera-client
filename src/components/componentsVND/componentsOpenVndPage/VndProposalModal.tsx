// Окно "+ Предложения по ВНД" на странице открытого ВНД: текст предложения, цитаты из текста
// редакции ("+ Сослаться на текст редакции" - открывает масштабный просмотр редакции в режиме
// цитирования, как при согласовании) и файлы. Отправленное предложение получает главный редактор
// ВНД (уведомление в системе + письмо) и видит его на странице "Предложения по ВНД".
//
// В отличие от замечаний согласующих, цитата здесь - просто текст фрагмента (без "якоря" и без
// "Показать в тексте") и необязательный комментарий автора к нему.
import React, {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import axios from "axios";

import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {
    notifyVndProposalsChanged,
    VND_PROPOSAL_LIMITS,
    vndProposalService,
    type VndProposalQuoteTarget,
} from "@/service/vndProposalService/vndProposalService.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {toast} from "@/service/toastService.ts";
import {quoteDisplayText} from "@/utils/vndProcess/quoteText.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";

import {FileText, Lightbulb, Loader2, Paperclip, Quote, Send, TextQuote, Trash2, X} from "lucide-react";

interface VndProposalModalProps {
    vnd: VndResponse;
    /** Редакция, по которой пишется предложение и из которой берутся цитаты (обычно действующая). */
    redaction: VndRedactionResponse | undefined;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

interface DraftQuote {
    id: number;
    documentTarget: VndProposalQuoteTarget;
    text: string;
    note: string;
}

const QUOTE_TARGETS: VndProposalQuoteTarget[] = ["ru", "kg", "en"];

function extractErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string } | undefined;
        if (data?.message) return data.message;
    }
    return err instanceof Error && err.message ? err.message : fallback;
}

let nextQuoteId = 1;

export function VndProposalModal({vnd, redaction, downloadingId, onDownload, onClose}: VndProposalModalProps) {
    const {t} = useTranslation();

    const [text, setText] = useState("");
    const [quotes, setQuotes] = useState<DraftQuote[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [citeOpen, setCiteOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [flashQuoteId, setFlashQuoteId] = useState<number | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const quoteNoteRefs = useRef(new Map<number, HTMLTextAreaElement>());
    const [focusQuoteId, setFocusQuoteId] = useState<number | null>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // После вставки цитаты - фокус в её комментарий и короткая подсветка карточки.
    useEffect(() => {
        if (focusQuoteId === null || citeOpen) return;
        const el = quoteNoteRefs.current.get(focusQuoteId);
        el?.focus();
        el?.scrollIntoView({block: "nearest", behavior: "smooth"});
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFocusQuoteId(null);
    }, [focusQuoteId, citeOpen]);

    useEffect(() => {
        if (flashQuoteId === null) return;
        const timer = setTimeout(() => setFlashQuoteId(null), 1600);
        return () => clearTimeout(timer);
    }, [flashQuoteId]);

    const trimmedText = text.trim();
    const hasContent = trimmedText.length > 0 || quotes.length > 0;
    const isDirty = hasContent || files.length > 0;
    const canSubmit = hasContent && !submitting && text.length <= VND_PROPOSAL_LIMITS.maxTextLength;

    const requestClose = () => {
        if (submitting) return;
        if (isDirty) setDiscardOpen(true);
        else onClose();
    };

    // Esc - закрыть (с подтверждением, если что-то набрано). Пока открыт просмотр редакции,
    // Esc обрабатывает он сам.
    useEffect(() => {
        if (citeOpen || discardOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") requestClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    });

    const handleInsertQuote = (selectedText: string, documentTarget: RedactionViewTarget) => {
        const display = quoteDisplayText(selectedText);
        if (!display) return;
        const target: VndProposalQuoteTarget = QUOTE_TARGETS.includes(documentTarget as VndProposalQuoteTarget)
            ? documentTarget as VndProposalQuoteTarget
            : "ru";

        const existing = quotes.find((q) => q.text === display && q.documentTarget === target);
        if (existing) {
            setNotice(t("vndProposals.modal.quoteDuplicate"));
            setFlashQuoteId(existing.id);
            setFocusQuoteId(existing.id);
            return;
        }
        if (quotes.length >= VND_PROPOSAL_LIMITS.maxQuotes) {
            setNotice(t("vndProposals.modal.quotesLimit", {max: VND_PROPOSAL_LIMITS.maxQuotes}));
            return;
        }
        const quote: DraftQuote = {id: nextQuoteId++, documentTarget: target, text: display, note: ""};
        setNotice(null);
        setQuotes((prev) => [...prev, quote]);
        setFlashQuoteId(quote.id);
        setFocusQuoteId(quote.id);
    };

    const updateQuoteNote = (id: number, note: string) =>
        setQuotes((prev) => prev.map((q) => (q.id === id ? {...q, note} : q)));

    const removeQuote = (id: number) => setQuotes((prev) => prev.filter((q) => q.id !== id));

    const handleAddFiles = (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const incoming = Array.from(list);
        const oversized = incoming.find((f) => f.size > VND_PROPOSAL_LIMITS.maxAttachmentSizeBytes);
        if (oversized) {
            setNotice(t("vndProposals.modal.fileTooLarge", {
                name: oversized.name, size: formatFileSize(VND_PROPOSAL_LIMITS.maxAttachmentSizeBytes),
            }));
        }
        const accepted = incoming.filter((f) => f.size <= VND_PROPOSAL_LIMITS.maxAttachmentSizeBytes);
        const slots = VND_PROPOSAL_LIMITS.maxAttachments - files.length;
        if (accepted.length > slots) {
            setNotice(t("vndProposals.modal.filesLimit", {max: VND_PROPOSAL_LIMITS.maxAttachments}));
        } else if (!oversized) {
            setNotice(null);
        }
        setFiles((prev) => [...prev, ...accepted.slice(0, Math.max(0, slots))]);
    };

    const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            await vndProposalService.create(vnd.id, {
                text: trimmedText,
                redactionId: redaction?.id ?? null,
                quotes: quotes.map((q) => ({
                    documentTarget: q.documentTarget,
                    text: q.text,
                    note: q.note.trim() || null,
                })),
                files,
            });
            toast.success(t("vndProposals.modal.successTitle"), t("vndProposals.modal.successDescription"));
            notifyVndProposalsChanged();
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err, t("vndProposals.modal.submitError")));
        } finally {
            setSubmitting(false);
        }
    };

    const vndTitle = vnd.titleRu;

    return (
        <>
            {/* Пока открыт просмотр редакции для цитирования, само окно предложения скрыто, но
                остаётся смонтированным - набранный текст, цитаты и файлы не теряются. */}
            {!citeOpen && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 p-4 backdrop-blur-[1px]"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) requestClose();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_60px_-12px_rgba(28,39,64,0.35)]"
                    >
                        {/* Шапка */}
                        <div className="flex flex-none items-start gap-3 border-b border-[#eef2f7] px-6 py-4">
                            <span
                                className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-[#fff6e0] text-[#c98a06]">
                                <Lightbulb size={20} strokeWidth={1.9}/>
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[16.5px] font-bold text-[#1c2740]">
                                    {t("vndProposals.modal.title")}
                                </h2>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[#8b97ab]">
                                    <span className="rounded-[6px] bg-[#ececfc] px-2 py-[1px] font-semibold text-[#4e57d6]">
                                        {vnd.code}
                                    </span>
                                    {redaction && (
                                        <span className="rounded-[6px] bg-[#f1f4f8] px-2 py-[1px] font-medium text-[#55617a]">
                                            {t("vndProposals.modal.redactionChip", {code: redaction.code})}
                                        </span>
                                    )}
                                    <span className="min-w-0 truncate" title={vndTitle}>{vndTitle}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={requestClose}
                                className="flex-none cursor-pointer rounded-[8px] p-1 text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                            >
                                <X size={19}/>
                            </button>
                        </div>

                        {/* Тело */}
                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                            <p className="rounded-[12px] border border-[#f3e6c4] bg-[#fffaf0] px-4 py-3 text-[12.5px] leading-[1.55] text-[#6b5a2e]">
                                {t("vndProposals.modal.intro")}
                            </p>

                            {/* Текст предложения */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label htmlFor="vnd-proposal-text" className="text-[12.5px] font-semibold text-[#26324a]">
                                        {t("vndProposals.modal.textLabel")}
                                    </label>
                                    <CharCounter length={text.length} max={VND_PROPOSAL_LIMITS.maxTextLength} nearLimitThreshold={200}/>
                                </div>
                                <textarea
                                    id="vnd-proposal-text"
                                    ref={textareaRef}
                                    value={text}
                                    onChange={(e) => setText(e.target.value.slice(0, VND_PROPOSAL_LIMITS.maxTextLength))}
                                    rows={5}
                                    placeholder={t("vndProposals.modal.textPlaceholder")}
                                    className="block w-full resize-y rounded-[11px] border border-[#dfe4ec] bg-white px-3.5 py-2.5 text-[13.5px] leading-[1.55] text-[#1c2740] outline-none transition-colors placeholder:text-[#b3bccb] focus:border-[#4e57d6] focus:ring-2 focus:ring-[#4e57d6]/15"
                                />
                            </div>

                            {/* Цитаты */}
                            <div>
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-[12.5px] font-semibold text-[#26324a]">
                                        {t("vndProposals.modal.quotesLabel")}
                                        {quotes.length > 0 && (
                                            <span className="ml-1.5 rounded-full bg-[#ececfc] px-1.5 py-[1px] text-[11px] font-bold text-[#4e57d6]">
                                                {quotes.length}
                                            </span>
                                        )}
                                    </div>
                                    {redaction && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNotice(null);
                                                setCiteOpen(true);
                                            }}
                                            className="flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#d9dcf7] bg-[#f5f6fe] px-3 py-[6px] text-[12px] font-semibold text-[#4e57d6] transition-colors hover:bg-[#ececfc]"
                                        >
                                            <TextQuote size={14}/>
                                            + {t("vndProposals.modal.citeButton")}
                                        </button>
                                    )}
                                </div>

                                {quotes.length === 0 ? (
                                    <div className="flex items-center gap-2 rounded-[11px] border border-dashed border-[#dfe4ec] px-3.5 py-3 text-[12px] text-[#8b97ab]">
                                        <Quote size={14} className="flex-none text-[#b3bccb]"/>
                                        {t("vndProposals.modal.citeHint")}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5">
                                        {quotes.map((q, index) => (
                                            <div
                                                key={q.id}
                                                className={`rounded-[12px] border bg-[#fbfcfe] p-3 transition-shadow duration-500 ${
                                                    flashQuoteId === q.id
                                                        ? "border-[#4e57d6]/60 shadow-[0_0_0_3px_rgba(78,87,214,0.15)]"
                                                        : "border-[#e5e9f0]"
                                                }`}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <span className="mt-[2px] flex-none rounded-[5px] bg-[#eef0fb] px-1.5 py-[1px] text-[10.5px] font-bold text-[#4e57d6]">
                                                        {index + 1} · {t(`vndProposals.langs.${q.documentTarget}`)}
                                                    </span>
                                                    <blockquote className="min-w-0 flex-1 border-l-[3px] border-[#c7cbf2] pl-2.5 text-[12.5px] italic leading-[1.55] text-[#3a4560]">
                                                        «{q.text}»
                                                    </blockquote>
                                                    <button
                                                        type="button"
                                                        title={t("vndProposals.modal.removeQuote")}
                                                        onClick={() => removeQuote(q.id)}
                                                        className="flex-none cursor-pointer rounded-[7px] p-1 text-[#a3adbd] hover:bg-[#fdf1f1] hover:text-[#c0392b]"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                                <textarea
                                                    ref={(el) => {
                                                        if (el) quoteNoteRefs.current.set(q.id, el);
                                                        else quoteNoteRefs.current.delete(q.id);
                                                    }}
                                                    value={q.note}
                                                    onChange={(e) => updateQuoteNote(
                                                        q.id, e.target.value.slice(0, VND_PROPOSAL_LIMITS.maxQuoteNoteLength),
                                                    )}
                                                    rows={2}
                                                    placeholder={t("vndProposals.modal.quoteNotePlaceholder")}
                                                    className="mt-2 block w-full resize-y rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[12.5px] text-[#1c2740] outline-none placeholder:text-[#b3bccb] focus:border-[#4e57d6] focus:ring-2 focus:ring-[#4e57d6]/15"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Файлы */}
                            <div>
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-[12.5px] font-semibold text-[#26324a]">
                                        {t("vndProposals.modal.attachmentsLabel")}
                                        <span className="ml-1.5 text-[11.5px] font-normal text-[#a3adbd]">
                                            {t("vndProposals.modal.attachHint", {
                                                max: VND_PROPOSAL_LIMITS.maxAttachments,
                                                size: formatFileSize(VND_PROPOSAL_LIMITS.maxAttachmentSizeBytes),
                                            })}
                                        </span>
                                    </div>
                                    {files.length < VND_PROPOSAL_LIMITS.maxAttachments && (
                                        <label
                                            className="flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-[6px] text-[12px] font-semibold text-[#3a4560] transition-colors hover:bg-[#f6f8fb]">
                                            <Paperclip size={14}/>
                                            {t("vndProposals.modal.attachFiles")}
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    handleAddFiles(e.target.files);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                                {files.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <div
                                                key={`${f.name}-${i}`}
                                                className="flex max-w-full items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] py-[6px] pl-2.5 pr-1.5"
                                            >
                                                <FileText size={14} className="flex-none text-[#8b97ab]"/>
                                                <span className="max-w-[260px] truncate text-[12px] text-[#26324a]" title={f.name}>
                                                    {f.name}
                                                </span>
                                                <span className="flex-none text-[11px] text-[#a3adbd]">{formatFileSize(f.size)}</span>
                                                <button
                                                    type="button"
                                                    title={t("vndProposals.modal.removeFile")}
                                                    onClick={() => removeFile(i)}
                                                    className="flex-none cursor-pointer rounded-[6px] p-0.5 text-[#a3adbd] hover:text-[#c0392b]"
                                                >
                                                    <X size={13}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {notice && (
                                <div className="rounded-[10px] border border-[#f0dcae] bg-[#fdf6e7] px-3.5 py-2 text-[12px] text-[#9a6408]">
                                    {notice}
                                </div>
                            )}
                            {error && (
                                <div className="rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3.5 py-2 text-[12.5px] text-[#c0392b]">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Подвал */}
                        <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-[#eef2f7] bg-[#fbfcfe] px-6 py-3.5">
                            <span className="text-[11.5px] text-[#a3adbd]">
                                {!hasContent && t("vndProposals.modal.emptyHint")}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    disabled={submitting}
                                    className="h-[38px] cursor-pointer rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                                >
                                    {t("vndProposals.modal.cancel")}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {submitting ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
                                    {submitting ? t("vndProposals.modal.submitting") : t("vndProposals.modal.submit")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* Масштабный просмотр редакции в режиме "Сослаться на выделенное" - как в "Ваша
                резолюция" при согласовании, но без процесса согласования (без маркеров замечаний). */}
            {citeOpen && redaction && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={redaction}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onClose={() => setCiteOpen(false)}
                    onInsertQuote={(selectedText, documentTarget) => handleInsertQuote(selectedText, documentTarget)}
                />
            )}

            <ConfirmActionModal
                open={discardOpen}
                onClose={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false);
                    onClose();
                }}
                title={t("vndProposals.modal.discardTitle")}
                message={t("vndProposals.modal.discardMessage")}
                confirmLabel={t("vndProposals.modal.discardConfirm")}
                variant="warning"
            />
        </>
    );
}
