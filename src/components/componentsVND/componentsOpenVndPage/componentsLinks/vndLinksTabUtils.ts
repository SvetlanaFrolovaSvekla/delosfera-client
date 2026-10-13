// Типы и хелперы вкладки "Связанные документы" (VndLinksTab и её компоненты)
import type {VndLinkItem} from "@/service/vndService/vndServiceType.ts";

/** "Ссылки на документы" (на какие ВНД ссылается этот) / "Ссылающиеся документы" */
export type LinksSubTab = "outgoing" | "incoming";

/** Фильтр по редакции для «Ссылок на документы»: все, только общие (без упоминания в тексте)
 * или id конкретной редакции. */
export type RedactionFilter = "all" | "general" | number;

/** Ссылки, сгруппированные по документу на другой стороне */
export interface DocGroup {
    vndId: number;
    code: string;
    title: string;
    status: string;
    links: VndLinkItem[];
}

export function groupByDocument(links: VndLinkItem[]): DocGroup[] {
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

/** Ссылка из старой системы или найденная в тексте автоматически (не удаляется вручную) */
export const isLegacyLink = (link: VndLinkItem) => link.kind === "legacy" || !!link.isAutoDetected;
