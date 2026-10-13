// Ссылки на другие ВНД в тексте редакции (и ссылки других ВНД на фрагменты этой) +
// "лупа" - переход к месту ссылки по запросу со вкладки "Связанные документы"
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {useVndLinks} from "@/hooks/vndHooks/useVndLinks.ts";
import type {DocLinkFocusRequest, DocLinkMark} from "@/hooks/vndHooks/useDocxLinkMarks.ts";
import {anchorLanguage, type VndLinkFocusRequest} from "@/utils/vndProcess/vndLinkNavigation.ts";
import type {RedactionLanguage} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

interface UseRedactionLinkFocusParams {
    vndId: number;
    linkFocus: VndLinkFocusRequest | null | undefined;
    redactions: VndRedactionResponse[];
    visibleRedactions: VndRedactionResponse[];
    selected: VndRedactionResponse | undefined;
    activeLanguage: RedactionLanguage;
    /** Открыть редакцию (и язык, если известен), где находится ссылка */
    onShowRedaction: (redactionId: number, language: RedactionLanguage | null) => void;
}

export function useRedactionLinkFocus({
                                          vndId, linkFocus, redactions, visibleRedactions,
                                          selected, activeLanguage, onShowRedaction,
                                      }: UseRedactionLinkFocusParams) {
    const {t} = useTranslation();
    const {data: links} = useVndLinks(vndId);

    const linkMarks = useMemo<DocLinkMark[]>(() => {
        if (!links || !selected) return [];
        const result: DocLinkMark[] = [];
        for (const link of links.outgoing) {
            const src = link.source;
            if (!src || src.redactionId !== selected.id || anchorLanguage(src) !== activeLanguage) continue;
            result.push({
                linkId: link.id,
                side: "source",
                kind: link.kind === "legacy" || link.isAutoDetected ? "legacy" : "manual",
                text: src.text, prefix: src.prefix, suffix: src.suffix, occurrence: src.occurrence,
                legacyCode: src.legacyCode,
                other: {vndId: link.vndId, code: link.code, title: link.title, status: link.status},
                targetFragment: link.target?.text ?? null,
            });
        }
        for (const link of links.incoming) {
            const tgt = link.target;
            if (!tgt || tgt.redactionId !== selected.id || anchorLanguage(tgt) !== activeLanguage) continue;
            result.push({
                linkId: link.id,
                side: "target",
                kind: "manual",
                text: tgt.text, prefix: tgt.prefix, suffix: tgt.suffix, occurrence: tgt.occurrence,
                other: {vndId: link.vndId, code: link.code, title: link.title, status: link.status},
            });
        }
        return result;
    }, [links, selected, activeLanguage]);

    // "Лупа": как только связи загружены - выбираем редакцию и язык, где находится ссылка, и
    // передаём запрос прокрутки в RedactionTextView (сама прокрутка - в useDocxLinkMarks, когда
    // документ отрендерен и подсветка нарисована).
    const [textLinkFocus, setTextLinkFocus] = useState<DocLinkFocusRequest | null>(null);
    const handledLinkFocusRef = useRef<number | null>(null);
    useEffect(() => {
        if (!linkFocus || redactions.length === 0) return;
        if (handledLinkFocusRef.current === linkFocus.nonce) return;

        // Легаси-ссылка на вложение (db://attachments/{n}) - связь не нужна, только редакция.
        if (linkFocus.attachment) {
            handledLinkFocusRef.current = linkFocus.nonce;
            const {redactionId, index, language} = linkFocus.attachment;
            if (!visibleRedactions.some((r) => r.id === redactionId)) {
                toast.info(
                    t("openVndPage.linkMarks.focusRedactionHiddenTitle"),
                    t("openVndPage.linkMarks.focusRedactionHiddenDescription", {
                        code: redactions.find((r) => r.id === redactionId)?.code ?? "",
                    }),
                );
                return;
            }
            onShowRedaction(redactionId, anchorLanguage({documentTarget: language}));
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTextLinkFocus({linkId: 0, side: "source", nonce: linkFocus.nonce, legacyAttachmentIndex: index});
            return;
        }

        if (!links) return;
        handledLinkFocusRef.current = linkFocus.nonce;

        const list = linkFocus.side === "source" ? links.outgoing : links.incoming;
        const link = list.find((l) => l.id === linkFocus.linkId);
        const anchor = linkFocus.side === "source" ? link?.source : link?.target;
        if (!link || !anchor) {
            toast.info(t("openVndPage.linkMarks.focusNotAnchoredTitle"), t("openVndPage.linkMarks.focusNotAnchoredDescription"));
            return;
        }
        if (!visibleRedactions.some((r) => r.id === anchor.redactionId)) {
            toast.info(
                t("openVndPage.linkMarks.focusRedactionHiddenTitle"),
                t("openVndPage.linkMarks.focusRedactionHiddenDescription", {code: anchor.redactionCode}),
            );
            return;
        }
        onShowRedaction(anchor.redactionId, anchorLanguage(anchor));
        setTextLinkFocus({linkId: link.id, side: linkFocus.side, nonce: linkFocus.nonce});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkFocus?.nonce, links, redactions.length]);

    const handleLinkFocusResult = (result: { found: boolean; approximate: boolean }) => {
        if (!result.found) {
            toast.info(t("openVndPage.linkMarks.focusNotFoundTitle"), t("openVndPage.linkMarks.focusNotFoundDescription"));
        } else if (result.approximate) {
            toast.info(t("openVndPage.linkMarks.focusApproximateTitle"), t("openVndPage.linkMarks.focusApproximateDescription"));
        }
    };

    return {linkMarks, textLinkFocus, handleLinkFocusResult};
}
