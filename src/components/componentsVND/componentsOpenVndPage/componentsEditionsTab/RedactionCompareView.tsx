import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import {FileText} from "lucide-react";

interface RedactionCompareViewProps {
    vnd: VndResponse;
    selected: VndRedactionResponse;
    compareTarget: VndRedactionResponse | undefined;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
}

export function RedactionCompareView({
                                         vnd,
                                         selected,
                                         compareTarget,
                                         downloadingId,
                                         onDownload,
                                     }: RedactionCompareViewProps) {
    return (
        <div className="grid min-h-[200px] grid-cols-2">
            <CompareColumn
                variant="neutral"
                vnd={vnd}
                redaction={compareTarget}
                downloadingId={downloadingId}
                onDownload={onDownload}
                emptyLabel="Нет данных для сравнения"
            />
            <CompareColumn
                variant="current"
                vnd={vnd}
                redaction={selected}
                downloadingId={downloadingId}
                onDownload={onDownload}
            />
        </div>
    );
}

const VARIANT_STYLES = {
    neutral: {
        wrapper: "border-r border-[#eef2f7]",
        label: "text-[#a3adbd]",
        link: "text-[#4e57d6]",
    },
    current: {
        wrapper: "bg-[#f6faf7]",
        label: "text-[#1c7a4d]",
        link: "text-[#1c7a4d]",
    },
} as const;

function CompareColumn({
                           variant,
                           vnd,
                           redaction,
                           downloadingId,
                           onDownload,
                           emptyLabel,
                       }: {
    variant: keyof typeof VARIANT_STYLES;
    vnd: VndResponse;
    redaction: VndRedactionResponse | undefined;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    emptyLabel?: string;
}) {
    const styles = VARIANT_STYLES[variant];

    return (
        <div className={`p-[16px_20px] ${styles.wrapper}`}>
            <div className={`mb-[10px] text-[11px] font-bold uppercase tracking-[0.04em] ${styles.label}`}>
                {redaction ? redaction.code : "—"}
            </div>
            {redaction ? (
                <button
                    type="button"
                    disabled={downloadingId === redaction.docFileRuId}
                    onClick={() => onDownload(redaction.docFileRuId, buildRedactionFileName(redaction.code, vnd.name, "ru"))}
                    className={`inline-flex items-center gap-2 text-[13px] hover:underline disabled:opacity-60 ${styles.link}`}
                >
                    <FileText size={15}/> Открыть документ (RU)
                </button>
            ) : (
                <p className="text-[13px] text-[#8b97ab]">{emptyLabel}</p>
            )}
        </div>
    );
}