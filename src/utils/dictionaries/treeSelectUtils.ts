// Функции дерева в компонентах Select
export interface BaseTreeOption {
    key: string;
    label: string;
    parentId?: string;
}

export type TreeNodeOf<T extends BaseTreeOption> = T & { children: TreeNodeOf<T>[] };

export function buildTree<T extends BaseTreeOption>(options: T[]): TreeNodeOf<T>[] {
    const nodeMap = new Map<string, TreeNodeOf<T>>(
        options.map((o) => [o.key, {...o, children: []}])
    );
    const roots: TreeNodeOf<T>[] = [];

    nodeMap.forEach((node) => {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export function getAllDescendantKeys<T extends BaseTreeOption>(node: TreeNodeOf<T>): string[] {
    return node.children.flatMap((c) => [c.key, ...getAllDescendantKeys(c)]);
}

export function getAllKeysInTree<T extends BaseTreeOption>(nodes: TreeNodeOf<T>[]): string[] {
    return nodes.flatMap((n) => [n.key, ...getAllDescendantKeys(n)]);
}

/** Возвращает узлы, которые сами совпадают с запросом или содержат совпадающих потомков */
export function filterTree<T extends BaseTreeOption>(nodes: TreeNodeOf<T>[], query: string): TreeNodeOf<T>[] {
    const q = query.toLowerCase();
    return nodes
        .map((node) => {
            const filteredChildren = filterTree(node.children, query);
            const selfMatches = node.label.toLowerCase().includes(q);
            if (selfMatches || filteredChildren.length > 0) {
                return {...node, children: filteredChildren};
            }
            return null;
        })
        .filter((n): n is TreeNodeOf<T> => n !== null);
}

/** Цепочка узла от корня к самому узлу (включительно) по его ключу - например, для СП
 * "Заместитель правления" внутри "Правление" вернёт [Правление, Заместитель правления].
 * Используется, чтобы в закрытом поле/чипсе показывать путь целиком, а не только название
 * самого узла - одноимённые СП могут повторяться в разных ветках оргструктуры (филиалах). */
export function getAncestorPath<T extends BaseTreeOption>(options: T[], key: string): T[] {
    const byKey = new Map(options.map((o) => [o.key, o]));
    const path: T[] = [];
    let current = byKey.get(key);
    const seen = new Set<string>();
    while (current && !seen.has(current.key)) {
        path.unshift(current);
        seen.add(current.key);
        current = current.parentId ? byKey.get(current.parentId) : undefined;
    }
    return path;
}

export function buildNodeIndex<T extends BaseTreeOption>(nodes: TreeNodeOf<T>[]): Map<string, TreeNodeOf<T>> {
    const map = new Map<string, TreeNodeOf<T>>();
    const index = (list: TreeNodeOf<T>[]) => {
        list.forEach((n) => {
            map.set(n.key, n);
            index(n.children);
        });
    };
    index(nodes);
    return map;
}
/** Ключи узлов-корней вместе со всеми их потомками (на любую глубину).
 *
 * Нужна там, где выбор одного СП должен захватывать и вложенные: после
 * синхронизации оргструктуры сотрудники сидят в отделах и секторах, а
 * выбирают обычно департамент или управление целиком — при точном
 * совпадении по id список оказывается пустым. Работает по плоскому списку
 * {key, parentId}, без построения дерева; защищена от циклов. */
export function collectSubtreeKeys<T extends BaseTreeOption>(options: T[], rootKeys: Iterable<string>): Set<string> {
    const childrenByParent = new Map<string, string[]>();
    options.forEach((o) => {
        if (!o.parentId) return;
        const list = childrenByParent.get(o.parentId);
        if (list) list.push(o.key);
        else childrenByParent.set(o.parentId, [o.key]);
    });

    const result = new Set<string>();
    const stack = Array.from(rootKeys);
    while (stack.length > 0) {
        const key = stack.pop()!;
        if (result.has(key)) continue;
        result.add(key);
        childrenByParent.get(key)?.forEach((child) => stack.push(child));
    }
    return result;
}
