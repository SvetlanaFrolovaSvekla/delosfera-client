// Модалка "Просмотр и сравнение редакций" — параллельный просмотр
// текста новой и предыдущей редакции ВНД,
// с подсветкой пословных различий между документами.
import React, {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Columns2, Loader2, X} from "lucide-react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {
    RedactionTextView, type RedactionTextViewHandle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {
    getAvailableLanguages, type RedactionLanguage
} from "@/utils/redactionLanguagePanelUtils.ts";
import {useDocxDiffHighlight} from "@/hooks/vndHooks/useDocxDiffHighlight.ts";

interface RedactionCompareModalProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    previousRedaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

const LANG_LABELS: Record<RedactionLanguage, string> = {ru: "RU", kg: "KG", en: "EN"};

interface TextViewReadyState {
    ready: boolean;
    container: HTMLDivElement | null;
}

const NOT_READY: TextViewReadyState = {ready: false, container: null};

/** Опрашивает handle RedactionTextView, пока документ не отрендерится (isReady не даёт события,
 * только императивный метод — поэтому дожидаемся его коротким поллингом), и вместе с готовностью
 * забирает DOM-контейнер. Ref читается только внутри эффекта — не во время рендера. */
function useTextViewReady(
    handleRef: React.RefObject<RedactionTextViewHandle | null>,
    resetKey: string,
): TextViewReadyState {
    const [state, setState] = useState<TextViewReadyState>(NOT_READY);

    useEffect(() => {
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout>;

        const check = () => {
            if (cancelled) return;
            const handle = handleRef.current;
            // @ts-ignore
            if (handle?.isReady()) {
                setState({ready: true, container: handle.getContainer()});
            } else {
                setState(NOT_READY);
                timeoutId = setTimeout(check, 120);
            }
        };
        // Первая проверка тоже асинхронная — не вызываем setState синхронно в теле эффекта
        timeoutId = setTimeout(check, 0);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    return state;
}

export function RedactionCompareModal({
                                          vnd, redaction, previousRedaction, downloadingId, onDownload, onClose,
                                      }: RedactionCompareModalProps) {
    const oldAvailableLanguages = getAvailableLanguages(previousRedaction);
    const newAvailableLanguages = getAvailableLanguages(redaction);

    const [oldLanguage, setOldLanguage] = useState<RedactionLanguage>(oldAvailableLanguages[0] ?? "ru");
    const [newLanguage, setNewLanguage] = useState<RedactionLanguage>(newAvailableLanguages[0] ?? "ru");

    const oldHandleRef = useRef<RedactionTextViewHandle>(null);
    const newHandleRef = useRef<RedactionTextViewHandle>(null);

    const oldState = useTextViewReady(oldHandleRef, `${previousRedaction.id}-${oldLanguage}`);
    const newState = useTextViewReady(newHandleRef, `${redaction.id}-${newLanguage}`);

    const diffStatus = useDocxDiffHighlight(
        oldState.container,
        newState.container,
        oldState.ready,
        newState.ready,
        `${previousRedaction.id}-${oldLanguage}::${redaction.id}-${newLanguage}`,
    );

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-full max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Columns2 size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Просмотр и сравнение редакций
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {diffStatus === "computing" && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                                <Loader2 size={14} className="animate-spin"/>
                                Ищем различия…
                            </div>
                        )}
                        {diffStatus === "unavailable" && (
                            <div className="text-[12px] text-[#a3adbd]">
                                Документы слишком велики или сильно различаются — подсветка недоступна
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-[#eef2f7]">
                    <CompareColumn
                        vnd={vnd}
                        redaction={redaction}
                        label="Новая редакция"
                        labelEmphasis=" (необходимо согласовать)"
                        availableLanguages={newAvailableLanguages}
                        activeLanguage={newLanguage}
                        onLanguageChange={setNewLanguage}
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        textViewRef={newHandleRef}
                    />
                    <CompareColumn
                        vnd={vnd}
                        redaction={previousRedaction}
                        label="Предыдущая редакция"
                        availableLanguages={oldAvailableLanguages}
                        activeLanguage={oldLanguage}
                        onLanguageChange={setOldLanguage}
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        textViewRef={oldHandleRef}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}

function CompareColumn({
                           vnd, redaction, label, labelEmphasis, availableLanguages, activeLanguage,
                           onLanguageChange, downloadingId, onDownload, textViewRef,
                       }: {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    label: string;
    labelEmphasis?: string;
    availableLanguages: RedactionLanguage[];
    activeLanguage: RedactionLanguage;
    onLanguageChange: (lang: RedactionLanguage) => void;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    textViewRef: React.RefObject<RedactionTextViewHandle | null>;
}) {
    return (
        <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3">
                <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-[#1c2740]">{redaction.code}</div>
                    <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                        {label}
                        {labelEmphasis && (
                            <span className="font-bold text-[#1c2740]">{labelEmphasis}</span>
                        )}
                    </div>
                </div>

                {availableLanguages.length > 1 && (
                    <div className="flex flex-none gap-1 rounded-[8px] bg-[#f2f5f9] p-[3px]">
                        {availableLanguages.map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => onLanguageChange(lang)}
                                className="h-7 cursor-pointer rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors"
                                style={
                                    activeLanguage === lang
                                        ? {background: "#fff", color: "#4e57d6", boxShadow: "0 1px 2px rgba(15,27,45,.08)"}
                                        : {color: "#5d616c"}
                                }
                            >
                                {LANG_LABELS[lang]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
                <RedactionTextView
                    ref={textViewRef}
                    vnd={vnd}
                    selected={redaction}
                    activeLanguage={activeLanguage}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                />
            </div>
        </div>
    );
}
