// Один элемент рубрикатора (надпись с чекбоксом)
import React, {memo} from "react";
import {ChevronRight, ArrowUpRight} from "lucide-react";
import type {TreeNodeOf} from "@/utils/treeSelectUtils.ts";
import type {RubricTreeOption} from "./RubricTreeModal";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {TreeCheckbox} from "@/components/componentsGeneral/rubricator/TreeCheckbox.tsx";

interface RubricTreeNodeProps {
    node: TreeNodeOf<RubricTreeOption>;
    depth: number;
    query: string;
    isSelected: (key: string) => boolean;
    isPartiallySelected: (node: TreeNodeOf<RubricTreeOption>) => boolean;
    isCollapsed: (key: string) => boolean;
    onToggle: (node: TreeNodeOf<RubricTreeOption>) => void;
    onToggleCollapse: (key: string) => void;
    onGoToRubric?: (e: React.MouseEvent, key: string) => void;
    goToRubricLabel?: string;
}

function RubricTreeNodeComponent({
                                     node,
                                     depth,
                                     query,
                                     isSelected,
                                     isPartiallySelected,
                                     isCollapsed,
                                     onToggle,
                                     onToggleCollapse,
                                     onGoToRubric,
                                     goToRubricLabel,
                                 }: RubricTreeNodeProps) {
    const on = isSelected(node.key);
    const partial = isPartiallySelected(node);
    const hasChildren = node.children.length > 0;
    const collapsed = isCollapsed(node.key);

    const handleGoTo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onGoToRubric?.(e, node.key);
    };

    return (
        <div>
            <div
                className="group w-full flex items-center gap-[7px] px-2.5 py-[9px] rounded-lg hover:bg-[#f6f8fb]"
                style={{paddingLeft: `${10 + depth * 20}px`}}
                role="treeitem"
                aria-expanded={hasChildren ? !collapsed : undefined}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => onToggleCollapse(node.key)}
                        aria-expanded={!collapsed}
                        className="w-4 h-4 flex-none grid place-items-center text-[#a3adbd] cursor-pointer"
                    >
                        <ChevronRight
                            className={`w-[13px] h-[13px] transition-transform ${collapsed ? "" : "rotate-90"}`}
                            strokeWidth={2.5}
                        />
                    </button>
                ) : (
                    <span className="w-4 h-4 flex-none"/>
                )}

                <button
                    type="button"
                    onClick={() => onToggle(node)}
                    className="flex-none flex items-center cursor-pointer"
                >
                    <TreeCheckbox checked={on} indeterminate={partial}/>
                </button>

                <button
                    type="button"
                    onClick={handleGoTo}
                    title={goToRubricLabel}
                    className="flex-1 flex items-center gap-1.5 text-left cursor-pointer min-w-0"
                >
                    <span className="text-[13.5px] text-[#26324a] group-hover:underline truncate">
                        <HighlightText text={node.label} query={query}/>
                    </span>
                    <ArrowUpRight
                        className="w-[13px] h-[13px] flex-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{color: "#1c9c5c"}}
                        strokeWidth={2}
                    />
                </button>
            </div>

            {hasChildren && !collapsed && (
                <div role="group">
                    {node.children.map((child) => (
                        <RubricTreeNodeComponent
                            key={child.key}
                            node={child}
                            depth={depth + 1}
                            query={query}
                            isSelected={isSelected}
                            isPartiallySelected={isPartiallySelected}
                            isCollapsed={isCollapsed}
                            onToggle={onToggle}
                            onToggleCollapse={onToggleCollapse}
                            onGoToRubric={onGoToRubric}
                            goToRubricLabel={goToRubricLabel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export const RubricTreeNode = memo(RubricTreeNodeComponent);