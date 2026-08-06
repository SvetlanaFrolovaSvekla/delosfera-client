// Модалка множественного выбора узлов дерева БЕЗ каскада + поддержка disabled-опций (например, превышена макс. глубина)
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks//useModalShake.ts";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Check, ChevronRight, X} from "lucide-react";

export interface ParentTreeOption {
    key: string;
    label: string;
    parentId?: string;
    disabled?: boolean;
    disabledReason?: string;
}

interface ParentTreeNode extends ParentTreeOption {
    children: ParentTreeNode[];
}

interface ParentTreeMultiSelectModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    options: ParentTreeOption[];
    selectedKeys: string[];
    onApply: (keys: string[]) => void;
    searchPlaceholder?: string;
    selectedCountLabel?: string;
}

function buildTree(options: ParentTreeOption[]): ParentTreeNode[] {
    const map = new Map<string, ParentTreeNode>();
    options.forEach((o) => map.set(o.key, {...o, children: []}));

    const roots: ParentTreeNode[] = [];
    map.forEach((node) => {
        if (node.parentId != null && map.has(node.parentId)) {
            map.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortRec = (nodes: ParentTreeNode[]) => {
        nodes.sort((a, b) => a.label.localeCompare(b.label, "ru"));
        nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);

    return roots;
}

function filterTree(nodes: ParentTreeNode[], term: string): ParentTreeNode[] {
    const lower = term.trim().toLowerCase();
    if (!lower) return nodes;

    const walk = (list: ParentTreeNode[]): ParentTreeNode[] =>
        list
            .map((node) => {
                const children = walk(node.children);
                const selfMatch = node.label.toLowerCase().includes(lower);
                if (selfMatch || children.length > 0) return {...node, children};
                return null;
            })
            .filter((n): n is ParentTreeNode => n !== null);

    return walk(nodes);
}

function collectExpandedKeys(nodes: ParentTreeNode[], selectedKeys: string[]): Set<string> {
    const expanded = new Set<string>();
    const selectedSet = new Set(selectedKeys);

    const walk = (node: ParentTreeNode): boolean => {
        const childHasSelected = node.children.map(walk).some(Boolean);
        const selfSelected = selectedSet.has(node.key);
        if (childHasSelected) expanded.add(node.key);
        return childHasSelected || selfSelected;
    };
    nodes.forEach(walk);

    return expanded;
}

/** Ключи всех выбираемых (не disabled) узлов — для "Выбрать все" */
function flattenSelectableKeys(nodes: ParentTreeNode[]): string[] {
    const keys: string[] = [];
    const walk = (n: ParentTreeNode) => {
        if (!n.disabled) keys.push(n.key);
        n.children.forEach(walk);
    };
    nodes.forEach(walk);
    return keys;
}

export function ParentTreeMultiSelectModal({
                                               open,
                                               onClose,
                                               title,
                                               options,
                                               selectedKeys,
                                               onApply,
                                               searchPlaceholder,
                                               selectedCountLabel,
                                           }: ParentTreeMultiSelectModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();

    const [draft, setDraft] = useState<string[]>(selectedKeys);
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const tree = useMemo(() => buildTree(options), [options]);
    const selectableKeys = useMemo(() => flattenSelectableKeys(tree), [tree]);

    useEffect(() => {
        if (!open) return;
        setDraft(selectedKeys);
        setQuery("");
        setExpanded(collectExpandedKeys(tree, selectedKeys));
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null;

    const isSearching = query.trim().length > 0;
    const visibleTree = isSearching ? filterTree(tree, query) : tree;

    const toggleExpand = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggle = (node: ParentTreeNode) => {
        if (node.disabled) return;
        setDraft((prev) => (prev.includes(node.key) ? prev.filter((k) => k !== node.key) : [...prev, node.key]));
    };

    const allSelected = selectableKeys.length > 0 && selectableKeys.every((k) => draft.includes(k));
    const noneSelected = draft.length === 0;

    const selectAll = () => setDraft(selectableKeys);
    const deselectAll = () => setDraft([]);

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    const renderNode = (node: ParentTreeNode, depth: number) => {
        const on = draft.includes(node.key);
        const hasChildren = node.children.length > 0;
        const isExpanded = isSearching || expanded.has(node.key);

        return (
            <div key={node.key}>
                <div
                    className={`w-full flex items-center gap-[7px] px-2.5 py-[9px] rounded-lg ${
                        node.disabled ? "" : "hover:bg-[#f6f8fb]"
                    }`}
                    style={{paddingLeft: `${10 + depth * 20}px`}}
                    title={node.disabled ? node.disabledReason : undefined}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleExpand(node.key)}
                            className="w-4 h-4 flex-none grid place-items-center text-[#a3adbd] cursor-pointer"
                        >
                            <ChevronRight
                                className={`w-[13px] h-[13px] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                strokeWidth={2.5}
                            />
                        </button>
                    ) : (
                        <span className="w-4 h-4 flex-none"/>
                    )}

                    <button
                        type="button"
                        onClick={() => toggle(node)}
                        disabled={node.disabled}
                        className={`flex-1 flex items-center gap-[11px] text-left ${
                            node.disabled ? "cursor-not-allowed" : "cursor-pointer"
                        }`}
                    >
                        <span
                            className={`w-5 h-5 flex-none rounded-md grid place-items-center ${
                                node.disabled
                                    ? "border-[1.5px] border-[#e5e9f0] bg-[#f2f5f9]"
                                    : on
                                        ? "border-[1.5px] border-[#4e57d6] bg-[#4e57d6]"
                                        : "border-[1.5px] border-[#cbd3df] bg-white"
                            }`}
                        >
                            {on && !node.disabled && <Check className="w-[13px] h-[13px] text-white" strokeWidth={3}/>}
                        </span>
                        <span className={`text-[13.5px] ${node.disabled ? "text-[#c3ccd8]" : "text-[#26324a]"}`}>
                            <HighlightText text={node.label} query={query}/>
                        </span>
                        {node.disabled && (
                            <span className="text-[10.5px] font-semibold text-[#c3ccd8] bg-[#f6f8fb] px-[7px] py-[2px] rounded-full flex-none">
                                {/* макс. глубина */}
                                {t("approvalBodyPage.maxDepthTag")}
                            </span>
                        )}
                    </button>
                </div>

                {hasChildren && isExpanded && (
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
            className="fixed inset-0 z-[60] bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden flex flex-col"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7] flex-none">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="px-5 pt-4 pb-2 flex-none">
                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder={searchPlaceholder ?? t("general.search")}
                    />
                </div>

                <div className="flex items-center justify-between px-5 pb-2 flex-none">
                    <button
                        type="button"
                        onClick={selectAll}
                        disabled={allSelected}
                        className={`text-[11px] font-semibold cursor-pointer ${
                            allSelected ? "text-[#c3ccd8] cursor-default" : "text-[#4e57d6] hover:underline"
                        }`}
                    >
                        {t("general.selectAll")}
                    </button>
                    <button
                        type="button"
                        onClick={deselectAll}
                        disabled={noneSelected}
                        className={`text-[11px] font-semibold cursor-pointer ${
                            noneSelected ? "text-[#c3ccd8] cursor-default" : "text-[#4e57d6] hover:underline"
                        }`}
                    >
                        {t("general.deselectAll")}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {visibleTree.length === 0 && (
                        <div className="px-3 py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("general.notFound")}
                        </div>
                    )}
                    {visibleTree.map((node) => renderNode(node, 0))}
                </div>

                <div className="flex items-center justify-between gap-2.5 px-5 py-4 border-t border-[#eef2f7] flex-none">
                    <span className="text-[12px] text-[#8b97ab]">
                        {(selectedCountLabel ?? t("general.selectedCount"))}{" "}
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
                            className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                        >
                            {t("general.save")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}