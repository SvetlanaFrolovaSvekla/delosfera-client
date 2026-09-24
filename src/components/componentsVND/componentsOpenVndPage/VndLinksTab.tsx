// Вкладка «Связанные документы» открытого ВНД.
//
// - «Ссылки на документы» - на какие ВНД ссылается этот документ. Сверху - вкладки по
//   редакциям: «Все», «Общие» (ссылки без упоминания в тексте) и Р1, Р2, ... - какие ссылки
//   упоминаются в тексте именно этой редакции (как прикреплённые к фрагменту вручную, так и
//   гиперссылки db://documents/{код} из текста, перенесённые из isrib, - "из текста").
// - «Ссылающиеся документы» - какие ВНД ссылаются на этот, и в какой их редакции.
//
// Строки сгруппированы по документу на другом конце связи; под документом - где именно
// упоминается ссылка. Лупа у упоминания открывает вкладку «Редакции» (этого или другого
// документа) на нужной редакции/языке и прокручивает к месту ссылки.
import {useMemo, useState, type ReactNode} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {
    AddVndLinkRequest, VndAttachmentLinkItem, VndLinkItem, VndResponse,
} from "@/service/vndService/vndServiceType.ts";
import {useVndLinks} from "@/hooks/vndHooks/useVndLinks.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {isRedactionVisibleToRegularUser} from "@/utils/vndProcess/redactionStatus.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {toast} from "@/service/toastService.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {VndAddLinkWizard} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/VndAddLinkWizard.tsx";
import {
    languageShortLabel, LINK_STATUS_STYLES, shortFragment,
} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/vndLinkUi.ts";
import type {DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import {anchorLanguage, buildLinkFocusUrl, type VndLinkSide} from "@/utils/vndProcess/vndLinkNavigation.ts";
import type {RedactionLanguage} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {
    ArrowUpRight, ChevronRight, CornerDownRight, Download, Eye, FileText, FileX, Link2, Loader2, Paperclip, Plus, Search,
    Sparkles, TextSelect, X,
} from "lucide-react";
import {isPreviewableFile} from "@/utils/downloadFiles/fileNaming.ts";
import {AttachmentDocxPreviewModal} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";

interface VndLinksTabProps {
    vnd: VndResponse;
    /** Показать место ссылки в тексте ЭТОГО документа (переключает страницу на «Редакции»). */
    onShowInText: (linkId: number, side: VndLinkSide) => void;
    /** Показать в тексте ЭТОГО документа ссылку на вложение db://attachments/{index}. */
    onShowAttachmentInText?: (redactionId: number, index: number, language: string | null) => void;
}

type SubTab = "outgoing" | "incoming";
/** Фильтр по редакции для «Ссылок на документы»: все, только общие (без упоминания в тексте)
 * или id конкретной редакции. */
type RedactionFilter = "all" | "general" | number;

interface DocGroup {
    vndId: number;
    code: string;
    title: string;
    status: string;
    links: VndLinkItem[];
}

function groupByDocument(links: VndLinkItem[]): DocGroup[] {
    const groups = new Map<number, DocGroup>();
    for (const link of links) {
        let group = groups.get(link.vndId);
        if (!group) {
            group = {vndId: link.vndId, code: link.code, title: link.title, status: link.status, links: []};
            groups.set(link.vndId, group);
        }
        group.links.push(link);
    }
    return Array.from(groups.values());
}

const HIDDEN_FOR_REGULAR_USER = new Set(["Draft", "Pending", "Rejected"]);

const isLegacy = (link: VndLinkItem) => link.kind === "legacy" || !!link.isAutoDetected;

export function VndLinksTab({vnd, onShowInText, onShowAttachmentInText}: VndLinksTabProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const isVndEditor = useIsVndEditor();
    const canEdit = hasPermission(PermissionCode.EditVndRequisites);

    const [subTab, setSubTab] = useState<SubTab>("outgoing");
    const [redactionFilter, setRedactionFilter] = useState<RedactionFilter>("all");
    const [wizardOpen, setWizardOpen] = useState(false);

    const {data, isLoading, isMutating, addLink, deleteLink} = useVndLinks(vnd.id);
    const {data: redactions} = useVndRedactions(vnd.id);

    // Редакции, которые видит пользователь (та же логика, что и на вкладке «Редакции»): рядовой
    // пользователь не видит черновики/на согласовании/отклонённые - и ссылки из их текста тоже.
    const visibleRedactions = useMemo(() => {
        const sortedDesc = [...redactions].sort((a, b) => b.number - a.number);
        const latestId = sortedDesc[0]?.id;
        const visible = isVndEditor
            ? sortedDesc
            : sortedDesc.filter((r) => isRedactionVisibleToRegularUser(r, vnd.status, r.id === latestId, vnd.effectiveDate));
        return [...visible].sort((a, b) => a.number - b.number);
    }, [redactions, isVndEditor, vnd.status, vnd.effectiveDate]);
    const visibleRedactionIds = useMemo(() => new Set(visibleRedactions.map((r) => r.id)), [visibleRedactions]);

    const outgoing = useMemo(
        () => (data?.outgoing ?? []).filter((l) => !l.source || visibleRedactionIds.has(l.source.redactionId)),
        [data, visibleRedactionIds],
    );
    const incoming = useMemo(
        () => (data?.incoming ?? []).filter((l) =>
            isVndEditor
            || !l.source
            || l.source.isCurrentRedaction
            || !HIDDEN_FOR_REGULAR_USER.has(l.source.redactionApprovalStatus)),
        [data, isVndEditor],
    );

    // Ссылки на СОБСТВЕННЫЕ вложения документа (db://attachments/{n}) из текста редакций.
    const attachmentRefs = useMemo(
        () => (data?.attachmentReferences ?? [])
            .filter((a) => a.redactionId === undefined || visibleRedactionIds.has(a.redactionId))
            .sort((a, b) => (a.redactionNumber ?? 0) - (b.redactionNumber ?? 0) || a.legacyIndex - b.legacyIndex),
        [data, visibleRedactionIds],
    );
    const filteredAttachmentRefs = useMemo(() => {
        if (redactionFilter === "all") return attachmentRefs;
        if (redactionFilter === "general") return [];
        return attachmentRefs.filter((a) => a.redactionId === redactionFilter);
    }, [attachmentRefs, redactionFilter]);

    const countByRedaction = useMemo(() => {
        const counts = new Map<number | "general", number>();
        for (const l of outgoing) {
            const key = l.source ? l.source.redactionId : "general";
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        for (const a of attachmentRefs) {
            if (a.redactionId !== undefined) counts.set(a.redactionId, (counts.get(a.redactionId) ?? 0) + 1);
        }
        return counts;
    }, [outgoing, attachmentRefs]);

    const [previewAttachment, setPreviewAttachment] = useState<{fileId: number; fileName: string} | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const handleDownloadAttachment = async (fileId: number, fileName: string) => {
        setDownloadingId(fileId);
        try {
            await downloadWithToast(fileId, fileName);
        } finally {
            setDownloadingId(null);
        }
    };

    const filteredOutgoing = useMemo(() => {
        if (redactionFilter === "all") return outgoing;
        if (redactionFilter === "general") return outgoing.filter((l) => !l.source);
        return outgoing.filter((l) => l.source?.redactionId === redactionFilter);
    }, [outgoing, redactionFilter]);

    const outgoingGroups = useMemo(() => groupByDocument(filteredOutgoing), [filteredOutgoing]);
    const incomingGroups = useMemo(() => groupByDocument(incoming), [incoming]);
    const outgoingDocsCount = useMemo(() => new Set(outgoing.map((l) => l.vndId)).size, [outgoing]);
    const groups = subTab === "outgoing" ? outgoingGroups : incomingGroups;

    // Уже существующие ссылки в тексте - подсвечиваются в окне выбора места (чтобы не прикрепить
    // одну и ту же ссылку к тому же фрагменту повторно).
    const existingMarks = (redactionId: number, lang: RedactionLanguage): DocLinkMark[] =>
        (data?.outgoing ?? [])
            .filter((l) => l.source?.redactionId === redactionId && anchorLanguage(l.source) === lang)
            .map((l) => ({
                linkId: l.id,
                side: "source" as const,
                kind: isLegacy(l) ? "legacy" as const : "manual" as const,
                text: l.source?.text, prefix: l.source?.prefix, suffix: l.source?.suffix,
                occurrence: l.source?.occurrence, legacyCode: l.source?.legacyCode,
                other: {vndId: l.vndId, code: l.code, title: l.title, status: l.status},
                targetFragment: l.target?.text ?? null,
            }));

    const handleSubmit = async (request: AddVndLinkRequest) => {
        await addLink(request);
        toast.success(
            t("openVndPage.linksTab.linkAddedTitle"),
            request.source ? t("openVndPage.linksTab.linkAddedWithMention") : t("openVndPage.linksTab.linkAddedWithoutMention"),
        );
        // Показываем вкладку редакции, к которой только что прикрепили ссылку.
        if (request.source) setRedactionFilter(request.source.redactionId);
        setSubTab("outgoing");
    };

    const handleDelete = async (link: VndLinkItem) => {
        try {
            await deleteLink(link.id);
        } catch (e) {
            toast.error(t("openVndPage.linksTab.deleteErrorTitle"), e instanceof Error ? e.message : undefined);
        }
    };

    const showSource = (link: VndLinkItem) => {
        if (subTab === "outgoing") onShowInText(link.id, "source");
        else navigate(buildLinkFocusUrl(link.vndId, link.id, "source"));
    };
    const showTarget = (link: VndLinkItem) => {
        if (subTab === "outgoing") navigate(buildLinkFocusUrl(link.vndId, link.id, "target"));
        else onShowInText(link.id, "target");
    };

    const emptyText = subTab === "incoming"
        ? t("openVndPage.linksTab.emptyIncoming")
        : redactionFilter === "all"
            ? t("openVndPage.linksTab.emptyOutgoing")
            : redactionFilter === "general"
                ? t("openVndPage.linksTab.emptyGeneral")
                : t("openVndPage.linksTab.emptyInRedaction", {
                    redaction: `Р${visibleRedactions.find((r) => r.id === redactionFilter)?.number ?? ""}`,
                });

    return (
        <div className="mx-4 sm:mx-6 bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-3">
                <Link2 size={18} strokeWidth={1.8} className="text-[#4e57d6]"/>
                <h2 className="m-0 text-sm font-semibold flex-1">{t("openVndPage.linksTab.title")}</h2>
                {subTab === "outgoing" && canEdit && (
                    <button
                        onClick={() => setWizardOpen(true)}
                        className="flex items-center gap-1.5 cursor-pointer text-xs font-medium bg-[var(--app-accent,_#2f68f5)] font-semibold text-white hover:brightness-[1.06] rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                        <Plus size={14} strokeWidth={2}/>
                        {t("openVndPage.linksTab.addLinkButton")}
                    </button>
                )}
            </div>

            <div className="flex gap-1 px-5 pt-3">
                <SubTabButton active={subTab === "outgoing"} onClick={() => setSubTab("outgoing")}>
                    {t("openVndPage.linksTab.outgoingTabLabel")} {data ? `(${outgoingDocsCount})` : ""}
                </SubTabButton>
                <SubTabButton active={subTab === "incoming"} onClick={() => setSubTab("incoming")}>
                    {t("openVndPage.linksTab.incomingTabLabel")} {data ? `(${incomingGroups.length})` : ""}
                </SubTabButton>
            </div>

            {/* Редакции: какие ссылки упоминаются в тексте какой редакции */}
            {subTab === "outgoing" && !isLoading && (outgoing.length > 0 || visibleRedactions.length > 0) && (
                <div className="mx-5 mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#f7f9fc] px-2 py-1.5">
                    <RedactionChip active={redactionFilter === "all"} onClick={() => setRedactionFilter("all")}
                                   label={t("openVndPage.linksTab.filterAll")} count={outgoing.length + attachmentRefs.length}/>
                    <RedactionChip active={redactionFilter === "general"} onClick={() => setRedactionFilter("general")}
                                   label={t("openVndPage.linksTab.filterGeneral")} count={countByRedaction.get("general") ?? 0}
                                   tooltip={t("openVndPage.linksTab.filterGeneralTooltip")}/>
                    <span className="mx-1 h-4 w-px bg-[#e1e6ee]"/>
                    {visibleRedactions.map((r) => (
                        <RedactionChip
                            key={r.id}
                            active={redactionFilter === r.id}
                            onClick={() => setRedactionFilter(r.id)}
                            label={`Р${r.number}`}
                            count={countByRedaction.get(r.id) ?? 0}
                            current={r.isCurrent}
                            tooltip={t("openVndPage.linksTab.redactionChipTooltip", {code: r.code})
                                + (r.isCurrent ? ` · ${t("openVndPage.linksTab.currentRedaction")}` : "")}
                        />
                    ))}
                </div>
            )}

            <div className="px-2 pb-2 mt-2">
                {isLoading && !data ? (
                    <div className="flex items-center justify-center py-10 text-[#8b97ab]">
                        <Loader2 size={18} className="animate-spin"/>
                    </div>
                ) : groups.length === 0 ? (
                    subTab === "outgoing" && filteredAttachmentRefs.length > 0
                        ? null
                        : <div className="text-center py-10 text-[13px] text-[#8b97ab]">{emptyText}</div>
                ) : (
                    groups.map((group) => (
                        <DocumentGroup
                            key={group.vndId}
                            group={group}
                            perspective={subTab}
                            canDelete={subTab === "outgoing" && canEdit}
                            disabled={isMutating}
                            onDelete={handleDelete}
                            onShowSource={showSource}
                            onShowTarget={showTarget}
                        />
                    ))
                )}

                {subTab === "outgoing" && filteredAttachmentRefs.length > 0 && (
                    <div className={groups.length > 0 ? "mt-2 pt-2 border-t border-[#eef2f7]" : "pt-1"}>
                        <div className="flex items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold text-[#8b97ab] uppercase tracking-wide">
                            <Paperclip size={12} strokeWidth={2}/>
                            {t("openVndPage.linksTab.attachmentRefsHeader")}
                        </div>
                        {filteredAttachmentRefs.map((ref) => (
                            <AttachmentLinkRow
                                key={`${ref.redactionId ?? "current"}-${ref.legacyIndex}`}
                                item={ref}
                                downloading={downloadingId === ref.fileId}
                                onPreview={() => setPreviewAttachment({fileId: ref.fileId, fileName: ref.fileName})}
                                onDownload={() => void handleDownloadAttachment(ref.fileId, ref.fileName)}
                                onShowInText={ref.redactionId !== undefined && onShowAttachmentInText
                                    ? () => onShowAttachmentInText(ref.redactionId!, ref.legacyIndex, ref.languages?.[0] ?? null)
                                    : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            {previewAttachment && (
                <AttachmentDocxPreviewModal
                    fileId={previewAttachment.fileId}
                    fileName={previewAttachment.fileName}
                    downloadingId={downloadingId}
                    onDownload={(fileId, name) => void handleDownloadAttachment(fileId, name)}
                    onClose={() => setPreviewAttachment(null)}
                />
            )}

            {wizardOpen && (
                <VndAddLinkWizard
                    vnd={vnd}
                    existingMarks={existingMarks}
                    onSubmit={handleSubmit}
                    onClose={() => setWizardOpen(false)}
                />
            )}
        </div>
    );
}

function SubTabButton({active, onClick, children}: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                active ? "bg-indigo-50 text-[#4e57d6]" : "text-[#8b97ab] hover:bg-slate-50"
            }`}
        >
            {children}
        </button>
    );
}

function RedactionChip({active, onClick, label, count, current, tooltip}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    current?: boolean;
    tooltip?: string;
}) {
    const chip = (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors ${
                active
                    ? "bg-white text-[#4e57d6] shadow-[0_1px_3px_rgba(15,27,45,.1)]"
                    : count > 0 ? "text-[#3a4560] hover:bg-white/70" : "text-[#a3adbd] hover:bg-white/70"
            }`}
        >
            {current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>}
            {label}
            <span className={`min-w-[18px] rounded-full px-1.5 text-center text-[10.5px] leading-[16px] ${
                active ? "bg-[#ececfc] text-[#4e57d6]" : count > 0 ? "bg-[#e9edf3] text-[#55617a]" : "bg-transparent text-[#c3ccd8]"
            }`}>
                {count}
            </span>
        </button>
    );
    return tooltip ? <Tooltip content={tooltip} side="top">{chip}</Tooltip> : chip;
}

function DocumentGroup({group, perspective, canDelete, disabled, onDelete, onShowSource, onShowTarget}: {
    group: DocGroup;
    perspective: SubTab;
    canDelete: boolean;
    disabled: boolean;
    onDelete: (link: VndLinkItem) => void;
    onShowSource: (link: VndLinkItem) => void;
    onShowTarget: (link: VndLinkItem) => void;
}) {
    const {t} = useTranslation();
    return (
        <div className="rounded-xl px-3 py-3 transition-colors hover:bg-slate-50/70">
            <div className="flex items-center gap-3">
                <span className="w-9 h-9 flex-none rounded-[9px] bg-[#f2f5f9] text-[#55617a] grid place-items-center font-mono text-[10px] font-semibold">
                    {group.code.slice(0, 3)}
                </span>
                <Link to={`/base-vnd/${group.vndId}`} className="group/doc flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                        <span className="font-mono text-[11.5px] font-semibold text-[#4e57d6] group-hover/doc:underline">{group.code}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${LINK_STATUS_STYLES[group.status] ?? "text-slate-500 bg-slate-100"}`}>
                            {t(`openVndPage.linksTab.statuses.${group.status}`, {defaultValue: group.status})}
                        </span>
                    </span>
                    <span className="block text-[12.5px] text-[#55617a] mt-0.5 truncate">{group.title}</span>
                </Link>
                <Tooltip content={t("openVndPage.linksTab.openDocumentTooltip")} side="left">
                    <Link to={`/base-vnd/${group.vndId}`}
                          className="grid h-8 w-8 flex-none place-items-center rounded-[8px] text-[#c3ccd8] hover:bg-white hover:text-[#4e57d6]">
                        <ChevronRight size={16} strokeWidth={2}/>
                    </Link>
                </Tooltip>
            </div>

            <div className="ml-[48px] mt-1.5 flex flex-col gap-0.5 border-l-2 border-[#eef2f7] pl-3">
                {group.links.map((link) => (
                    <MentionLine
                        key={link.id}
                        link={link}
                        perspective={perspective}
                        canDelete={canDelete && !isLegacy(link)}
                        disabled={disabled}
                        onDelete={() => onDelete(link)}
                        onShowSource={() => onShowSource(link)}
                        onShowTarget={() => onShowTarget(link)}
                    />
                ))}
            </div>
        </div>
    );
}

function MentionLine({link, perspective, canDelete, disabled, onDelete, onShowSource, onShowTarget}: {
    link: VndLinkItem;
    perspective: SubTab;
    canDelete: boolean;
    disabled: boolean;
    onDelete: () => void;
    onShowSource: () => void;
    onShowTarget: () => void;
}) {
    const {t} = useTranslation();
    const source = link.source;
    const target = link.target;
    const legacy = isLegacy(link);

    return (
        <div className="group/line flex min-h-[30px] items-center gap-2 rounded-[8px] px-1.5 py-1 hover:bg-white">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                {source ? (
                    <>
                        <RedactionPill number={source.redactionNumber} lang={source.documentTarget}
                                       current={source.isCurrentRedaction} code={source.redactionCode}/>
                        {legacy ? (
                            <Tooltip content={t("openVndPage.linksTab.autoDetectedTooltip")} side="top">
                                <span className="flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
                                    <Sparkles size={10} strokeWidth={2}/> {t("openVndPage.linksTab.autoDetectedBadge")}
                                </span>
                            </Tooltip>
                        ) : (
                            <span className="flex min-w-0 items-center gap-1 text-[12px] text-[#2c3446]">
                                <TextSelect size={12} strokeWidth={2} className="flex-none text-[#4e57d6]"/>
                                <span className="truncate italic">«{shortFragment(source.text, 110)}»</span>
                            </span>
                        )}
                    </>
                ) : (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                        <FileText size={12} strokeWidth={2}/>
                        {t("openVndPage.linksTab.withoutMention")}
                    </span>
                )}

                {target && (
                    <span className="flex min-w-0 items-center gap-1 text-[11.5px] text-[#55617a]">
                        <CornerDownRight size={12} strokeWidth={2} className="flex-none text-emerald-600"/>
                        <span className="truncate">
                            {perspective === "outgoing"
                                ? t("openVndPage.linksTab.toFragmentOfTarget", {fragment: shortFragment(target.text, 70)})
                                : t("openVndPage.linksTab.toFragmentOfThis", {fragment: shortFragment(target.text, 70)})}
                        </span>
                        <span className="flex-none rounded bg-emerald-50 px-1 text-[10px] font-semibold text-emerald-700">
                            Р{target.redactionNumber}{languageShortLabel(target.documentTarget) ? ` · ${languageShortLabel(target.documentTarget)}` : ""}
                        </span>
                    </span>
                )}
            </div>

            <div className="flex flex-none items-center gap-0.5">
                {source && (
                    <Tooltip content={perspective === "outgoing"
                        ? t("openVndPage.linksTab.showInTextTooltip")
                        : t("openVndPage.linksTab.showInSourceTextTooltip")} side="top">
                        <button type="button" onClick={onShowSource}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                            <Search size={14} strokeWidth={2.2}/>
                        </button>
                    </Tooltip>
                )}
                {target && (
                    <Tooltip content={perspective === "outgoing"
                        ? t("openVndPage.linksTab.showTargetPlaceTooltip")
                        : t("openVndPage.linksTab.showThisPlaceTooltip")} side="top">
                        <button type="button" onClick={onShowTarget}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-emerald-600/70 hover:bg-emerald-50 hover:text-emerald-700">
                            <ArrowUpRight size={14} strokeWidth={2.2}/>
                        </button>
                    </Tooltip>
                )}
                {canDelete && (
                    <Tooltip content={t("openVndPage.linksTab.deleteLinkTooltip")} side="top">
                        <button type="button" onClick={onDelete} disabled={disabled}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#c3ccd8] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover/line:opacity-100 disabled:opacity-40">
                            <X size={14} strokeWidth={2}/>
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}

function RedactionPill({number, lang, current, code}: {
    number: number;
    /** Один язык ("ru") или несколько (["ru", "kg"]) - в каком тексте найдена ссылка. */
    lang: string | string[] | null | undefined;
    current: boolean;
    code: string;
}) {
    const {t} = useTranslation();
    const langLabel = (Array.isArray(lang) ? lang : [lang]).map(languageShortLabel).filter(Boolean).join(", ");
    return (
        <Tooltip content={`${code}${current ? ` · ${t("openVndPage.linksTab.currentRedaction")}` : ""}`} side="top">
            <span className="flex flex-none items-center gap-1 rounded-[6px] bg-[#ececfc] px-1.5 py-0.5 text-[10.5px] font-bold text-[#4e57d6]">
                {current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>}
                Р{number}{langLabel ? ` · ${langLabel}` : ""}
            </span>
        </Tooltip>
    );
}

function AttachmentLinkRow({item, downloading, onPreview, onDownload, onShowInText}: {
    item: VndAttachmentLinkItem;
    downloading: boolean;
    onPreview: () => void;
    onDownload: () => void;
    onShowInText?: () => void;
}) {
    const {t} = useTranslation();
    const previewable = item.resolved && isPreviewableFile(item.fileName);
    // Клик по строке - самое полезное действие: просмотр, если формат поддерживается, иначе скачать.
    const handleRowClick = () => {
        if (!item.resolved) return;
        if (previewable) onPreview();
        else onDownload();
    };

    return (
        <div
            className={`group/att w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                item.resolved ? "hover:bg-slate-50" : "opacity-70"
            }`}
        >
            <button
                type="button"
                onClick={handleRowClick}
                disabled={!item.resolved}
                className={`flex min-w-0 flex-1 items-center gap-3 text-left ${item.resolved ? "cursor-pointer" : "cursor-not-allowed"}`}
                title={item.resolved ? undefined : t("openVndPage.linksTab.attachmentNotFoundTooltip")}
            >
                <span className={`w-9 h-9 flex-none rounded-[9px] grid place-items-center ${
                    item.resolved ? "bg-[#f2f5f9] text-[#55617a]" : "bg-[#fdf1f1] text-[#e3a5a5]"
                }`}>
                    {item.resolved ? <FileText size={16} strokeWidth={1.8}/> : <FileX size={16} strokeWidth={1.8}/>}
                </span>
                <span className="flex-1 min-w-0">
                    <span className={`block text-[12.5px] font-medium truncate ${item.resolved ? "text-[#2c3446]" : "text-[#8b97ab]"}`}>
                        {item.fileName}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8b97ab]">
                        {item.redactionNumber !== undefined && (
                            <RedactionPill number={item.redactionNumber} lang={item.languages}
                                           current={!!item.isCurrentRedaction} code={item.redactionCode ?? ""}/>
                        )}
                        <span>
                            {t("openVndPage.linksTab.attachmentRefLabel", {index: item.legacyIndex})}
                            {!item.resolved && t("openVndPage.linksTab.attachmentRefNotFoundSuffix")}
                        </span>
                    </span>
                </span>
            </button>

            <div className="flex flex-none items-center gap-0.5">
                {onShowInText && (
                    <Tooltip content={t("openVndPage.linksTab.showAttachmentInTextTooltip")} side="top">
                        <button type="button" onClick={onShowInText}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                            <Search size={14} strokeWidth={2.2}/>
                        </button>
                    </Tooltip>
                )}
                {previewable && (
                    <Tooltip content={t("openVndPage.linksTab.previewAttachmentTooltip")} side="top">
                        <button type="button" onClick={onPreview}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                            <Eye size={15} strokeWidth={2}/>
                        </button>
                    </Tooltip>
                )}
                {item.resolved && (
                    <Tooltip content={t("openVndPage.linksTab.downloadAttachmentTooltip")} side="top">
                        <button type="button" onClick={onDownload} disabled={downloading}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6] disabled:opacity-50">
                            {downloading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} strokeWidth={2}/>}
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
