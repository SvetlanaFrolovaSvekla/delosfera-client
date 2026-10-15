// «Скачать / печать» в шапке карточки СЗ: записка с листом согласования — в PDF, в Word
// (DOCX) или сразу на принтер, в выбранной версии листа (с ЭЦП / для подписи от руки).
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, ClipboardCheck, Download, FileDown, FileText, Printer, ShieldCheck} from "lucide-react";

import {szPaperService, type SzPrintMode} from "@/service/szService/szPaperService.ts";
import {downloadSzDocx, downloadSzPdf, printSz} from "@/utils/szProcess/szPrintExport.tsx";
import {toast} from "@/service/toastService.ts";
import {szButtonClass} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

type Action = "pdf" | "docx" | "print";

interface SzDocumentMenuProps {
    szId: number;
}

export function SzDocumentMenu({szId}: SzDocumentMenuProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<SzPrintMode>("signed");
    const [busy, setBusy] = useState<Action | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Закрытие по клику мимо и по Esc.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const run = async (action: Action) => {
        setBusy(action);
        try {
            if (action === "print") {
                await printSz(szId, mode);
            } else {
                // Форма берётся свежая: в файл идут текущие визы и подписи.
                const form = await szPaperService.printForm(szId);
                if (action === "pdf") await downloadSzPdf(form, mode);
                else await downloadSzDocx(form, mode);
            }
            setOpen(false);
        } catch {
            toast.error(t(action === "print" ? "szCard.document.printError" : "szCard.document.downloadError"));
        } finally {
            setBusy(null);
        }
    };

    const modes: Array<{ id: SzPrintMode; icon: typeof ShieldCheck; label: string }> = [
        {id: "signed", icon: ShieldCheck, label: t("szCard.document.signed")},
        {id: "paper", icon: ClipboardCheck, label: t("szCard.document.paper")},
    ];

    const actions: Array<{ id: Action; icon: typeof FileDown; label: string; hint: string }> = [
        {id: "pdf", icon: FileDown, label: t("szCard.document.pdf"), hint: t("szCard.document.pdfHint")},
        {id: "docx", icon: FileText, label: t("szCard.document.docx"), hint: t("szCard.document.docxHint")},
        {id: "print", icon: Printer, label: t("szCard.document.print"), hint: t("szCard.document.printHint")},
    ];

    return (
        <div ref={rootRef} className="relative">
            <Tooltip content={t("szCard.document.menuHint")} side="bottom" disabled={open}>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={`${szButtonClass("muted")} gap-1.5`}
                    aria-haspopup="menu"
                    aria-expanded={open}
                >
                    <Download size={15}/>
                    {t("szCard.document.menu")}
                    <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`}/>
                </button>
            </Tooltip>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] z-40 w-[290px] rounded-[12px] border border-[#e5e9f0] bg-white p-2 shadow-[0_14px_36px_-10px_rgba(15,27,45,.28)]"
                >
                    <div className="px-1.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[.05em] text-[#8b97ab]">
                        {t("szCard.document.version")}
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-[10px] bg-[#f4f6fa] p-1">
                        {modes.map(({id, icon: Icon, label}) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setMode(id)}
                                className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-none px-2 text-[12px] font-semibold ${
                                    mode === id ? "bg-white text-[#2f68f5] shadow-[0_1px_3px_rgba(15,27,45,.12)]" : "bg-transparent text-[#55617a] hover:text-[#2f68f5]"}`}
                            >
                                <Icon size={14}/> {label}
                            </button>
                        ))}
                    </div>

                    {actions.map(({id, icon: Icon, label, hint}) => (
                        <Tooltip key={id} content={hint} side="left" className="w-full">
                            <button
                                type="button"
                                role="menuitem"
                                disabled={busy !== null}
                                onClick={() => void run(id)}
                                className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-none bg-transparent px-2 text-left text-[13px] font-medium text-[#26324a] hover:bg-[#f6f8fb] disabled:cursor-wait disabled:opacity-60"
                            >
                                <Icon size={16} className="text-[#55617a]"/>
                                <span className="flex-1">{busy === id ? t("szCard.document.preparing") : label}</span>
                            </button>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );
}
