// Карточки при наведении на ссылку в тексте редакции:
// - VndLinkHoverCard - ссылка, прикреплённая к фрагменту (useDocxLinkMarks): на какой документ
//   ведёт (или какой документ ссылается на этот фрагмент);
// - LegacyLinkHoverCard - гиперссылка db://documents/{код} или db://attachments/{n} из текста
//   (useDocxLegacyLinks), выглядит так же, чтобы старые и новые ссылки не отличались.
// Позиционируются fixed над ссылкой (или под ней, если сверху не хватает места).
import type {ReactNode} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {ArrowUpRight, CornerDownRight, Eye, Download, FileText, Link2, Loader2, Paperclip, TriangleAlert} from "lucide-react";
import type {DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import type {LegacyLinkHover} from "@/hooks/vndHooks/useDocxLegacyLinks.ts";
import {isPreviewableFile} from "@/utils/downloadFiles/fileNaming.ts";
import {LINK_STATUS_STYLES, shortFragment} from "./vndLinkUi.ts";

const CARD_WIDTH = 340;

function HoverCardShell({rect, estimatedHeight, children}: { rect: DOMRect; estimatedHeight: number; children: ReactNode }) {
    const above = rect.top > estimatedHeight + 16;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - CARD_WIDTH / 2), window.innerWidth - CARD_WIDTH - 8);
    const style = above
        ? {left, top: rect.top - 8, transform: "translateY(-100%)"}
        : {left, top: rect.bottom + 8};

    return createPortal(
        <div
            className="pointer-events-none fixed z-[70] rounded-[12px] border border-[#e5e9f0] bg-white px-3.5 py-3 shadow-[0_10px_30px_rgba(20,25,40,0.16)]"
            style={{...style, width: CARD_WIDTH}}
        >
            {children}
        </div>,
        document.body,
    );
}

function CardHeader({icon, tone = "indigo", children}: { icon: ReactNode; tone?: "indigo" | "emerald" | "muted"; children: ReactNode }) {
    const color = tone === "indigo" ? "text-[#4e57d6]" : tone === "emerald" ? "text-emerald-700" : "text-[#8b97ab]";
    return (
        <div className={`mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] ${color}`}>
            {icon}
            {children}
        </div>
    );
}

function DocumentLine({code, status, title}: { code: string; status: string; title: string }) {
    const {t} = useTranslation();
    return (
        <>
            <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] font-semibold text-[#2c3446]">{code}</span>
                {status && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${LINK_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500"}`}>
                        {t(`openVndPage.linksTab.statuses.${status}`, {defaultValue: status})}
                    </span>
                )}
            </div>
            {title && <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[#55617a]">{title}</div>}
        </>
    );
}

function CardFooter({icon, children}: { icon: ReactNode; children: ReactNode }) {
    return (
        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-[#a3adbd]">
            {icon}
            {children}
        </div>
    );
}

interface VndLinkHoverCardProps {
    marks: DocLinkMark[];
    rect: DOMRect;
    clickable?: boolean;
}

export function VndLinkHoverCard({marks, rect, clickable = true}: VndLinkHoverCardProps) {
    const {t} = useTranslation();
    return (
        <HoverCardShell rect={rect} estimatedHeight={64 + marks.length * 58}>
            {marks.map((m, i) => (
                <div key={`${m.side}-${m.linkId}`} className={i > 0 ? "mt-2.5 border-t border-[#eef2f7] pt-2.5" : ""}>
                    <CardHeader
                        tone={m.side === "source" ? "indigo" : "emerald"}
                        icon={m.side === "source" ? <Link2 size={12} strokeWidth={2.2}/> : <CornerDownRight size={12} strokeWidth={2.2}/>}
                    >
                        {m.side === "source" ? t("openVndPage.linkMarks.outgoingTitle") : t("openVndPage.linkMarks.incomingTitle")}
                    </CardHeader>
                    <DocumentLine code={m.other.code} status={m.other.status} title={m.other.title}/>
                    {m.side === "source" && m.targetFragment && (
                        <div className="mt-1 text-[11.5px] italic text-[#8b97ab]">
                            {t("openVndPage.linkMarks.toFragment", {fragment: shortFragment(m.targetFragment, 70)})}
                        </div>
                    )}
                </div>
            ))}
            {clickable && (
                <CardFooter icon={<ArrowUpRight size={12} strokeWidth={2}/>}>
                    {marks[0]?.side === "source"
                        ? t("openVndPage.linkMarks.clickToOpenTarget")
                        : t("openVndPage.linkMarks.clickToOpenSource")}
                </CardFooter>
            )}
        </HoverCardShell>
    );
}

export function LegacyLinkHoverCard({hover, rect}: { hover: LegacyLinkHover; rect: DOMRect }) {
    const {t} = useTranslation();

    if (hover.type === "documents") {
        return (
            <HoverCardShell rect={rect} estimatedHeight={130}>
                <CardHeader icon={<Link2 size={12} strokeWidth={2.2}/>} tone={hover.info || hover.pending ? "indigo" : "muted"}>
                    {t("openVndPage.linkMarks.outgoingTitle")}
                </CardHeader>
                {hover.info ? (
                    <>
                        <DocumentLine code={hover.info.code} status={hover.info.status} title={hover.info.title}/>
                        <CardFooter icon={<ArrowUpRight size={12} strokeWidth={2}/>}>
                            {t("openVndPage.linkMarks.clickToOpenTargetNewTabHint")}
                        </CardFooter>
                    </>
                ) : hover.pending ? (
                    <div className="flex items-center gap-2 text-[12.5px] text-[#8b97ab]">
                        <Loader2 size={13} className="animate-spin"/>
                        {t("openVndPage.linkMarks.resolving", {code: hover.code})}
                    </div>
                ) : (
                    <div className="flex items-start gap-2 text-[12.5px] text-[#c0392b]">
                        <TriangleAlert size={14} className="mt-[1px] flex-none"/>
                        {t("openVndPage.linkMarks.documentNotFound", {code: hover.code})}
                    </div>
                )}
            </HoverCardShell>
        );
    }

    const previewable = hover.info ? isPreviewableFile(hover.info.fileName) : false;
    return (
        <HoverCardShell rect={rect} estimatedHeight={110}>
            <CardHeader icon={<Paperclip size={12} strokeWidth={2.2}/>} tone={hover.info || hover.pending ? "indigo" : "muted"}>
                {t("openVndPage.linkMarks.attachmentTitle", {index: hover.index})}
            </CardHeader>
            {hover.info ? (
                <>
                    <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#2c3446]">
                        <FileText size={14} strokeWidth={1.8} className="flex-none text-[#8b97ab]"/>
                        <span className="line-clamp-2">{hover.info.fileName}</span>
                    </div>
                    <CardFooter icon={previewable ? <Eye size={12} strokeWidth={2}/> : <Download size={12} strokeWidth={2}/>}>
                        {previewable ? t("openVndPage.linkMarks.clickToPreview") : t("openVndPage.linkMarks.clickToDownload")}
                    </CardFooter>
                </>
            ) : hover.pending ? (
                <div className="flex items-center gap-2 text-[12.5px] text-[#8b97ab]">
                    <Loader2 size={13} className="animate-spin"/>
                    {t("openVndPage.linkMarks.resolvingAttachment")}
                </div>
            ) : (
                <div className="flex items-start gap-2 text-[12.5px] text-[#c0392b]">
                    <TriangleAlert size={14} className="mt-[1px] flex-none"/>
                    {t("openVndPage.linkMarks.attachmentNotFound", {index: hover.index})}
                </div>
            )}
        </HoverCardShell>
    );
}
