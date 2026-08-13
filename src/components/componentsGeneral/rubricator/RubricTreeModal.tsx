// Модальное окно рубрикатора
import React from "react";
import {useTranslation} from "react-i18next";
import {useTreeMultiSelect} from "@/hooks//useTreeMultiSelect.ts";
import {useModalShake} from "@/hooks//useModalShake.ts";
import type {BaseTreeOption, TreeNodeOf} from "@/utils/treeSelectUtils.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {ModalHeader} from "@/components/componentsGeneral/rubricator/ModalHeader.tsx";
import {SelectAllBar} from "@/components/componentsGeneral/rubricator/SelectAllBar.tsx";
import {RubricTreeNode} from "@/components/componentsGeneral/rubricator/RubricTreeNode.tsx";
import {ModalFooter} from "@/components/componentsGeneral/rubricator/ModalFooter.tsx";


export type RubricTreeOption = BaseTreeOption;

interface RubricTreeModalProps {
    open: boolean;
    onClose: () => void;

    title: string;
    options: RubricTreeOption[];
    selectedKeys: string[];
    onApply: (keys: string[]) => void;

    searchPlaceholder?: string;

    // Переход к реестру с фильтром по конкретной рубрике
    onGoToRubric?: (key: string) => void;
}

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

    const handleGoToRubric = (_e: React.MouseEvent, key: string) => {
        onGoToRubric?.(key);
    };

    const isSelected = (key: string) => draft.includes(key);
    const isCollapsed = (key: string) => collapsed.has(key);

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
                <ModalHeader
                    title={title}
                    onClose={onClose}
                    helpContent={t("rubricTreeModal.helpTooltip")}
                />

                <div className="px-5 pt-4 pb-2 flex-none">
                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder={searchPlaceholder ?? t("general.search")}
                    />
                </div>

                <SelectAllBar
                    allSelected={allSelected}
                    noneSelected={noneSelected}
                    onSelectAll={selectAll}
                    onDeselectAll={deselectAll}
                />

                <div className="flex-1 overflow-y-auto p-2" role="tree">
                    {visibleTree.length === 0 && (
                        <div className="px-3 py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("general.notFound")}
                        </div>
                    )}
                    {visibleTree.map((node: TreeNodeOf<RubricTreeOption>) => (
                        <RubricTreeNode
                            key={node.key}
                            node={node}
                            depth={0}
                            query={query}
                            isSelected={isSelected}
                            isPartiallySelected={isPartiallySelected}
                            isCollapsed={isCollapsed}
                            onToggle={toggle}
                            onToggleCollapse={toggleCollapse}
                            onGoToRubric={handleGoToRubric}
                            goToRubricLabel={t("rubricTreeModal.goToRubric")}
                        />
                    ))}
                </div>

                <ModalFooter
                    counterLabel={t("rubricTreeModal.selectedCount")}
                    counterValue={draft.length}
                    onCancel={onClose}
                    onApply={handleApply}
                    applyLabel={t("rubricTreeModal.apply")}
                />
            </div>
        </div>
    );
}