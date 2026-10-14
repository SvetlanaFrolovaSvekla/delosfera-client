// Таб "Связи" открытого ВНД.
// "Ссылки на документы" - на какие ВНД ссылается этот документ.
// "Ссылающиеся документы" - какие ВНД имеют ссылки на этот документ
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {AddVndLinkRequest, VndLinkItem, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {useCanExportVnd, NO_EXPORT_VND_HINT} from "@/hooks/vndHooks/useCanExportVnd.ts";
import {useVndLinksTabData} from "@/hooks/vndHooks/useVndLinksTabData.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {buildLinkFocusUrl, type VndLinkSide} from "@/utils/vndProcess/vndLinkNavigation.ts";

import {VndAddLinkWizard} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/VndAddLinkWizard.tsx";
import {SubTabButton} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/SubTabButton.tsx";
import {RedactionChip} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/RedactionChip.tsx";
import {DocumentGroup} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/DocumentGroup.tsx";
import {AttachmentLinkRow} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/AttachmentLinkRow.tsx";
import type {
    LinksSubTab, RedactionFilter
} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/vndLinksTabUtils.ts";

import {AttachmentDocxPreviewModal} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {Link2, Loader2, Paperclip, Plus} from "lucide-react";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

interface VndLinksTabProps {
    vnd: VndResponse;
    /** Показать место ссылки в тексте ЭТОГО документа (переключает страницу на «Редакции»). */
    onShowInText: (linkId: number, side: VndLinkSide) => void;
    /** Показать в тексте ЭТОГО документа ссылку на вложение db://attachments/{index}. */
    onShowAttachmentInText?: (redactionId: number, index: number, language: string | null) => void;
}

export function VndLinksTab({vnd, onShowInText, onShowAttachmentInText}: VndLinksTabProps) {
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.EditVndRequisites);

    const [subTab, setSubTab] = useState<LinksSubTab>("outgoing");
    const [redactionFilter, setRedactionFilter] = useState<RedactionFilter>("all");
    const [wizardOpen, setWizardOpen] = useState(false);

    const {
        data, isLoading, isMutating, addLink, deleteLink,
        visibleRedactions,
        outgoing, attachmentRefs, filteredAttachmentRefs, countByRedaction,
        outgoingGroups, incomingGroups, outgoingDocsCount,
        existingMarks,
    } = useVndLinksTabData(vnd, redactionFilter);
    const groups = subTab === "outgoing" ? outgoingGroups : incomingGroups;

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

    // Пояснение под заголовком пустого состояния - только для «чистых» вкладок (без фильтра по редакции)
    const emptyDescription = subTab === "incoming"
        ? t("openVndPage.linksTab.emptyIncomingDescription")
        : redactionFilter === "all"
            ? t(canEdit ? "openVndPage.linksTab.emptyOutgoingDescription" : "openVndPage.linksTab.emptyOutgoingDescriptionReadonly")
            : undefined;

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
                        : <EmptyState embedded icon={Link2} title={emptyText} description={emptyDescription}/>
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
                    downloadDisabled={!canExportVnd}
                    downloadDisabledHint={NO_EXPORT_VND_HINT}
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
