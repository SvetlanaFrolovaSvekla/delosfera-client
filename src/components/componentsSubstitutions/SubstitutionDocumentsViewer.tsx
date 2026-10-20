// Просмотр печатных форм заявки на замещение — общий для страницы «Печатные формы приказа/договора МО»
// и для модалки просмотра (глазик в блоке «Подписание документов», как лист согласования у ВНД):
//   верхние табы — какой документ: «Приказ о временном возложении обязанностей» /
//                  «Договор о полной материальной ответственности»;
//   ниже — версия: «С подписями ЭЦП» (действующая версия с листом подписей ЭЦП) /
//                  «Для подписи от руки» (тот же зафиксированный файл без листа);
//   справа — PDF, DOCX и печать. Документ — .docx с сервера, показывается постранично (A4).
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {renderAsync} from "docx-preview";
import {
    ClipboardCheck,
    FileDown,
    FileSignature, FileText,
    Loader2,
    Printer,
    ScrollText,
    ShieldCheck
} from "lucide-react";
import {
    saveBlob,
    substitutionService,
    type SubstitutionPrintForm,
    type SubstitutionPrintMode,
    type SubstitutionSigningState,
} from "@/service/substitutionService/substitutionService.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {toast} from "@/service/toastService.ts";
import {toolbarButton} from "@/constants/printToolbarButton.ts";

export const SUB_DOCX_CLASS = "sub-docx";

/**
 * Страницы документа — листы A4 с тенью; при печати — без обвязки, каждая с новой страницы.
 * Размеры и поля по умолчанию — для документов, зафиксированных без параметров страницы
 * (docx-preview тогда растягивал текст на всю ширину окна без полей); если параметры в файле
 * есть, docx-preview задаёт их инлайн-стилем, и они важнее.
 */
export const SUB_DOCX_STYLES = `
.${SUB_DOCX_CLASS}-wrapper { background: transparent !important; padding: 8px 0 24px !important; }
.${SUB_DOCX_CLASS}-wrapper > section.${SUB_DOCX_CLASS} {
  width: 210mm; min-height: 297mm; padding: 20mm 15mm 20mm 30mm; box-sizing: border-box;
  margin: 0 auto 18px !important; background: #fff;
  box-shadow: 0 10px 30px -14px rgba(15,27,45,.35) !important;
}
.${SUB_DOCX_CLASS}-wrapper table td { vertical-align: top; }
/* Модалка просмотра: белые листы на нейтральной серой подложке, с лёгкой тенью. */
.sub-docx-flat .${SUB_DOCX_CLASS}-wrapper { padding: 0 !important; }
.sub-docx-flat .${SUB_DOCX_CLASS}-wrapper > section.${SUB_DOCX_CLASS} {
  margin: 0 auto 14px !important; border: 1px solid #e3e7ee;
  box-shadow: 0 4px 14px -8px rgba(15,27,45,.25) !important;
}
.sub-docx-flat .${SUB_DOCX_CLASS}-wrapper > section.${SUB_DOCX_CLASS}:last-child { margin-bottom: 0 !important; }
@media print {
  @page { size: A4; margin: 0; }
  .sub-print-hide { display: none !important; }
  .${SUB_DOCX_CLASS}-wrapper { padding: 0 !important; }
  .${SUB_DOCX_CLASS}-wrapper > section.${SUB_DOCX_CLASS} { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
  .${SUB_DOCX_CLASS}-wrapper > section.${SUB_DOCX_CLASS}:last-child { page-break-after: auto; break-after: auto; }
}
`;

interface Props {
    requestId: number;
    form: SubstitutionPrintForm;
    mode: SubstitutionPrintMode;
    onFormChange: (form: SubstitutionPrintForm) => void;
    onModeChange: (mode: SubstitutionPrintMode) => void;
    /** Номер заявки — для имён файлов. */
    regNumber?: string | null;
    /** Как печатать: на странице — window.print(); в модалке — открыть страницу печати. */
    onPrint: () => void;
    /** Сразу открыть диалог печати, как только документ отрисован (страница с ?autoprint=1). */
    autoPrint?: boolean;
    /** Внутренняя прокрутка (модалка) или прокрутка страницы. */
    scrollable?: boolean;
}

export function SubstitutionDocumentsViewer({
    requestId, form, mode, onFormChange, onModeChange, regNumber, onPrint, autoPrint, scrollable,
}: Props) {
    const {t} = useTranslation();
    const [signing, setSigning] = useState<SubstitutionSigningState | null>(null);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const printedRef = useRef(false);

    useEffect(() => {
        substitutionService.signingState(requestId).then(setSigning).catch(() => setSigning(null));
    }, [requestId]);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);
        setBlob(null);
        substitutionService.printBlob(requestId, form, mode === "signed")
            .then(async (b) => {
                if (cancelled || !containerRef.current) return;
                setBlob(b);
                containerRef.current.innerHTML = "";
                await renderAsync(b, containerRef.current, undefined, {
                    className: SUB_DOCX_CLASS,
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    experimental: true,
                });
            })
            .catch(() => {
                if (!cancelled) setError(t("substitutionCard.printPage.loadError"));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [requestId, form, mode, t]);

    useEffect(() => {
        if (!autoPrint || loading || error || printedRef.current) return;
        printedRef.current = true;
        setTimeout(() => window.print(), 300);
    }, [autoPrint, loading, error]);

    const signed = mode === "signed";
    const current = signing?.documents.find((d) => d.isCurrent && d.kind === (form === "order" ? "Order" : "Liability"));
    const frozen = !!current;
    const number = regNumber ?? `#${requestId}`;
    const title = t(`substitutionCard.printPage.${form}`);
    const baseName = `${form === "order" ? "Приказ о возложении обязанностей" : "Договор о матответственности"} ${number}`
        + (signed && frozen ? " (с подписями ЭЦП)" : "");

    const downloadDocx = () => {
        if (!blob) return;
        try {
            saveBlob(blob, `${baseName}.docx`);
            toast.success(t("substitutionCard.printPage.toast.docxDownloaded"), `${baseName}.docx`);
        } catch {
            toast.error(t("substitutionCard.printPage.downloadFailed"));
        }
    };

    // Печать: на странице — диалог печати браузера, в модалке — страница печатной формы в новой вкладке.
    const print = () => {
        toast.info(t(scrollable ? "substitutionCard.printPage.toast.printNewTab" : "substitutionCard.printPage.toast.printOpening"),
            `${title} · ${signed ? t("substitutionCard.printPage.signed") : t("substitutionCard.printPage.paper")}`);
        onPrint();
    };

    const downloadPdf = async () => {
        const root = containerRef.current;
        if (!root) return;
        setBusy("pdf");
        // PDF собирается в браузере постранично — это заметно по времени, поэтому сначала «Готовим…».
        const pending = toast.loading(t("substitutionCard.printPage.toast.pdfPreparing"), title);
        try {
            const [{default: html2canvas}, {jsPDF}] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
            const pages = Array.from(root.querySelectorAll<HTMLElement>(`section.${SUB_DOCX_CLASS}`));
            if (pages.length === 0) throw new Error("empty");
            const pdf = new jsPDF({unit: "mm", format: "a4", orientation: "portrait", compress: true});
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const shadow = page.style.boxShadow;
                page.style.boxShadow = "none";
                const canvas = await html2canvas(page, {scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false});
                page.style.boxShadow = shadow;
                const h = Math.min(297, (canvas.height / canvas.width) * 210);
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, h);
            }
            pdf.setProperties({title, subject: number});
            saveBlob(pdf.output("blob"), `${baseName}.pdf`);
            toast.update(pending, {
                variant: "success", title: t("substitutionCard.printPage.toast.pdfDownloaded"),
                description: `${baseName}.pdf`, duration: 4500,
            });
        } catch {
            toast.update(pending, {
                variant: "error", title: t("substitutionCard.printPage.downloadFailed"), description: undefined, duration: 4500,
            });
        } finally {
            setBusy(null);
        }
    };

    // Голубые акценты, как у кнопок скачивания листа согласования ВНД.
    // Модалка просмотра — голубые акценты; страница печатных форм — прежние фиолетовые, как у СЗ.
    const accent = scrollable ? "blue" : "indigo";

    return (
        <div className={`flex flex-col ${scrollable ? "min-h-0 flex-1" : ""}`}>
            <style>{SUB_DOCX_STYLES}</style>

            <div className="sub-print-hide flex-none">
                {/* Какой документ */}
                <Tabs<SubstitutionPrintForm>
                    className="mb-1"
                    accent={accent}
                    value={form}
                    onChange={onFormChange}
                    tabs={[
                        {id: "order", label: t("substitutionCard.printPage.order"), icon: <ScrollText size={15}/>},
                        {id: "liability", label: t("substitutionCard.printPage.liability"), icon: <FileSignature size={15}/>},
                    ]}
                />

                {/* Какая версия — сегмент-переключатель, справа скачивание и печать */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="mb-2 flex items-center gap-1 rounded-[11px] border border-[#d7dee8] bg-white p-1">
                        {([
                            {id: "signed", icon: <ShieldCheck size={15}/>, label: t("substitutionCard.printPage.signed")},
                            {id: "paper", icon: <ClipboardCheck size={15}/>, label: t("substitutionCard.printPage.paper")},
                        ] as const).map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => onModeChange(o.id)}
                                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border-none px-3 text-[12.5px] font-semibold ${
                                    mode === o.id
                                        ? (scrollable ? "bg-[#e9f0ff] text-[#2f68f5]" : "bg-[#ececfc] text-[#4e57d6]")
                                        : "bg-transparent text-[#55617a] hover:bg-[#f6f8fb]"}`}
                            >
                                {o.icon} {o.label}
                            </button>
                        ))}
                    </div>
                    <div className="mb-2 flex items-center gap-2">

                        <Tooltip content={t("substitutionCard.printPage.pdfHint")} side="bottom">
                            <button type="button" className={toolbarButton} disabled={busy !== null || loading || !!error}
                                    onClick={() => void downloadPdf()}>
                                {busy === "pdf" ? <Loader2 size={15} className="animate-spin"/> : <FileDown size={15}/>} PDF
                            </button>
                        </Tooltip>

                        <Tooltip content={t("substitutionCard.printPage.docxHint")} side="bottom">
                            <button type="button" className={toolbarButton} disabled={!blob} onClick={downloadDocx}>
                                <FileText size={15}/> DOCX
                            </button>
                        </Tooltip>

                        <button type="button" onClick={print} disabled={loading || !!error}
                                className="inline-flex h-10 items-center gap-1.5 px-4
                            rounded-[10px] border-none bg-[#2f68f5] text-white font-semibold
                            text-[13px] cursor-pointer hover:brightness-[1.06]"
                        >
                            <Printer size={15}/> {t("substitutionCard.printPage.print")}
                        </button>
                    </div>
                </div>
                <div className="pt-2 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                    {signing && !frozen
                        ? t("substitutionCard.printPage.notFrozenHint")
                        : signed ? t("substitutionCard.printPage.signedHint") : t("substitutionCard.printPage.paperHint")}
                </div>
            </div>

            <div className={`mt-3 ${scrollable ? "sub-docx-flat min-h-0 flex-1 overflow-auto rounded-[12px] bg-[#f1f3f7] p-4" : ""}`}>
                {loading && (
                    <div className="sub-print-hide flex items-center justify-center gap-2 py-10 text-[13px] text-[#8b97ab]">
                        <Loader2 size={16} className="animate-spin"/> {t("substitutionCard.printPage.loading")}
                    </div>
                )}
                {error && <div className="sub-print-hide p-8 text-center text-[13px] text-[#c0392b]">{error}</div>}
                <div ref={containerRef} className={error ? "hidden" : ""}/>
            </div>
        </div>
    );
}
