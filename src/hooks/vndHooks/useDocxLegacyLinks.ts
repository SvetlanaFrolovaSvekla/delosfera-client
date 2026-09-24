// Легаси-гиперссылки вида db://documents/{code} и db://attachments/{n}, унаследованные из
// старой системы (isrib) - там вложения и связанные документы были прошиты прямо в тело
// Word-файла такими URI-подобными гиперссылками. docx-preview рендерит их как обычные <a
// href="db://...">, а браузер, не зная такой схемы, пытается открыть внешнее приложение
// ("Открыть db://documents/8757?") - см. обсуждение с Пупуриком: документ 7985/ред5, ссылки
// db://documents/8041 и db://attachments/1.
//
// Что делает хук:
// 1. "Оформляет" каждую такую ссылку после рендера документа: запоминает исходный адрес в
//    data-атрибутах, а href ПОДМЕНЯЕТ на настоящий адрес страницы ВНД (/base-vnd/{id}) - его
//    заранее узнаём у бэка (vndService.resolveLegacyLink, с кэшем). Поэтому "Открыть в новой
//    вкладке" из контекстного меню, Ctrl/⌘+клик и средняя кнопка мыши работают штатно, а не
//    открывают страницу "db://documents/8757". У ссылки на вложение href убирается совсем
//    (вложение не открыть по адресу - нужен токен), вместо него - role="link".
// 2. Перехватывает клик ДЕЛЕГИРОВАНИЕМ на контейнере (в фазе захвата) - ловит любую такую ссылку,
//    в какой бы момент она ни появилась: обычный клик по документу - переход внутри приложения
//    без перезагрузки; по вложению - просмотр (если формат поддерживается) или скачивание.
// 3. Сообщает о наведении (onHover) - карточка при наведении та же, что и у новых ссылок
//    (см. VndLinkHoverCard), а не системная подсказка браузера.
import React, {useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import {parseLegacyHref, type LegacyHref} from "@/utils/vndProcess/vndLinkNavigation.ts";

/** Атрибуты, которыми помечаются распознанные легаси-ссылки (для стилей и поиска "лупой" - см.
 * useDocxLinkMarks). Код документа/номер вложения - без ведущих нулей. */
export const LEGACY_LINK_CODE_ATTR = "data-legacy-link-code";
export const LEGACY_LINK_TYPE_ATTR = "data-legacy-link-type";
const LEGACY_LINK_HREF_ATTR = "data-legacy-href";

export interface LegacyDocumentInfo {
    vndId: number;
    code: string;
    title: string;
    status: string;
}

export interface LegacyAttachmentInfo {
    fileId: number;
    fileName: string;
}

/** То, на что наведён курсор: ссылка на документ (info = null - такого документа в системе нет)
 * или на вложение (info = null - такого вложения у редакции нет). */
export type LegacyLinkHover =
    | { type: "documents"; code: string; info: LegacyDocumentInfo | null; pending: boolean }
    | { type: "attachments"; index: string; info: LegacyAttachmentInfo | null; pending: boolean };

interface UseDocxLegacyLinksOptions {
    /** Редакция, текст которой показан, - номер вложения относится к ЕЁ вложениям. */
    redactionId?: number;
    onHover?: (hover: LegacyLinkHover | null, rect: DOMRect | null) => void;
    /** Открыть вложение (просмотр или скачивание решает вызывающая сторона). */
    onOpenAttachment?: (attachment: LegacyAttachmentInfo) => void;
    /** false - ссылки не открываются по клику (например, в окне выбора фрагмента при добавлении
     * ссылки, где клик нужен для выделения текста, а уходить со страницы нельзя). */
    clickable?: boolean;
}

// Кэш разрешения ссылок на документы - общий для всех открытых документов и живёт до
// перезагрузки страницы: код документа → документ (null - не найден).
const documentCache = new Map<string, Promise<LegacyDocumentInfo | null>>();

function resolveDocument(vndId: number, code: string): Promise<LegacyDocumentInfo | null> {
    let promise = documentCache.get(code);
    if (!promise) {
        promise = vndService.resolveLegacyLink(vndId, "documents", code)
            .then((r) => r.kind === "vnd" && r.vndId
                ? {vndId: r.vndId, code: r.code ?? code, title: r.title ?? "", status: r.status ?? ""}
                : null)
            .catch(() => null);
        documentCache.set(code, promise);
    }
    return promise;
}

// Вложения зависят от документа и редакции - кэш по ключу "vndId:redactionId:n".
const attachmentCache = new Map<string, Promise<LegacyAttachmentInfo | null>>();

function resolveAttachment(vndId: number, redactionId: number | undefined, index: string): Promise<LegacyAttachmentInfo | null> {
    const key = `${vndId}:${redactionId ?? "current"}:${index}`;
    let promise = attachmentCache.get(key);
    if (!promise) {
        promise = vndService.resolveLegacyLink(vndId, "attachments", index, redactionId)
            .then((r) => r.kind === "attachment" && r.fileId ? {fileId: r.fileId, fileName: r.fileName ?? "вложение"} : null)
            .catch(() => null);
        attachmentCache.set(key, promise);
        // Неудачу не кэшируем навсегда - вложение могли добавить, пока страница открыта.
        promise.then((v) => {
            if (!v) attachmentCache.delete(key);
        });
    }
    return promise;
}

/** Распознаёт легаси-ссылку по уже проставленным data-атрибутам или (до оформления) по href. */
function readLegacy(anchor: Element): LegacyHref | null {
    const type = anchor.getAttribute(LEGACY_LINK_TYPE_ATTR);
    const id = anchor.getAttribute(LEGACY_LINK_CODE_ATTR);
    if ((type === "documents" || type === "attachments") && id) return {type, id};
    return parseLegacyHref(anchor.getAttribute("href"));
}

function findLegacyAnchor(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
    const el = target instanceof Element ? target : (target as Node | null)?.parentElement ?? null;
    const anchor = el?.closest?.("a") as HTMLElement | null;
    if (!anchor || !root.contains(anchor)) return null;
    return readLegacy(anchor) ? anchor : null;
}

export function useDocxLegacyLinks(
    containerRef: React.RefObject<HTMLElement | null>,
    vndId: number,
    ready: boolean,
    resetKey: string | number,
    options: UseDocxLegacyLinksOptions = {},
) {
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const redactionId = options.redactionId;

    // Оформление ссылок - после каждого рендера документа (и ещё раз с небольшой задержкой:
    // соседние хуки подсветки перестраивают DOM, docx-preview дорисовывает колонтитулы/сноски).
    useEffect(() => {
        const root = containerRef.current;
        if (!root || !ready) return;
        let cancelled = false;

        const decorate = () => {
            root.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
                if (a.hasAttribute(LEGACY_LINK_TYPE_ATTR)) return;
                const parsed = parseLegacyHref(a.getAttribute("href"));
                if (!parsed) return;

                a.setAttribute(LEGACY_LINK_TYPE_ATTR, parsed.type);
                a.setAttribute(LEGACY_LINK_CODE_ATTR, parsed.id);
                a.setAttribute(LEGACY_LINK_HREF_ATTR, a.getAttribute("href") ?? "");
                a.classList.add("docx-legacy-link");
                a.removeAttribute("title");
                a.removeAttribute("target");

                if (parsed.type === "documents") {
                    // Пока адрес не известен - ссылка никуда не ведёт (а не на db://...).
                    a.setAttribute("href", "#");
                    void resolveDocument(vndId, parsed.id).then((info) => {
                        if (cancelled || !a.isConnected) return;
                        if (info) {
                            a.setAttribute("href", `/base-vnd/${info.vndId}`);
                        } else {
                            a.removeAttribute("href");
                            a.classList.add("docx-legacy-link-broken");
                        }
                    });
                } else {
                    a.removeAttribute("href");
                    a.setAttribute("role", "link");
                    a.setAttribute("tabindex", "0");
                    void resolveAttachment(vndId, redactionId, parsed.id).then((info) => {
                        if (cancelled || !a.isConnected) return;
                        if (!info) a.classList.add("docx-legacy-link-broken");
                    });
                }
            });
        };

        decorate();
        const timer = setTimeout(decorate, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [containerRef, vndId, redactionId, ready, resetKey]);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const openDocument = (legacy: LegacyHref, inNewTab: boolean) => {
            // Новую вкладку открываем СРАЗУ (в обработчике клика), иначе браузер заблокирует
            // её как всплывающее окно, - адрес подставим, когда станет известен.
            const newTab = inNewTab ? window.open("about:blank", "_blank") : null;
            void resolveDocument(vndId, legacy.id).then((info) => {
                if (!info) {
                    newTab?.close();
                    toast.error("Ссылка не работает", `Документ с кодом ${legacy.id} не найден в системе`);
                    return;
                }
                const url = `/base-vnd/${info.vndId}`;
                if (newTab) newTab.location.href = url;
                else navigateRef.current(url);
            });
        };

        const openAttachment = (legacy: LegacyHref) => {
            void resolveAttachment(vndId, redactionId, legacy.id).then((info) => {
                if (!info) {
                    toast.error("Ссылка не работает", `Вложение №${legacy.id} не найдено у этой редакции`);
                    return;
                }
                optionsRef.current.onOpenAttachment?.(info);
            });
        };

        const handle = (e: MouseEvent, forceNewTab: boolean) => {
            const anchor = findLegacyAnchor(e.target, root);
            if (!anchor) return;
            const legacy = readLegacy(anchor)!;
            const wantsNewTab = forceNewTab || e.ctrlKey || e.metaKey || e.shiftKey;
            const href = anchor.getAttribute("href") ?? "";

            if (optionsRef.current.clickable === false) {
                e.preventDefault();
                return;
            }

            // Адрес документа уже подставлен - открыть в новой вкладке браузер умеет сам.
            if (legacy.type === "documents" && wantsNewTab && href.startsWith("/base-vnd/")) return;

            e.preventDefault();
            e.stopPropagation();
            optionsRef.current.onHover?.(null, null);
            if (legacy.type === "documents") openDocument(legacy, wantsNewTab);
            else openAttachment(legacy);
        };

        const onClick = (e: MouseEvent) => handle(e, false);
        const onAuxClick = (e: MouseEvent) => {
            if (e.button === 1) handle(e, true);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Enter") return;
            const anchor = findLegacyAnchor(e.target, root);
            const legacy = anchor ? readLegacy(anchor) : null;
            if (legacy?.type !== "attachments") return;
            e.preventDefault();
            openAttachment(legacy);
        };

        // Наведение - карточка как у новых ссылок (VndLinkHoverCard), а не системный title.
        let hovered: HTMLElement | null = null;
        const onOver = (e: MouseEvent) => {
            const anchor = findLegacyAnchor(e.target, root);
            if (!anchor || anchor === hovered) return;
            hovered = anchor;
            const legacy = readLegacy(anchor)!;
            const rect = anchor.getBoundingClientRect();
            const report = (hover: LegacyLinkHover) => {
                if (hovered === anchor) optionsRef.current.onHover?.(hover, rect);
            };
            if (legacy.type === "documents") {
                report({type: "documents", code: legacy.id, info: null, pending: true});
                void resolveDocument(vndId, legacy.id).then((info) =>
                    report({type: "documents", code: legacy.id, info, pending: false}));
            } else {
                report({type: "attachments", index: legacy.id, info: null, pending: true});
                void resolveAttachment(vndId, redactionId, legacy.id).then((info) =>
                    report({type: "attachments", index: legacy.id, info, pending: false}));
            }
        };
        const onOut = (e: MouseEvent) => {
            const anchor = findLegacyAnchor(e.target, root);
            if (!anchor) return;
            // Переход между дочерними элементами той же ссылки - не уход с неё.
            const to = e.relatedTarget as Node | null;
            if (to && anchor.contains(to)) return;
            hovered = null;
            optionsRef.current.onHover?.(null, null);
        };

        root.addEventListener("click", onClick, true);
        root.addEventListener("auxclick", onAuxClick, true);
        root.addEventListener("keydown", onKeyDown, true);
        root.addEventListener("mouseover", onOver);
        root.addEventListener("mouseout", onOut);
        return () => {
            root.removeEventListener("click", onClick, true);
            root.removeEventListener("auxclick", onAuxClick, true);
            root.removeEventListener("keydown", onKeyDown, true);
            root.removeEventListener("mouseover", onOver);
            root.removeEventListener("mouseout", onOut);
        };
        // ready/resetKey - сам контейнер пересоздаётся (например, после экрана "текста на этом
        // языке нет" или ошибки загрузки), и слушатели должны переехать на новый узел.
    }, [containerRef, vndId, redactionId, ready, resetKey]);
}
