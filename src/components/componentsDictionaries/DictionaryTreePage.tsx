// Универсальная страница иерархического справочника (дерево + CRUD)
import type {LucideIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {ArrowLeft, Plus} from "lucide-react";

import {DictionaryFormModal} from "@/components/componentsDictionaries/DictionaryFormModal.tsx";
import {DictionaryTreeNode} from "@/components/componentsDictionaries/DictionaryTreeNode.tsx";

import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

import type {TreeDictItem} from "@/utils/dictionaries/hierarchicalDictTree.ts";
import type {HierarchicalDictTreeResult} from "@/hooks/dictionariesHooks/useHierarchicalDictTree.ts";

interface DictionaryTreePageProps<T extends TreeDictItem> {
    // Данные и колбэки - прокидываются из конкретного хука (useApprovalBodyTree и т.п.)
    tree: HierarchicalDictTreeResult<T>;
    // Кому можно управлять справочником (уже посчитанный hasPermission(...) снаружи)
    canManage: boolean;

    // Конфиг страницы
    pageKey: string;       // "approvalBodyPage" / "organizationUnitPage" - префикс i18n ключей
    icon: LucideIcon;
    backTo: string;        // куда ведёт кнопка "Назад", напр. "/refs"
    backLabelKey: string;  // "dictionaries.navigateGeneral" и т.п.
}

export function DictionaryTreePage<T extends TreeDictItem>({
                                                               tree,
                                                               canManage,
                                                               pageKey,
                                                               icon: Icon,
                                                               backTo,
                                                               backLabelKey,
                                                           }: DictionaryTreePageProps<T>) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const {
        loading, error, filteredTree, isSearching, search, setSearch,
        collapsed, toggleCollapse, refetch,
        formModal, formInitialValues, parentOptions, submitting, formError,
        openCreateRoot, openCreateChild, openEdit, closeFormModal, submitForm,
        deleteTarget, deleting, deleteError, openDelete, closeDelete, confirmDelete,
    } = tree;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate(backTo)}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t(backLabelKey)}
            </button>

            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <span className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                            <Icon className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                        </span>
                        <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                            {t(`${pageKey}.title`)}
                        </h1>
                    </div>
                </div>

                {canManage && !loading && !error && (
                    <button
                        type="button"
                        onClick={openCreateRoot}
                        className="flex-none inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[15px] h-[15px]" strokeWidth={2.2}/>
                        {t("dictionaries.addRoot")}
                    </button>
                )}
            </div>

            {!loading && !error && (
                <div className="mb-4">
                    <SearchBar
                        variant="gray"
                        value={search}
                        onChange={setSearch}
                        placeholder={t(`${pageKey}.searchPlaceholder`)}
                    />
                </div>
            )}

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && error && (
                <EmptyState
                    variant="error"
                    title={t("dictionaries.loadError")}
                    actionLabel={t("general.retry")}
                    onAction={refetch}
                />
            )}

            {!loading && !error && filteredTree.length === 0 && (
                <EmptyState
                    variant="empty"
                    icon={Icon}
                    title={isSearching ? t("general.notFound") : t("dictionaries.empty")}
                    actionLabel={!isSearching && canManage ? t(`${pageKey}.emptyAction`) : undefined}
                    onAction={!isSearching && canManage ? openCreateRoot : undefined}
                />
            )}

            {!loading && !error && filteredTree.length > 0 && (
                <div className="bg-white border border-[#e9edf3] rounded-2xl p-2 min-h-[200px]">
                    {filteredTree.map((node) => (
                        <DictionaryTreeNode
                            key={node.id}
                            node={node}
                            depth={0}
                            query={search}
                            forceExpanded={isSearching}
                            collapsed={collapsed}
                            onToggleCollapse={toggleCollapse}
                            canManage={canManage}
                            onAddChild={openCreateChild}
                            onEdit={openEdit}
                            onDelete={openDelete}
                        />
                    ))}
                </div>
            )}

            {formModal && (
                <DictionaryFormModal
                    open
                    onClose={closeFormModal}
                    mode={formModal.mode}
                    initialValues={formInitialValues}
                    parentOptions={parentOptions}
                    submitting={submitting}
                    error={formError}
                    onSubmit={submitForm}
                    pageKey={pageKey}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteModal
                    open
                    onClose={closeDelete}
                    onConfirm={confirmDelete}
                    loading={deleting}
                    error={deleteError}
                    title={t(`${pageKey}.deleteConfirmTitle`)}
                    message={t("dictionaries.deleteConfirmMessage", {name: deleteTarget.titleRu})}

                />
            )}
        </div>
    );
}