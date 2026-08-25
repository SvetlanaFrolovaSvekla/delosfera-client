import {apiClient} from "@/service/apiClient.ts";

/**
 * Дерево подразделений.
 *
 * Приходит с сервера уже собранным: складывать иерархию из плоского списка
 * пришлось бы в каждом экране заново и в каждом одинаково ошибаться на
 * подразделениях без родителя.
 */

export interface OrgTreeNode {
    id: number;
    title: string;
    parentId: number | null;
    /** Начальник подразделения. */
    head: string | null;
    /** Куратор: подразделение подчинено человеку напрямую. */
    curator: string | null;
    /** Людей в самом подразделении, без подчинённых узлов. */
    staffCount: number;
    /** Пришло из портала. Заведённые руками — нет. */
    fromPortal: boolean;
    children: OrgTreeNode[];
}

export interface OrgTree {
    roots: OrgTreeNode[];
    unitsTotal: number;
    /** У скольких подразделений вышестоящее указано, но не найдено. */
    orphans: number;
    lastSyncAt: string | null;
}

export async function orgTree(): Promise<OrgTree> {
    const {data} = await apiClient.get<OrgTree>("/org-tree");
    return data;
}

/** Сколько людей в подразделении вместе со всеми вложенными. */
export function totalStaff(node: OrgTreeNode): number {
    return node.staffCount + node.children.reduce((sum, child) => sum + totalStaff(child), 0);
}

/** Отбор по названию: узел остаётся, если совпал сам или совпал кто-то внутри. */
export function filterTree(nodes: OrgTreeNode[], needle: string): OrgTreeNode[] {
    const text = needle.trim().toLowerCase();
    if (!text) return nodes;

    const keep = (node: OrgTreeNode): OrgTreeNode | null => {
        const children = node.children.map(keep).filter((n): n is OrgTreeNode => n !== null);
        const matches = node.title.toLowerCase().includes(text)
            || (node.head?.toLowerCase().includes(text) ?? false);

        if (!matches && children.length === 0) return null;
        return {...node, children};
    };

    return nodes.map(keep).filter((n): n is OrgTreeNode => n !== null);
}
