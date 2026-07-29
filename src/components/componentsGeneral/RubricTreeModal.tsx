import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, ChevronRight, Minus, X, ArrowUpRight} from "lucide-react";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";

export interface RubricTreeOption {
    key: string;
    label: string;
    parentId?: string;
}

interface TreeNode extends RubricTreeOption {
    children: TreeNode[];
}

interface RubricTreeModalProps {
    open: boolean;
    onClose: () => void;

    title: string;
    options: RubricTreeOption[];
    selectedKeys: string[];
    onApply: (keys: string[]) => void;

    searchPlaceholder?: string;

    // Заглушка — переход к реестру с фильтром по конкретной рубрике.
    // Пока просто логируем ключ, позже сюда подключим реальный переход.
    onGoToRubric?: (key: string) => void;
}

function buildTree(options: RubricTreeOption[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>(
        options.map((o) => [o.key, {...o, children: []}])
    );
    const roots: TreeNode[] = [];

    nodeMap.forEach((node) => {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

function getAllDescendantKeys(node: TreeNode): string[] {
    return node.children.flatMap((c) => [c.key, ...getAllDescendantKeys(c)]);
}

function getAllKeysInTree(nodes: TreeNode[]): string[] {
    return nodes.flatMap((n) => [n.key, ...getAllDescendantKeys(n)]);
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
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
        .filter((n): n is TreeNode => n !== null);
}

const GREEN = "#1c9c5c";

export function RubricTreeModal({
                                    open,
                                    onClose,
                                    title,
                                    options,
                                    selectedKeys,
                                    onApply,
                                    searchPlaceholder,
                                    onGoToRubric,
                                }: RubricTreeModalProps) {
    const {t} = useTranslation();
    const [draft, setDraft] = useState<string[]>(selectedKeys);
    const [query, setQuery] = useState("");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [prevOpen, setPrevOpen] = useState(open);
    const panelRef = useRef<HTMLDivElement>(null);

    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setDraft(selectedKeys);
            setQuery("");
            setCollapsed(new Set());
        }
    }

    if (!open) return null;

    const tree = buildTree(options);
    const nodeByKey = new Map<string, TreeNode>();
    (function index(nodes: TreeNode[]) {
        nodes.forEach((n) => {
            nodeByKey.set(n.key, n);
            index(n.children);
        });
    })(tree);

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

    const toggle = (node: TreeNode) => {
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

    const isPartiallySelected = (node: TreeNode): boolean => {
        if (node.children.length === 0) return false;
        const descendantKeys = getAllDescendantKeys(node);
        const selectedCount = descendantKeys.filter((k) => draft.includes(k)).length;
        return selectedCount > 0 && selectedCount < descendantKeys.length && !draft.includes(node.key);
    };

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    const handleBackdropClick = () => {
        panelRef.current?.animate(
            [
                {transform: "translateX(0)"},
                {transform: "translateX(-3px)"},
                {transform: "translateX(3px)"},
                {transform: "translateX(-2px)"},
                {transform: "translateX(2px)"},
                {transform: "translateX(0)"},
            ],
            {duration: 220, easing: "ease-in-out"}
        );
    };

    const handleGoToRubric = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        // TODO: заменить на реальный переход к реестру ВНД с применённым фильтром по рубрике
        onGoToRubric?.(key);
    };

    const renderNode = (node: TreeNode, depth: number) => {
        const on = draft.includes(node.key);
        const partial = isPartiallySelected(node);
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsed.has(node.key);

        return (
            <div key={node.key}>
                <div
                    className="group w-full flex items-center gap-[7px] px-2.5 py-[9px] rounded-lg hover:bg-[#f6f8fb]"
                    style={{paddingLeft: `${10 + depth * 20}px`}}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleCollapse(node.key)}
                            className="w-4 h-4 flex-none grid place-items-center text-[#a3adbd] cursor-pointer"
                        >
                            <ChevronRight
                                className={`w-[13px] h-[13px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                                strokeWidth={2.5}
                            />
                        </button>
                    ) : (
                        <span className="w-4 h-4 flex-none"/>
                    )}

                    <button
                        type="button"
                        onClick={() => toggle(node)}
                        className="flex-none flex items-center cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 rounded-md grid place-items-center ${
                                on
                                    ? "border-[1.5px]"
                                    : partial
                                        ? "border-[1.5px]"
                                        : "border-[1.5px] border-[#cbd3df] bg-white"
                            }`}
                            style={
                                on
                                    ? {borderColor: GREEN, background: GREEN}
                                    : partial
                                        ? {borderColor: GREEN, background: "white"}
                                        : undefined
                            }
                        >
                            {on && <Check className="w-[13px] h-[13px] text-white" strokeWidth={3}/>}
                            {!on && partial && <Minus className="w-[13px] h-[13px]" style={{color: GREEN}} strokeWidth={3}/>}
                        </span>
                    </button>

                    {/* Название — при наведении подсказывает переход к реестру с этим фильтром (пока заглушка) */}
                    <button
                        type="button"
                        onClick={(e) => handleGoToRubric(e, node.key)}
                        title="Перейти к реестру с фильтром по этой рубрике"
                        className="flex-1 flex items-center gap-1.5 text-left cursor-pointer min-w-0"
                    >
                        <span className="text-[13.5px] text-[#26324a] group-hover:underline truncate">
                            <HighlightText text={node.label} query={query}/>
                        </span>
                        <ArrowUpRight
                            className="w-[13px] h-[13px] flex-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{color: GREEN}}
                            strokeWidth={2}
                        />
                    </button>
                </div>

                {hasChildren && !isCollapsed && (
                    <div>
                        {node.children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden flex flex-col"
            >
                {/* Заголовок — по центру */}
                <div className="relative flex items-center justify-center px-5 py-4 border-b border-[#eef2f7] flex-none">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740] text-center">{title}</h3>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                {/* Фильтр */}
                <div className="px-5 pt-4 pb-2 flex-none">
                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder={searchPlaceholder ?? t("general.search")}
                    />
                </div>

                {/* Все / Снять все */}
                <div className="flex items-center justify-between px-5 pb-2 flex-none">
                    <button
                        type="button"
                        onClick={selectAll}
                        disabled={allSelected}
                        className="text-[11px] font-semibold cursor-pointer"
                        style={{color: allSelected ? "#c3ccd8" : GREEN}}
                    >
                        {t("general.selectAll")}
                    </button>
                    <button
                        type="button"
                        onClick={deselectAll}
                        disabled={noneSelected}
                        className="text-[11px] font-semibold cursor-pointer"
                        style={{color: noneSelected ? "#c3ccd8" : GREEN}}
                    >
                        {t("general.deselectAll")}
                    </button>
                </div>

                {/* Дерево */}
                <div className="flex-1 overflow-y-auto p-2">
                    {visibleTree.length === 0 && (
                        <div className="px-3 py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("general.notFound")}
                        </div>
                    )}
                    {visibleTree.map((node) => renderNode(node, 0))}
                </div>

                {/* Кнопки */}
                <div className="flex items-center justify-between gap-2.5 px-5 py-4 border-t border-[#eef2f7] flex-none">
                    <span className="text-[12px] text-[#8b97ab]">
                        Выбрано:{" "}
                        <b className="text-[#3a4560] font-mono">{draft.length}</b>
                    </span>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onClose}
                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            {t("general.cancel")}
                        </button>
                        <button
                            onClick={handleApply}
                            className="h-9 px-5 rounded-[9px] border-none text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                            style={{background: GREEN}}
                        >
                            Перейти
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}