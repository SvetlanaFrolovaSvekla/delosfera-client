// Легаси-гиперссылки вида db://documents/{code} и db://attachments/{n}, унаследованные из
// старой системы (isrib) - там вложения и связанные документы были прошиты прямо в тело
// Word-файла такими URI-подобными гиперссылками. docx-preview рендерит их как обычные <a
// href="db://...">, а браузер, не зная такой схемы, просто открывает пустую страницу (см.
// обсуждение с Пупуриком: документ 7985/ред5, ссылки db://documents/8041 и
// db://attachments/1).
//
// Этот хук навешивается на тот же containerRef, что и useDocxPreview (см. паттерн
// useDocxQuoteMarks/useDocxTextSearch - находит ссылки в уже отрендеренном DOM после каждого
// рендера/смены редакции), перехватывает клик по такой ссылке, запрашивает у бэка
// (vndService.resolveLegacyLink), во что она разрешается, и либо переходит на другой ВНД
// (db://documents/{code}), либо скачивает собственное вложение документа
// (db://attachments/{n}) - см. VndController.ResolveLegacyLink.
import React, {useEffect, useRef} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import {downloadWithToast} from "@/utils/downloadFile.ts";
import {toast} from "@/service/toastService.ts";

const LEGACY_LINK_ATTR = "data-legacy-link-bound";
const LEGACY_LINK_RE = /^db:\/\/(documents|attachments)\/0*(\d+)$/i;

export function useDocxLegacyLinks(
    containerRef: React.RefObject<HTMLElement | null>,
    vndId: number,
    ready: boolean,
    resetKey: string | number,
) {
    // Чтобы не плодить одновременные запросы, если пользователь кликает по ссылке несколько
    // раз подряд, пока первый резолв ещё не пришёл.
    const resolvingRef = useRef(false);

    useEffect(() => {
        const root = containerRef.current;
        if (!root || !ready) return;

        const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href^=\"db://\" i]"));

        const handlers: Array<{ el: HTMLAnchorElement; fn: (e: MouseEvent) => void }> = [];

        for (const link of links) {
            if (link.getAttribute(LEGACY_LINK_ATTR)) continue; // уже навешан обработчик

            const match = LEGACY_LINK_RE.exec(link.getAttribute("href") ?? "");
            if (!match) continue;

            const [, rawType, legacyId] = match;
            const type = rawType.toLowerCase() as "documents" | "attachments";

            link.setAttribute(LEGACY_LINK_ATTR, "1");
            link.style.cursor = "pointer";
            link.title = type === "documents"
                ? `Открыть документ (легаси-код ${legacyId})`
                : `Открыть вложение №${legacyId}`;

            const onClick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (resolvingRef.current) return;
                resolvingRef.current = true;

                vndService.resolveLegacyLink(vndId, type, legacyId)
                    .then((result) => {
                        if (result.kind === "vnd" && result.vndId) {
                            window.location.href = `/base-vnd/${result.vndId}`;
                        } else if (result.kind === "attachment" && result.fileId) {
                            void downloadWithToast(result.fileId, result.fileName ?? "вложение");
                        }
                    })
                    .catch(() => {
                        toast.error(
                            "Ссылка не работает",
                            type === "documents"
                                ? `Документ с кодом ${legacyId} не найден в системе`
                                : `Вложение №${legacyId} не найдено у этого документа`,
                        );
                    })
                    .finally(() => {
                        resolvingRef.current = false;
                    });
            };

            link.addEventListener("click", onClick);
            handlers.push({el: link, fn: onClick});
        }

        return () => {
            handlers.forEach(({el, fn}) => el.removeEventListener("click", fn));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerRef, vndId, ready, resetKey]);
}
