/**
 * Печатная форма записки с листом согласования (SZ-PAP-02). Две версии листа — как у ВНД:
 *   ?mode=signed — "С подписями ЭЦП": в колонке "Подпись" штамп «Подписано с помощью ЭЦП»
 *                  (владелец по сертификату, организация, срок сертификата, время, хэш и
 *                  отпечаток подписи); под таблицей — отпечаток текущего текста записки;
 *   ?mode=paper  — "Для подписи от руки": решения и даты, колонка "Подпись" пустая — лист
 *                  распечатывают и подписывают вживую.
 * &autoprint=1 — сразу открыть диалог печати (кнопка «Распечатать» в карточке записки
 * грузит форму в скрытом окне и печатает, не уводя со страницы).
 * Верстается под A4: экранная обвязка скрыта при печати. Сам лист — SzPrintSheet.
 */
import {useEffect, useRef, useState} from "react";
import {useParams, useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ClipboardCheck, FileDown, FileText, Printer, ShieldCheck} from "lucide-react";
import {
    szPaperService,
    type SzPrintForm,
    type SzPrintMode,
} from "@/service/szService/szPaperService.ts";
import {SZ_PRINT_STYLES, SzPrintSheet} from "@/components/componentsSz/componentsPrint/SzPrintSheet.tsx";
import {downloadSzDocx, downloadSzPdf, waitForSheetAssets} from "@/utils/szProcess/szPrintExport.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {toast} from "@/service/toastService.ts";

export function SzPrintPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const mode: SzPrintMode = searchParams.get("mode") === "paper" ? "paper" : "signed";
    const autoPrint = searchParams.get("autoprint") === "1";
    const [form, setForm] = useState<SzPrintForm | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const printedRef = useRef(false);

    useEffect(() => {
        if (!id) return;
        szPaperService.printForm(Number(id))
            .then(setForm)
            .catch(() => setError("Не удалось сформировать печатную форму"));
    }, [id]);

    // Печать «сразу»: как только лист собран и логотип загрузился — диалог печати.
    useEffect(() => {
        if (!autoPrint || !form || printedRef.current || !sheetRef.current) return;
        printedRef.current = true;
        void waitForSheetAssets(sheetRef.current).then(() => window.print());
    }, [autoPrint, form]);

    if (error) {
        return <div className="p-8 text-[13px] text-[#c0392b]">{error}</div>;
    }
    if (!form) {
        return <div className="p-8 text-[13px] text-[#8b97ab]">Готовим печатную форму…</div>;
    }

    const signed = mode === "signed";

    const switchMode = (next: SzPrintMode) => setSearchParams({mode: next}, {replace: true});

    const download = async (kind: "pdf" | "docx") => {
        setBusy(kind);
        try {
            if (kind === "pdf") await downloadSzPdf(form, mode);
            else await downloadSzDocx(form, mode);
        } catch {
            toast.error(t("szCard.document.downloadError"));
        } finally {
            setBusy(null);
        }
    };

    const toolbarButton = "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#d7dee8] bg-white px-3 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-wait disabled:opacity-60";

    return (
        <div className="bg-[#edecf5] min-h-screen py-6 print:bg-white print:py-0">
            <style>{SZ_PRINT_STYLES}</style>

            <div className="sz-print-hide mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
                <div className="flex items-center gap-1 rounded-[11px] border border-[#d7dee8] bg-white p-1">
                    <button
                        type="button"
                        onClick={() => switchMode("signed")}
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border-none px-3 text-[12.5px] font-semibold ${
                            signed ? "bg-[#ececfc] text-[#4e57d6]" : "bg-transparent text-[#55617a] hover:bg-[#f6f8fb]"}`}
                    >
                        <ShieldCheck size={15}/> С подписями ЭЦП
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode("paper")}
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border-none px-3 text-[12.5px] font-semibold ${
                            !signed ? "bg-[#ececfc] text-[#4e57d6]" : "bg-transparent text-[#55617a] hover:bg-[#f6f8fb]"}`}
                    >
                        <ClipboardCheck size={15}/> Для подписи от руки
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip content={t("szCard.document.pdfHint")} side="bottom">
                        <button type="button" className={toolbarButton} disabled={busy !== null}
                                onClick={() => void download("pdf")}>
                            <FileDown size={15}/> {busy === "pdf" ? t("szCard.document.preparing") : "PDF"}
                        </button>
                    </Tooltip>
                    <Tooltip content={t("szCard.document.docxHint")} side="bottom">
                        <button type="button" className={toolbarButton} disabled={busy !== null}
                                onClick={() => void download("docx")}>
                            <FileText size={15}/> {busy === "docx" ? t("szCard.document.preparing") : "DOCX"}
                        </button>
                    </Tooltip>
                    <Tooltip content={signed
                        ? "В колонке «Подпись» — штамп ЭЦП: владелец, сертификат, время и хэш подписи."
                        : "Решения и даты; колонка «Подпись» пустая — распечатайте и подпишите."} side="bottom">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex h-10 items-center gap-1.5 px-4 rounded-[10px] border-none bg-[#2f68f5] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06]"
                        >
                            <Printer size={15}/> Печать
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div ref={sheetRef}>
                <SzPrintSheet form={form} mode={mode}/>
            </div>
        </div>
    );
}
