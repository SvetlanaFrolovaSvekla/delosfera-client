// Мастер "Добавить ссылку" на вкладке «Связанные документы»:
//
//   1. Выбор ВНД (VndLinkPicker - как и раньше).
//   2. Как добавить ссылку:
//      - "Без упоминания в тексте" - обычная ссылка документа (как было раньше), сразу сохраняется;
//      - "С упоминанием в тексте" - дальше выбрать место в тексте.
//   3. Где в тексте ЭТОГО документа упоминается ссылка: редакция, язык, выделенный фрагмент →
//      "Прикрепить ссылку к этому месту" (VndLinkFragmentPicker).
//   4. Куда ведёт ссылка: на весь документ (по умолчанию) или на конкретное место в тексте
//      документа-цели (снова VndLinkFragmentPicker, уже для целевого документа).
import {useEffect, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {
    ArrowLeft, ArrowRight, FileText, Link2, Loader2, MapPin, TextSelect, X,
} from "lucide-react";
import type {AddVndLinkRequest, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {useModalShake} from "@/hooks/useModalShake.ts";
import type {DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import type {RedactionLanguage} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {VndLinkPicker} from "./VndLinkPicker.tsx";
import {VndLinkFragmentPicker, type PickedLinkFragment} from "./VndLinkFragmentPicker.tsx";
import {LINK_STATUS_STYLES, shortFragment} from "./vndLinkUi.ts";

type Step = "pick" | "mode" | "source" | "targetMode" | "target";

interface VndAddLinkWizardProps {
    /** Документ, В КОТОРЫЙ добавляется ссылка. */
    vnd: VndResponse;
    /** Уже существующие ссылки в тексте этого документа - подсвечиваются при выборе места. */
    existingMarks?: (redactionId: number, lang: RedactionLanguage) => DocLinkMark[];
    /** Сохранить ссылку. Бросает ошибку - мастер покажет её и останется открытым. */
    onSubmit: (request: AddVndLinkRequest) => Promise<void>;
    onClose: () => void;
}

function toAnchor(f: PickedLinkFragment) {
    return {
        redactionId: f.redactionId,
        documentTarget: f.documentTarget,
        text: f.text,
        prefix: f.prefix,
        suffix: f.suffix,
        occurrence: f.occurrence,
    };
}

export function VndAddLinkWizard({vnd, existingMarks, onSubmit, onClose}: VndAddLinkWizardProps) {
    const {t} = useTranslation();
    const [step, setStep] = useState<Step>("pick");
    const [target, setTarget] = useState<VndResponse | null>(null);
    const [sourceFragment, setSourceFragment] = useState<PickedLinkFragment | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (request: AddVndLinkRequest) => {
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit(request);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : t("openVndPage.linkWizard.saveError"));
            setSubmitting(false);
        }
    };

    if (step === "pick" || !target) {
        return (
            <VndLinkPicker
                excludeIds={[vnd.id]}
                onSelect={(item) => {
                    setTarget(item);
                    setError(null);
                    setStep("mode");
                }}
                onClose={onClose}
            />
        );
    }

    if (step === "source") {
        return (
            <VndLinkFragmentPicker
                vnd={vnd}
                step={3}
                stepsTotal={4}
                title={t("openVndPage.linkWizard.sourceTitle")}
                description={t("openVndPage.linkWizard.sourceDescription", {code: vnd.code, target: target.code})}
                confirmLabel={t("openVndPage.linkWizard.attachHere")}
                initialRedaction="latest"
                existingMarks={existingMarks}
                onConfirm={(fragment) => {
                    setSourceFragment(fragment);
                    setError(null);
                    setStep("targetMode");
                }}
                onBack={() => setStep("mode")}
                onClose={onClose}
            />
        );
    }

    if (step === "target" && sourceFragment) {
        return (
            <>
                <VndLinkFragmentPicker
                    vnd={target}
                    step={4}
                    stepsTotal={4}
                    title={t("openVndPage.linkWizard.targetTitle", {code: target.code})}
                    description={t("openVndPage.linkWizard.targetDescription", {code: target.code})}
                    confirmLabel={t("openVndPage.linkWizard.linkToThisPlace")}
                    initialRedaction="current"
                    submitting={submitting}
                    onConfirm={(fragment) => void submit({
                        targetVndId: target.id,
                        source: toAnchor(sourceFragment),
                        target: toAnchor(fragment),
                    })}
                    onBack={() => setStep("targetMode")}
                    onClose={onClose}
                />
                {error && <FloatingError message={error} onClose={() => setError(null)}/>}
            </>
        );
    }

    return (
        <ChoiceModal
            vnd={vnd}
            target={target}
            step={step === "mode" ? "mode" : "targetMode"}
            sourceFragment={sourceFragment}
            submitting={submitting}
            error={error}
            onBack={() => {
                setError(null);
                setStep(step === "mode" ? "pick" : "source");
            }}
            onClose={onClose}
            onWithoutMention={() => void submit({targetVndId: target.id})}
            onWithMention={() => setStep("source")}
            onWholeDocument={() => sourceFragment && void submit({targetVndId: target.id, source: toAnchor(sourceFragment)})}
            onSpecificPlace={() => setStep("target")}
        />
    );
}

interface ChoiceModalProps {
    vnd: VndResponse;
    target: VndResponse;
    step: "mode" | "targetMode";
    sourceFragment: PickedLinkFragment | null;
    submitting: boolean;
    error: string | null;
    onBack: () => void;
    onClose: () => void;
    onWithoutMention: () => void;
    onWithMention: () => void;
    onWholeDocument: () => void;
    onSpecificPlace: () => void;
}

function ChoiceModal({
                         vnd, target, step, sourceFragment, submitting, error,
                         onBack, onClose, onWithoutMention, onWithMention, onWholeDocument, onSpecificPlace,
                     }: ChoiceModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !submitting) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, submitting]);

    const isMode = step === "mode";

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleBackdropClick();
        }}>
            <div ref={panelRef} className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 pb-3 pt-4">
                    <Link2 size={17} strokeWidth={1.8} className="text-[#4e57d6]"/>
                    <h2 className="m-0 flex-1 text-[13.5px] font-semibold">
                        {isMode ? t("openVndPage.linkWizard.modeTitle") : t("openVndPage.linkWizard.targetModeTitle")}
                    </h2>
                    <span className="rounded-full bg-[#f2f5f9] px-2 py-0.5 text-[10.5px] font-semibold text-[#8b97ab]">
                        {t("openVndPage.linkWizard.stepOf", {step: isMode ? 2 : 4, total: 4})}
                    </span>
                    <button type="button" onClick={onClose} disabled={submitting}
                            className="flex-none cursor-pointer text-[#c3ccd8] hover:text-[#55617a] disabled:opacity-40">
                        <X size={18}/>
                    </button>
                </div>

                <div className="px-5 py-4">
                    {/* Откуда → куда */}
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#f7f9fc] px-3 py-2.5">
                        <DocChip code={vnd.code} title={vnd.name}/>
                        <ArrowRight size={15} className="flex-none text-[#a3adbd]"/>
                        <DocChip code={target.code} title={target.name} status={target.status}/>
                    </div>

                    {!isMode && sourceFragment && (
                        <div className="mb-4 rounded-xl border border-[#e3e6fb] bg-[#f8f8ff] px-3 py-2.5">
                            <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#4e57d6]">
                                <TextSelect size={12} strokeWidth={2.2}/>
                                {t("openVndPage.linkWizard.mentionedIn", {
                                    redaction: `Р${sourceFragment.redactionNumber}`,
                                    lang: sourceFragment.documentTarget.toUpperCase(),
                                })}
                            </div>
                            <div className="text-[12.5px] italic leading-snug text-[#2c3446]">
                                «{shortFragment(sourceFragment.text, 220)}»
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2.5 sm:grid-cols-2">
                        {isMode ? (
                            <>
                                <OptionCard
                                    icon={<FileText size={18} strokeWidth={1.8}/>}
                                    title={t("openVndPage.linkWizard.withoutMentionTitle")}
                                    description={t("openVndPage.linkWizard.withoutMentionDescription")}
                                    disabled={submitting}
                                    loading={submitting}
                                    onClick={onWithoutMention}
                                />
                                <OptionCard
                                    icon={<TextSelect size={18} strokeWidth={1.8}/>}
                                    title={t("openVndPage.linkWizard.withMentionTitle")}
                                    description={t("openVndPage.linkWizard.withMentionDescription")}
                                    accent
                                    disabled={submitting}
                                    onClick={onWithMention}
                                />
                            </>
                        ) : (
                            <>
                                <OptionCard
                                    icon={<FileText size={18} strokeWidth={1.8}/>}
                                    title={t("openVndPage.linkWizard.wholeDocumentTitle")}
                                    description={t("openVndPage.linkWizard.wholeDocumentDescription", {code: target.code})}
                                    accent
                                    disabled={submitting}
                                    loading={submitting}
                                    onClick={onWholeDocument}
                                />
                                <OptionCard
                                    icon={<MapPin size={18} strokeWidth={1.8}/>}
                                    title={t("openVndPage.linkWizard.specificPlaceTitle")}
                                    description={t("openVndPage.linkWizard.specificPlaceDescription", {code: target.code})}
                                    disabled={submitting}
                                    onClick={onSpecificPlace}
                                />
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mt-3 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center border-t border-[#eef2f7] px-5 py-3">
                    <button type="button" onClick={onBack} disabled={submitting}
                            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-2 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-50">
                        <ArrowLeft size={14}/>
                        {isMode ? t("openVndPage.linkWizard.chooseAnotherDocument") : t("openVndPage.linkWizard.chooseAnotherFragment")}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function DocChip({code, title, status}: { code: string; title: string; status?: string }) {
    const {t} = useTranslation();
    return (
        <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5">
                <span className="font-mono text-[11.5px] font-semibold text-[#4e57d6]">{code}</span>
                {status && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${LINK_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500"}`}>
                        {t(`openVndPage.linksTab.statuses.${status}`, {defaultValue: status})}
                    </span>
                )}
            </span>
            <span className="truncate text-[12px] text-[#55617a]">{title}</span>
        </span>
    );
}

function OptionCard({icon, title, description, accent, disabled, loading, onClick}: {
    icon: ReactNode;
    title: string;
    description: string;
    accent?: boolean;
    disabled?: boolean;
    loading?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`group flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                accent
                    ? "border-[#cfd3fa] bg-[#f8f8ff] hover:border-[#4e57d6] hover:shadow-[0_4px_16px_rgba(78,87,214,0.14)]"
                    : "border-[#e5e9f0] bg-white hover:border-[#b9c2d3] hover:shadow-[0_4px_16px_rgba(20,25,40,0.08)]"
            }`}
        >
            <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${
                accent ? "bg-[#4e57d6] text-white" : "bg-[#f2f5f9] text-[#55617a]"
            }`}>
                {loading ? <Loader2 size={17} className="animate-spin"/> : icon}
            </span>
            <span className="text-[13px] font-semibold text-[#1c2740]">{title}</span>
            <span className="text-[12px] leading-snug text-[#8b97ab]">{description}</span>
        </button>
    );
}

function FloatingError({message, onClose}: { message: string; onClose: () => void }) {
    return createPortal(
        <div className="fixed bottom-6 left-1/2 z-[80] flex max-w-[560px] -translate-x-1/2 items-start gap-2 rounded-[12px] border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[12.5px] text-[#c0392b] shadow-lg">
            <span className="flex-1">{message}</span>
            <button type="button" onClick={onClose} className="flex-none cursor-pointer text-[#e3a5a5] hover:text-[#c0392b]">
                <X size={15}/>
            </button>
        </div>,
        document.body,
    );
}
