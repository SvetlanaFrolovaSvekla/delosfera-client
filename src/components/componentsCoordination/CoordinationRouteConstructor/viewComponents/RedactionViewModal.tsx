// Модалка "Просмотр редакции" (одиночно)
import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {
    RedactionTextView, type RedactionTextViewHandle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {
    RedactionContentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionContentsPanel.tsx";
import {
    getAvailableLanguages, type RedactionLanguage, type RedactionViewTarget
} from "@/utils/redactionLanguagePanelUtils.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Download, FileText, ListTree, Loader2, X} from "lucide-react";

interface RedactionViewModalProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    /* Вкладка, с которой модалка откроется - язык или ТИД. Если не передана, недоступна у этой
     редакции, или это "tid", а ТИД у редакции нет - используется первый доступный язык. */
    initialLanguage?: RedactionViewTarget;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

const LANG_LABELS: Record<RedactionViewTarget, string> = {ru: "RU", kg: "KG", en: "EN", tid: "ТИД"};

const LANG_FILE_KEYS: Record<RedactionLanguage, "docFileRuId" | "docFileKgId" | "docFileEnId"> = {
    ru: "docFileRuId",
    kg: "docFileKgId",
    en: "docFileEnId",
};

export function RedactionViewModal({
                                       vnd, redaction, initialLanguage, downloadingId, onDownload, onClose,
                                   }: RedactionViewModalProps) {
    const availableLanguages = getAvailableLanguages(redaction);
    // ТИД доступен как отдельная "вкладка" просмотра наравне с языками, только если у редакции
    // вообще есть файл ТИД.
    const availableViews: RedactionViewTarget[] = redaction.tidFileId !== null
        ? [...availableLanguages, "tid"]
        : availableLanguages;
    const [activeLanguage, setActiveLanguage] = useState<RedactionViewTarget>(
        initialLanguage && availableViews.includes(initialLanguage)
            ? initialLanguage
            : availableLanguages[0] ?? "ru"
    );
    const textViewRef = useRef<RedactionTextViewHandle>(null);

    // Панель "Содержание" (заголовки документа, построенные из стилей Word) - как и в основной
    // вкладке "Редакции" (VndEditionsTab), открывается/закрывается кнопкой рядом со скачиванием.
    const [contentsOpen, setContentsOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    useEffect(() => {
        setSearchQuery("");
    }, [activeLanguage, redaction.id]);

    const activeFileId = activeLanguage === "tid"
        ? redaction.tidFileId
        : redaction[LANG_FILE_KEYS[activeLanguage]] as number | null;

    const handleDownloadActive = () => {
        if (activeFileId === null) return;
        const name = activeLanguage === "tid"
            ? `${redaction.code}_ТИД.docx`
            : buildRedactionFileName(redaction.code, vnd.name, activeLanguage);
        onDownload(activeFileId, name);
    };

    // @ts-ignore
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div
                className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center gap-4 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex flex-none items-center gap-3 min-w-0">
                        <span
                            className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <FileText size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {redaction.code}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                Просмотр редакции
                            </div>
                        </div>
                    </div>

                    {/* растягивается и занимает всё свободное место между заголовком и кнопками */}
                    <div className="min-w-0 flex-1">
                        <SearchBar
                            variant="white"
                            placeholder="Поиск по тексту редакции…"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onSubmit={() => textViewRef.current?.goNext()}
                        />
                    </div>

                    <div className="flex flex-none items-center gap-4">
                        {availableViews.length > 1 && (
                            <div className="flex flex-none gap-1 rounded-[8px] bg-[#f2f5f9] p-[3px]">
                                {availableViews.map((lang) => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => setActiveLanguage(lang)}
                                        className="h-7 cursor-pointer rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors"
                                        style={
                                            activeLanguage === lang
                                                ? {
                                                    background: "#fff",
                                                    color: "#4e57d6",
                                                    boxShadow: "0 1px 2px rgba(15,27,45,.08)"
                                                }
                                                : {color: "#5d616c"}
                                        }
                                    >
                                        {LANG_LABELS[lang]}
                                    </button>
                                ))}
                            </div>
                        )}

                        <Tooltip content="Содержание документа" side="bottom">
                            <button
                                type="button"
                                onClick={() => setContentsOpen((v) => !v)}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border transition-colors"
                                style={
                                    contentsOpen
                                        ? {borderColor: "#4e57d6", background: "#ececfc", color: "#4e57d6"}
                                        : {borderColor: "#d7dee8", background: "#fff", color: "#3a4560"}
                                }
                            >
                                <ListTree size={16}/>
                            </button>
                        </Tooltip>

                        <Tooltip content="Скачать документ" side="bottom">
                            <button
                                type="button"
                                disabled={activeFileId === null || downloadingId === activeFileId}
                                onClick={handleDownloadActive}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === activeFileId ? (
                                    <Loader2 size={16} className="animate-spin"/>
                                ) : (
                                    <Download size={16}/>
                                )}
                            </button>
                        </Tooltip>

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-6 py-4">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <RedactionTextView
                            ref={textViewRef}
                            vnd={vnd}
                            selected={redaction}
                            activeLanguage={activeLanguage}
                            downloadingId={downloadingId}
                            onDownload={onDownload}
                            searchQuery={searchQuery}
                            onClearSearch={() => setSearchQuery("")}
                        />
                    </div>

                    {contentsOpen && (
                        <div className="w-[280px] flex-none">
                            <RedactionContentsPanel
                                fileId={activeFileId}
                                getContainer={() => textViewRef.current?.getContainer() ?? null}
                                onClose={() => setContentsOpen(false)}
                                maxHeightClass="h-full"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}