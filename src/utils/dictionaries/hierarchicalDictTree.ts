// Generic утилиты для иерархических справочников (дерево, поиск, глубина)
export interface TreeDictItem {
    id: number;
    parentId: number | null;
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
}

export type DictTreeNode<T extends TreeDictItem> = T & { children: DictTreeNode<T>[] };

export function buildTree<T extends TreeDictItem>(items: T[]): DictTreeNode<T>[] {
    const map = new Map<number, DictTreeNode<T>>();
    items.forEach((item) => map.set(item.id, {...item, children: []}));

    const roots: DictTreeNode<T>[] = [];
    map.forEach((node) => {
        if (node.parentId != null && map.has(node.parentId)) {
            map.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortRec = (nodes: DictTreeNode<T>[]) => {
        nodes.sort((a, b) => a.titleRu.localeCompare(b.titleRu, "ru"));
        nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);

    return roots;
}

export function filterTree<T extends TreeDictItem>(nodes: DictTreeNode<T>[], term: string): DictTreeNode<T>[] {
    const lower = term.trim().toLowerCase();
    if (!lower) return nodes;

    const walk = (list: DictTreeNode<T>[]): DictTreeNode<T>[] =>
        list
            .map((node) => {
                const children = walk(node.children);
                const selfMatch = node.titleRu.toLowerCase().includes(lower);
                if (selfMatch || children.length > 0) return {...node, children};
                return null;
            })
            .filter((n): n is DictTreeNode<T> => n !== null);

    return walk(nodes);
}

export function collectDescendantIds<T extends TreeDictItem>(node: DictTreeNode<T>): Set<number> {
    const ids = new Set<number>();
    const walk = (n: DictTreeNode<T>) => {
        n.children.forEach((c) => {
            ids.add(c.id);
            walk(c);
        });
    };
    walk(node);
    return ids;
}

export function findNode<T extends TreeDictItem>(nodes: DictTreeNode<T>[], id: number): DictTreeNode<T> | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
    }
    return null;
}

export function computeLevels<T extends TreeDictItem>(tree: DictTreeNode<T>[]): Map<number, number> {
    const levels = new Map<number, number>();
    const walk = (nodes: DictTreeNode<T>[], level: number) => {
        nodes.forEach((node) => {
            levels.set(node.id, level);
            walk(node.children, level + 1);
        });
    };
    walk(tree, 1);
    return levels;
}

export function subtreeHeight<T extends TreeDictItem>(node: DictTreeNode<T>): number {
    if (node.children.length === 0) return 1;
    return 1 + Math.max(...node.children.map(subtreeHeight));
}