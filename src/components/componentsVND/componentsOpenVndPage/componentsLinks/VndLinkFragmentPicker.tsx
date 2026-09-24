// Окно выбора фрагмента текста редакции для ссылки между ВНД ("Добавить ссылку" → "С упоминанием
// в тексте" и, при желании, "На конкретное место" целевого документа).
//
// Слева - редакции документа (Р1, Р2, ... с их статусом) и язык текста, в центре - сам текст
// (тот же RedactionTextView, что и на вкладке «Редакции»). Пользователь выделяет мышью фрагмент -
// рядом с выделением появляется кнопка "Прикрепить ссылку к этому месту" (она же - внизу окна).
// Вместе с текстом сохраняется "якорь" (текст до/после + номер вхождения, см. quoteAnchor.ts),
// чтобы потом найти ИМЕННО это место, даже если такая фраза встречается в документе не один раз.
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft, Check, Link2, MousePointerClick, Paperclip, X} from "lucide-react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";
import {
    getRedactionDisplayStatus, isRedactionVisibleToRegularUser, REDACTION_STATUS_META,
} from "@/utils/vndProcess/redactionStatus.ts";
import {
    getAvailableLanguages, LANGUAGE_TABS, type RedactionLanguage,
} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {
    RedactionTextView, type RedactionTextViewHandle,
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {buildQuoteAnchor} from "@/utils/docxWork/quoteAnchor.ts";
import {quoteMatchText} from "@/utils/vndProcess/quoteText.ts";
import {Loader} from "@/components/componentsGeneral/Loader";
import type {DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import {shortFragment} from "./vndLinkUi.ts";

/** Выбранный фрагмент - готовый "якорь" для AddVndLinkRequest.source/target. */
export interface PickedLinkFragment {
    redactionId: number;
    redactionNumber: number;
    redactionCode: string;
    documentTarget: RedactionLanguage;
    text: string;
    prefix: string | null;
    suffix: string | null;
    occurrence: number | null;
}

interface VndLinkFragmentPickerProps {
    /** Документ, в тексте которого выбирается фрагмент. */
    vnd: VndResponse;
    /** Номер шага мастера и их общее число - для индикатора в шапке. */
    step: number;
    stepsTotal: number;
    title: string;
    description: string;
    confirmLabel: string;
    /** Какую редакцию открыть сразу: "current" - действующую (для документа-цели), "latest" -
     * самую свежую (для документа, в котором сейчас работаем). */
    initialRedaction?: "current" | "latest";
    /** Уже существующие ссылки этого текста - подсвечиваются, чтобы не прикрепить повторно. */
    existingMarks?: (redactionId: number, lang: RedactionLanguage) => DocLinkMark[];
    submitting?: boolean;
    onConfirm: (fragment: PickedLinkFragment) => void;
    onBack?: () => void;
    onClose: () => void;
}

interface PendingSelection {
    text: string;
    prefix: string | null;
    suffix: string | null;
    occurrence: number | null;
    /** Где показать плавающую кнопку (координаты окна). */
    rect: DOMRect | null;
}

const MIN_FRAGMENT_LENGTH = 2;

export function VndLinkFragmentPicker({
                                          vnd, step, stepsTotal, title, description, confirmLabel,
                                          initialRedaction = "latest", existingMarks, submitting = false,
                                          onConfirm, onBack, onClose,
                                      }: VndLinkFragmentPickerProps) {
    const {t} = useTranslation();
    const {data: redactions, loading} = useVndRedactions(vnd.id);
    const isVndEditor = useIsVndEditor();

    const sortedDesc = useMemo(() => [...redactions].sort((a, b) => b.number - a.number), [redactions]);
    const latest = sortedDesc[0];
    const visible = useMemo(
        () => isVndEditor
            ? sortedDesc
            : sortedDesc.filter((r) => isRedactionVisibleToRegularUser(r, vnd.status, r.id === latest?.id, vnd.effectiveDate)),
        [isVndEditor, sortedDesc, vnd.status, vnd.effectiveDate, latest],
    );

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected: VndRedactionResponse | undefined = useMemo(() => {
        const explicit = visible.find((r) => r.id === selectedId);
        if (explicit) return explicit;
        if (initialRedaction === "current") return visible.find((r) => r.isCurrent) ?? visible[0];
        return visible[0];
    }, [visible, selectedId, initialRedaction]);

    const [language, setLanguage] = useState<RedactionLanguage>("ru");
    useEffect(() => {
        if (!selected) return;
        const available = getAvailableLanguages(selected);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!available.includes(language)) setLanguage(available[0] ?? "ru");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

    const textViewRef = useRef<RedactionTextViewHandle>(null);
    const textAreaRef = useRef<HTMLDivElement>(null);
    const [pending, setPending] = useState<PendingSelection | null>(null);

    // Сменили редакцию/язык - прежнее выделение больше не относится к открытому тексту.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPending(null);
    }, [selected?.id, language]);

    const captureSelection = useCallback(() => {
        const container = textViewRef.current?.getContainer();
        const selection = window.getSelection();
        if (!container || !selection) return;
        if (selection.isCollapsed || selection.rangeCount === 0) {
            // Просто щёлкнули по тексту - выбранный ранее фрагмент остаётся (кнопка внизу окна),
            // а плавающая кнопка, оставшаяся у старого места, прячется.
            setPending((p) => (p && p.rect ? {...p, rect: null} : p));
            return;
        }
        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;

        const text = quoteMatchText(selection.toString());
        if (text.length < MIN_FRAGMENT_LENGTH) return;

        const context = buildQuoteAnchor(container, range, text);
        const rects = Array.from(range.getClientRects());
        setPending({
            text,
            prefix: context?.prefix ?? null,
            suffix: context?.suffix ?? null,
            occurrence: context?.occurrence ?? null,
            rect: rects[rects.length - 1] ?? range.getBoundingClientRect(),
        });
    }, []);

    // Выделение фиксируем по отпусканию мыши/клавиши (выделение с клавиатуры - Shift+стрелки).
    useEffect(() => {
        const area = textAreaRef.current;
        if (!area) return;
        const onUp = () => setTimeout(captureSelection, 0);
        area.addEventListener("mouseup", onUp);
        area.addEventListener("keyup", onUp);
        return () => {
            area.removeEventListener("mouseup", onUp);
            area.removeEventListener("keyup", onUp);
        };
    }, [captureSelection, loading]);

    // Прокрутка текста - плавающая кнопка "уезжает" от выделения, прячем её (фрагмент при этом
    // остаётся выбранным - кнопка внизу окна по-прежнему работает).
    const hideFloating = useCallback(() => setPending((p) => (p && p.rect ? {...p, rect: null} : p)), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !submitting) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, submitting]);

    const confirm = () => {
        if (!pending || !selected || submitting) return;
        onConfirm({
            redactionId: selected.id,
            redactionNumber: selected.number,
            redactionCode: selected.code,
            documentTarget: language,
            text: pending.text,
            prefix: pending.prefix,
            suffix: pending.suffix,
            occurrence: pending.occurrence,
        });
    };

    const marks = selected && existingMarks ? existingMarks(selected.id, language) : undefined;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-8" onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose();
        }}>
            <div className="flex h-[90vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                {/* Шапка */}
                <div className="flex items-start gap-3 border-b border-[#eef2f7] px-5 pb-3 pt-4">
                    <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[#ececfc] text-[#4e57d6]">
                        <Link2 size={16} strokeWidth={2}/>
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="m-0 text-[14px] font-semibold text-[#1c2740]">{title}</h2>
                            <span className="rounded-full bg-[#f2f5f9] px-2 py-0.5 text-[10.5px] font-semibold text-[#8b97ab]">
                                {t("openVndPage.linkWizard.stepOf", {step, total: stepsTotal})}
                            </span>
                        </div>
                        <p className="m-0 mt-1 text-[12.5px] leading-snug text-[#55617a]">{description}</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={submitting}
                            className="flex-none cursor-pointer text-[#c3ccd8] hover:text-[#55617a] disabled:opacity-40">
                        <X size={18}/>
                    </button>
                </div>

                {/* Тело */}
                <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr] gap-4 bg-[#f7f9fc] p-4">
                    <div className="flex min-h-0 flex-col gap-3">
                        <div className="flex min-h-0 flex-1 flex-col rounded-[14px] border border-[#e9edf3] bg-white p-3">
                            <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {t("openVndPage.linkWizard.redactionsTitle", {code: vnd.code})}
                            </div>
                            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                                {visible.map((r) => {
                                    const status = getRedactionDisplayStatus(r, vnd.status, r.id === latest?.id, vnd.effectiveDate);
                                    const meta = REDACTION_STATUS_META[status];
                                    const active = r.id === selected?.id;
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setSelectedId(r.id)}
                                            className={`mb-1 flex w-full cursor-pointer items-center gap-2 rounded-[9px] px-2.5 py-2 text-left transition-colors ${
                                                active ? "bg-[#ececfc]" : "hover:bg-[#f6f8fb]"
                                            }`}
                                        >
                                            <span className={`grid h-7 w-8 flex-none place-items-center rounded-[7px] text-[11.5px] font-bold ${
                                                active ? "bg-[#4e57d6] text-white" : "bg-[#f2f5f9] text-[#55617a]"
                                            }`}>
                                                Р{r.number}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-mono text-[11px] text-[#55617a]">{r.code}</span>
                                                <span className="mt-0.5 inline-block rounded px-1.5 text-[10px] font-semibold"
                                                      style={{color: meta.color, background: meta.bg}}>
                                                    {t(`openVndPage.linkWizard.redactionStatus.${status}`, {defaultValue: meta.label})}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selected && (
                            <div className="rounded-[14px] border border-[#e9edf3] bg-white p-3">
                                <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                    {t("openVndPage.languageTabsPanel.title")}
                                </div>
                                <div className="flex rounded-[9px] bg-[#f2f5f9] p-[3px]">
                                    {LANGUAGE_TABS.map((tab) => {
                                        const available = selected[tab.fileKey] !== null;
                                        const active = available && language === tab.code;
                                        return (
                                            <button
                                                key={tab.code}
                                                type="button"
                                                disabled={!available}
                                                onClick={() => setLanguage(tab.code)}
                                                className={`h-7 flex-1 rounded-[6px] text-[11.5px] font-semibold transition-colors ${
                                                    !available
                                                        ? "cursor-not-allowed text-[#c3ccd8]"
                                                        : active
                                                            ? "cursor-pointer bg-white text-[#4e57d6] shadow-[0_1px_2px_rgba(15,27,45,.08)]"
                                                            : "cursor-pointer text-[#5d616c]"
                                                }`}
                                            >
                                                {tab.code.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div ref={textAreaRef} onScrollCapture={hideFloating}
                         className="vnd-link-picking flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                        {loading ? (
                            <Loader fullHeight={false}/>
                        ) : !selected ? (
                            <div className="grid flex-1 place-items-center text-[13px] text-[#8b97ab]">
                                {t("openVndPage.linkWizard.noRedactions")}
                            </div>
                        ) : (
                            <RedactionTextView
                                ref={textViewRef}
                                vnd={vnd}
                                selected={selected}
                                activeLanguage={language}
                                downloadingId={null}
                                onDownload={() => {}}
                                linkMarks={marks}
                                linkMarksClickable={false}
                            />
                        )}
                    </div>
                </div>

                {/* Низ: выбранный фрагмент и действия */}
                <div className="flex items-center gap-3 border-t border-[#eef2f7] px-5 py-3">
                    <div className="min-w-0 flex-1">
                        {pending ? (
                            <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
                                <span className="flex-none rounded bg-[#ececfc] px-1.5 py-0.5 text-[10.5px] font-bold text-[#4e57d6]">
                                    Р{selected?.number} · {language.toUpperCase()}
                                </span>
                                <span className="truncate italic text-[#2c3446]">«{shortFragment(pending.text, 160)}»</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[12.5px] text-[#8b97ab]">
                                <MousePointerClick size={15} strokeWidth={1.8}/>
                                {t("openVndPage.linkWizard.selectHint")}
                            </div>
                        )}
                    </div>
                    {onBack && (
                        <button type="button" onClick={onBack} disabled={submitting}
                                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50">
                            <ArrowLeft size={14}/>
                            {t("openVndPage.linkWizard.back")}
                        </button>
                    )}
                    <button type="button" onClick={confirm} disabled={!pending || submitting}
                            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] bg-[var(--app-accent,_#2f68f5)] px-3.5 text-[12.5px] font-semibold text-white transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-45">
                        <Check size={15} strokeWidth={2.2}/>
                        {confirmLabel}
                    </button>
                </div>
            </div>

            {/* Плавающая кнопка рядом с выделением */}
            {pending?.rect && !submitting && (
                <button
                    type="button"
                    // mousedown по кнопке сбросил бы выделение до клика - не даём.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={confirm}
                    className="fixed z-[60] flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1c2740] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(20,25,40,0.28)] transition hover:bg-[#4e57d6]"
                    style={{
                        left: Math.min(pending.rect.right + 8, window.innerWidth - 300),
                        top: Math.max(8, pending.rect.top - 40),
                    }}
                >
                    <Paperclip size={13} strokeWidth={2.2}/>
                    {confirmLabel}
                </button>
            )}
        </div>,
        document.body,
    );
}
