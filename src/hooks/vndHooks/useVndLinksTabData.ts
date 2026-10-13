// Данные вкладки "Связанные документы": связи ВНД, отфильтрованные по видимости редакций для
// текущего пользователя, счётчики по редакциям и группировка по документам.
import {useMemo} from "react";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {useVndLinks} from "@/hooks/vndHooks/useVndLinks.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";
import type {DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import {isRedactionVisibleToRegularUser} from "@/utils/vndProcess/redactionStatus.ts";
import type {RedactionLanguage} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {anchorLanguage} from "@/utils/vndProcess/vndLinkNavigation.ts";
import {
    groupByDocument, isLegacyLink, type RedactionFilter
} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/vndLinksTabUtils.ts";

const HIDDEN_FOR_REGULAR_USER = new Set(["Draft", "Pending", "Rejected"]);

export function useVndLinksTabData(vnd: VndResponse, redactionFilter: RedactionFilter) {
    const isVndEditor = useIsVndEditor();
    const {data, isLoading, isMutating, addLink, deleteLink} = useVndLinks(vnd.id);
    const {data: redactions} = useVndRedactions(vnd.id);

    // Редакции, которые видит пользователь (та же логика, что и на вкладке "Редакции"): рядовой
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

    const filteredOutgoing = useMemo(() => {
        if (redactionFilter === "all") return outgoing;
        if (redactionFilter === "general") return outgoing.filter((l) => !l.source);
        return outgoing.filter((l) => l.source?.redactionId === redactionFilter);
    }, [outgoing, redactionFilter]);

    const outgoingGroups = useMemo(() => groupByDocument(filteredOutgoing), [filteredOutgoing]);
    const incomingGroups = useMemo(() => groupByDocument(incoming), [incoming]);
    const outgoingDocsCount = useMemo(() => new Set(outgoing.map((l) => l.vndId)).size, [outgoing]);

    // Уже существующие ссылки в тексте - подсвечиваются в окне выбора места (чтобы не прикрепить
    // одну и ту же ссылку к тому же фрагменту повторно).
    const existingMarks = (redactionId: number, lang: RedactionLanguage): DocLinkMark[] =>
        (data?.outgoing ?? [])
            .filter((l) => l.source?.redactionId === redactionId && anchorLanguage(l.source) === lang)
            .map((l) => ({
                linkId: l.id,
                side: "source" as const,
                kind: isLegacyLink(l) ? "legacy" as const : "manual" as const,
                text: l.source?.text, prefix: l.source?.prefix, suffix: l.source?.suffix,
                occurrence: l.source?.occurrence, legacyCode: l.source?.legacyCode,
                other: {vndId: l.vndId, code: l.code, title: l.title, status: l.status},
                targetFragment: l.target?.text ?? null,
            }));

    return {
        data, isLoading, isMutating, addLink, deleteLink,
        visibleRedactions,
        outgoing, attachmentRefs, filteredAttachmentRefs, countByRedaction,
        outgoingGroups, incomingGroups, outgoingDocsCount,
        existingMarks,
    };
}
