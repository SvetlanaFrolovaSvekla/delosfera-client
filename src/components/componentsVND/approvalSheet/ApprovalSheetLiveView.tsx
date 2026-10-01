// Просмотр и скачивание Листа согласования процесса в двух режимах - "Обычный" (решения без
// подписей) и "С подписями ЭЦП" (штамп в колонке "Подпись"). Лист формируется бэком на каждый
// запрос по текущим решениям (см. approvalSheetLive.ts), поэтому всегда актуален.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {AlertTriangle, ClipboardCheck, Download, Loader2, ShieldCheck} from "lucide-react";
import {useCanExportVnd, NO_EXPORT_VND_HINT} from "@/hooks/vndHooks/useCanExportVnd.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";
import {
    approvalSheetEndpoint, approvalSheetPathSuffix, downloadApprovalSheet, type ApprovalSheetMode,
} from "@/service/vndService/approvalSheetLive.ts";

interface ApprovalSheetLiveViewProps {
    vndId: number;
    processId: number;
    /** Код редакции - для имени файла, если сервер не пришлёт своё. */
    redactionCode: string;
    initialMode?: ApprovalSheetMode;
}

export function ApprovalSheetLiveView({vndId, processId, redactionCode, initialMode = "plain"}: ApprovalSheetLiveViewProps) {
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();
    const [mode, setMode] = useState<ApprovalSheetMode>(initialMode);
    const [downloading, setDownloading] = useState(false);

    const {containerRef, loading, error} = useDocxPreview(processId, {
        endpoint: approvalSheetEndpoint(vndId),
        pathSuffix: approvalSheetPathSuffix(mode),
    });

    const fallbackName = mode === "signed"
        ? `${redactionCode}_Лист_согласования_ЭЦП.docx`
        : `${redactionCode}_Лист_согласования.docx`;

    const download = async () => {
        setDownloading(true);
        try {
            await downloadApprovalSheet(vndId, processId, mode, fallbackName);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-none flex-wrap items-end justify-between gap-3 px-6">
                <Tabs<ApprovalSheetMode>
                    className="mb-0"
                    value={mode}
                    onChange={setMode}
                    tabs={[
                        {id: "plain", label: t("approvalSheetLive.modePlain"), icon: <ClipboardCheck size={15}/>},
                        {id: "signed", label: t("approvalSheetLive.modeSigned"), icon: <ShieldCheck size={15}/>},
                    ]}
                />
                <button
                    type="button"
                    onClick={() => void download()}
                    disabled={!canExportVnd || downloading || loading}
                    title={canExportVnd ? undefined : NO_EXPORT_VND_HINT}
                    className="mb-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] border border-[#d7dee8] bg-white px-3.5 text-[12.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {downloading ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
                    {mode === "signed" ? t("approvalSheetLive.downloadSigned") : t("approvalSheetLive.downloadPlain")}
                </button>
            </div>
            <div className="flex-none px-6 pt-2 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                {mode === "signed" ? t("approvalSheetLive.hintSigned") : t("approvalSheetLive.hintPlain")}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                        <Loader2 size={22} className="animate-spin text-[#c3ccd8]"/>
                        {t("approvalSheetLive.loading")}
                    </div>
                )}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#c0392b]">
                        <AlertTriangle size={22}/>
                        {t("approvalSheetLive.loadError")}
                    </div>
                )}
                <div
                    ref={containerRef}
                    className="docx-preview-wrapper docx-preview-fit mx-auto max-w-[1700px]"
                    style={{display: loading || error ? "none" : "block"}}
                />
            </div>
        </div>
    );
}
