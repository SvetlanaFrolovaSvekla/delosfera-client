import {apiClient} from "@/service/apiClient.ts";
import {cached} from "@/service/dictionaryCache.ts";

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
    /** Коллегиальный орган, управление или отдел. Пусто — вид не указан. */
    kind: string | null;
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
    /** Узел — не подразделение, а человек, которому подчинены нижние. */
    isPerson?: boolean;
    /** Кто числится в подразделении. У узла-человека пусто. */
    staff?: OrgTreeStaff[];
}

export interface OrgTreeStaff {
    id: number;
    fullName: string;
    position: string | null;
    /** Начальник подразделения — он стоит первым. */
    isHead: boolean;
}

export interface OrgTree {
    roots: OrgTreeNode[];
    unitsTotal: number;
    /** У скольких подразделений вышестоящее указано, но не найдено. */
    orphans: number;
    lastSyncAt: string | null;
}

export async function orgTree(): Promise<OrgTree> {
    // Дерево подразделений открывают из полей адресата и из раздела оргструктуры.
    // Меняется оно синхронизацией с порталом, а не в течение сеанса работы.
    return cached("org-tree", async () => {
        const {data} = await apiClient.get<OrgTree>("/org-tree");
        return data;
    });
}

/** Сколько людей в подразделении вместе со всеми вложенными. */
export function totalStaff(node: OrgTreeNode): number {
    return node.staffCount + node.children.reduce((sum, child) => sum + totalStaff(child), 0);
}

/**
 * Отбор по названию: узел остаётся, если совпал сам или совпал кто-то внутри.
 *
 * Сотрудники ищутся наравне с подразделениями: структуру открывают и затем,
 * чтобы найти человека. У совпавшего подразделения список остаётся целиком —
 * искали отдел, а не фамилию; у остальных остаются только совпавшие.
 */
export function filterTree(nodes: OrgTreeNode[], needle: string): OrgTreeNode[] {
    const text = needle.trim().toLowerCase();
    if (!text) return nodes;

    const keep = (node: OrgTreeNode): OrgTreeNode | null => {
        const children = node.children.map(keep).filter((n): n is OrgTreeNode => n !== null);
        const matches = node.title.toLowerCase().includes(text)
            || (node.head?.toLowerCase().includes(text) ?? false);

        const staff = matches
            ? node.staff
            : (node.staff ?? []).filter((x) => x.fullName.toLowerCase().includes(text));

        if (!matches && children.length === 0 && (staff?.length ?? 0) === 0) return null;
        return {...node, children, staff};
    };

    return nodes.map(keep).filter((n): n is OrgTreeNode => n !== null);
}
