// Одна строка дерева + дочерние строки - для любого иерархического справочника
import {ChevronRight, Pencil, Plus, Trash2} from "lucide-react";
import {useTranslation} from "react-i18next";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import type {TreeDictItem, DictTreeNode} from "@/utils/dictionaries/hierarchicalDictTree.ts";

interface DictionaryTreeNodeProps<T extends TreeDictItem> {
    node: DictTreeNode<T>;
    depth: number;
    query: string;
    forceExpanded: boolean;
    collapsed: Set<number>;
    onToggleCollapse: (id: number) => void;
    canManage: boolean;
    onAddChild: (parentId: number) => void;
    onEdit: (node: DictTreeNode<T>) => void;
    onDelete: (node: DictTreeNode<T>) => void;
}

export function DictionaryTreeNode<T extends TreeDictItem>({
                                                               node,
                                                               depth,
                                                               query,
                                                               forceExpanded,
                                                               collapsed,
                                                               onToggleCollapse,
                                                               canManage,
                                                               onAddChild,
                                                               onEdit,
                                                               onDelete,
                                                           }: DictionaryTreeNodeProps<T>) {
    const {t} = useTranslation();
    const hasChildren = node.children.length > 0;
    const isExpanded = forceExpanded || !collapsed.has(node.id);

    return (
        <div>
            <div className="group flex items-stretch rounded-lg hover:bg-[#f6f8fb]">
                {Array.from({length: depth}).map((_, i) => (
                    <span key={i} className="w-5 flex-none flex justify-center">
                        <span className="w-px bg-[#e5e9f0]"/>
                    </span>
                ))}

                <div className="flex-1 min-w-0 flex items-center gap-[7px] py-[9px] pl-2.5 pr-2.5">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => onToggleCollapse(node.id)}
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

                    <span className="flex-1 min-w-0 text-[13.5px] text-[#26324a] truncate">
                        <HighlightText text={node.titleRu} query={query}/>
                    </span>

                    {canManage && (
                        <div className="flex-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip content={t("dictionaries.addChildAction")} side="top">
                                <button
                                    type="button"
                                    onClick={() => onAddChild(node.id)}
                                    className="w-7 h-7 grid place-items-center rounded-md bg-[#e6f7ed] text-[#1f9d55] cursor-pointer transition-colors hover:bg-[#cdf0dc] hover:text-[#15803d]"
                                >
                                    <Plus className="w-[14px] h-[14px]" strokeWidth={2}/>
                                </button>
                            </Tooltip>

                            <Tooltip content={t("dictionaries.editAction")} side="top">
                                <button
                                    type="button"
                                    onClick={() => onEdit(node)}
                                    className="w-7 h-7 grid place-items-center rounded-md bg-[#ececfc] text-[#4e57d6] cursor-pointer transition-colors hover:bg-[#dcdefa] hover:text-[#3a42b8]"
                                >
                                    <Pencil className="w-[13px] h-[13px]" strokeWidth={2}/>
                                </button>
                            </Tooltip>

                            <Tooltip content={t("dictionaries.deleteAction")} side="top">
                                <button
                                    type="button"
                                    onClick={() => onDelete(node)}
                                    className="w-7 h-7 grid place-items-center rounded-md bg-[#fdeceb] text-[#c0392b] cursor-pointer transition-colors hover:bg-[#fad9d7] hover:text-[#a52d21]"
                                >
                                    <Trash2 className="w-[13px] h-[13px]" strokeWidth={2}/>
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {node.children.map((child) => (
                        <DictionaryTreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            query={query}
                            forceExpanded={forceExpanded}
                            collapsed={collapsed}
                            onToggleCollapse={onToggleCollapse}
                            canManage={canManage}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}