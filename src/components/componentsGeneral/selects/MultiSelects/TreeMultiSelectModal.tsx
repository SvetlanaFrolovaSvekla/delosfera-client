// Модалка с иерархическим списком, множественным выбором
import {useTranslation} from "react-i18next";
import {useTreeMultiSelect} from "@/hooks//useTreeMultiSelect.ts";
import {useModalShake} from "@/hooks//useModalShake.ts";
import type {BaseTreeOption, TreeNodeOf} from "@/utils/treeSelectUtils.ts";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Check, ChevronRight, Minus, X} from "lucide-react";
export type TreeSelectOption = BaseTreeOption;

interface TreeMultiSelectModalProps {
    open: boolean;
    onClose: () => void;

    title: string;
    options: TreeSelectOption[];
    selectedKeys: string[];
    onApply: (keys: string[]) => void;

    searchPlaceholder?: string;
    selectedCountLabel?: string;
}

export function TreeMultiSelectModal({
                                         open,
                                         onClose,
                                         title,
                                         options,
                                         selectedKeys,
                                         onApply,
                                         searchPlaceholder,
                                         selectedCountLabel,
                                     }: TreeMultiSelectModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();
    const {
        draft, query, setQuery, collapsed, toggleCollapse,
        visibleTree, allSelected, noneSelected, selectAll, deselectAll,
        toggle, isPartiallySelected,
    } = useTreeMultiSelect({open, options, selectedKeys});

    if (!open) return null;

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    const renderNode = (node: TreeNodeOf<TreeSelectOption>, depth: number) => {
        const on = draft.includes(node.key);
        const partial = isPartiallySelected(node);
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsed.has(node.key);

        return (
            <div key={node.key}>
                <div
                    className="w-full flex items-center gap-[7px] px-2.5 py-[9px] rounded-lg hover:bg-[#f6f8fb]"
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
                        className="flex-1 flex items-center gap-[11px] text-left cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 flex-none rounded-md grid place-items-center ${
                                on
                                    ? "border-[1.5px] border-[#4e57d6] bg-[#4e57d6]"
                                    : partial
                                        ? "border-[1.5px] border-[#4e57d6] bg-white"
                                        : "border-[1.5px] border-[#cbd3df] bg-white"
                            }`}
                        >
                            {on && <Check className="w-[13px] h-[13px] text-white" strokeWidth={3}/>}
                            {!on && partial && <Minus className="w-[13px] h-[13px] text-[#4e57d6]" strokeWidth={3}/>}
                        </span>
                        <span className="text-[13.5px] text-[#26324a]">
                            <HighlightText text={node.label} query={query}/>
                        </span>
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