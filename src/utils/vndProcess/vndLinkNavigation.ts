// Навигация по ссылкам между ВНД: "лупа" на вкладке "Связанные документы" (показать место ссылки
// в тексте редакции), клик по подсвеченной ссылке в тексте и по легаси-гиперссылке
// db://documents/{код}. Все переходы - через адрес страницы документа:
//   /base-vnd/{id}?tab=editions&link={linkId}&side=source|target
// (а не через react-router state) - такую ссылку можно открыть в новой вкладке или переслать.
import type {VndLinkAnchor, VndLinkItem} from "@/service/vndService/vndServiceType.ts";
import type {RedactionLanguage} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

/** Какой конец связи нужно показать в тексте: "source" - место в ССЫЛАЮЩЕМСЯ документе, где
 * упоминается ссылка; "target" - место в документе, НА КОТОРЫЙ ссылаются. */
export type VndLinkSide = "source" | "target";

/** Запрос "показать ссылку в тексте" для вкладки «Редакции». nonce - чтобы повторный клик по
 * той же ссылке снова прокрутил к ней, даже если linkId не изменился. */
export interface VndLinkFocusRequest {
    linkId: number;
    side: VndLinkSide;
    nonce: number;
    /** Вместо связи - показать в тексте легаси-ссылку на вложение db://attachments/{index} в
     * редакции redactionId (linkId при этом не используется). */
    attachment?: { redactionId: number; index: number; language: string | null };
}

export const LINK_QUERY_PARAM = "link";
export const LINK_SIDE_QUERY_PARAM = "side";

/** Адрес страницы документа vndId, открытой на вкладке «Редакции» на месте ссылки linkId. */
export function buildLinkFocusUrl(vndId: number, linkId: number, side: VndLinkSide): string {
    const params = new URLSearchParams({tab: "editions", [LINK_QUERY_PARAM]: String(linkId), [LINK_SIDE_QUERY_PARAM]: side});
    return `/base-vnd/${vndId}?${params.toString()}`;
}

/** Куда ведёт исходящая ссылка (outgoing, link.vndId - документ-цель): на конкретное место
 * целевого документа, если оно указано, иначе - просто на документ. */
export function buildOutgoingLinkUrl(link: Pick<VndLinkItem, "id" | "vndId" | "target">): string {
    return link.target ? buildLinkFocusUrl(link.vndId, link.id, "target") : `/base-vnd/${link.vndId}`;
}

/** Читает запрос "показать ссылку" из адреса страницы (см. buildLinkFocusUrl). */
export function parseLinkFocusFromSearch(search: URLSearchParams): Omit<VndLinkFocusRequest, "nonce"> | null {
    const linkId = Number(search.get(LINK_QUERY_PARAM));
    const side = search.get(LINK_SIDE_QUERY_PARAM);
    if (!Number.isInteger(linkId) || linkId <= 0) return null;
    return {linkId, side: side === "target" ? "target" : "source"};
}

/** Язык текста якоря, приведённый к RedactionLanguage (null - неизвестный/не задан). */
export function anchorLanguage(anchor: Pick<VndLinkAnchor, "documentTarget"> | null | undefined): RedactionLanguage | null {
    const lang = anchor?.documentTarget?.toLowerCase();
    return lang === "ru" || lang === "kg" || lang === "en" ? lang : null;
}

// --- Легаси-гиперссылки db://documents/{код} и db://attachments/{n} (старая система isrib)

// Терпимо к тому, как Word/docx-preview сохранили адрес: регистр, пробелы по краям,
// завершающий слэш, "якорь"/параметры после номера (db://documents/8757#p1), ведущие нули.
const LEGACY_HREF_RE = /^\s*db:\/\/+(documents|attachments)\/+0*(\d+)\s*\/?\s*(?:[?#].*)?$/i;

export interface LegacyHref {
    type: "documents" | "attachments";
    /** Номер без ведущих нулей ("0" для нулевого). */
    id: string;
}

export function parseLegacyHref(href: string | null | undefined): LegacyHref | null {
    if (!href) return null;
    let value = href;
    try {
        value = decodeURIComponent(href);
    } catch {
        // некорректная %-последовательность - разбираем как есть
    }
    const m = LEGACY_HREF_RE.exec(value);
    if (!m) return null;
    return {type: m[1].toLowerCase() as LegacyHref["type"], id: m[2] === "" ? "0" : m[2]};
}

/** Код документа, как его хранит бэк для легаси-ссылки (VndLink.LegacyCode) - без ведущих нулей. */
export function normalizeLegacyCode(code: string): string {
    const trimmed = code.trim().replace(/^0+/, "");
    return trimmed === "" ? "0" : trimmed;
}
