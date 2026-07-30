// Хук с состоянием и логикой multi-select дерева
// Для рубрикатора, select с иерархией и множественным выбором
import {useState} from "react";
import {
    buildNodeIndex,
    buildTree,
    filterTree,
    getAllDescendantKeys,
    getAllKeysInTree,
    type BaseTreeOption,
    type TreeNodeOf,
} from "@/utils/treeSelectUtils.ts";

interface UseTreeMultiSelectParams<T extends BaseTreeOption> {
    open: boolean;
    options: T[];
    selectedKeys: string[];
}

export function useTreeMultiSelect<T extends BaseTreeOption>({
                                                                 open,
                                                                 options,
                                                                 selectedKeys,
                                                             }: UseTreeMultiSelectParams<T>) {
    const [draft, setDraft] = useState<string[]>(selectedKeys);
    const [query, setQuery] = useState("");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [prevOpen, setPrevOpen] = useState(open);

    // Сброс черновика при каждом открытии модалки — обновление state во время рендера
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setDraft(selectedKeys);
            setQuery("");
            setCollapsed(new Set());
        }
    }

    const tree = buildTree(options);
    const nodeByKey = buildNodeIndex(tree);
    const visibleTree = query.trim() ? filterTree(tree, query.trim()) : tree;
    const allKeys = getAllKeysInTree(tree);

    const allSelected = allKeys.length > 0 && draft.length === allKeys.length;
    const noneSelected = draft.length === 0;

    const selectAll = () => setDraft(allKeys);
    const deselectAll = () => setDraft([]);

    const toggleCollapse = (key: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    // Переключение узла + каскад на детей; после этого пересчитываем родителей
    const toggle = (node: TreeNodeOf<T>) => {
        setDraft((prev) => {
            const isSelected = prev.includes(node.key);
            const descendantKeys = getAllDescendantKeys(node);
            const affected = [node.key, ...descendantKeys];

            let next: string[];
            if (isSelected) {
                next = prev.filter((k) => !affected.includes(k));
            } else {
                next = Array.from(new Set([...prev, ...affected]));
            }

            let current = node.parentId ? nodeByKey.get(node.parentId) : undefined;
            while (current) {
                const childKeys = current.children.map((c) => c.key);
                const allChildrenSelected = childKeys.every((k) => next.includes(k));
                const hasParent = next.includes(current.key);

                if (allChildrenSelected && !hasParent) {
                    next = [...next, current.key];
                } else if (!allChildrenSelected && hasParent) {
                    next = next.filter((k) => k !== current!.key);
                }

                current = current.parentId ? nodeByKey.get(current.parentId) : undefined;
            }

            return next;
        });
    };

    const isPartiallySelected = (node: TreeNodeOf<T>): boolean => {
        if (node.children.length === 0) return false;
        const descendantKeys = getAllDescendantKeys(node);
        const selectedCount = descendantKeys.filter((k) => draft.includes(k)).length;
        return selectedCount > 0 && selectedCount < descendantKeys.length && !draft.includes(node.key);
    };

    return {
        draft,
        query, setQuery,
        collapsed, toggleCollapse,
        visibleTree,
        allSelected, noneSelected,
        selectAll, deselectAll,
        toggle, isPartiallySelected,
    };
}