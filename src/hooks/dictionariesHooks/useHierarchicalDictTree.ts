// Generic хук для CRUD + дерево + поиск для любого иерархического справочника
import {useCallback, useMemo, useState} from "react";
import axios from "axios";
import {useTranslation} from "react-i18next";
import {MAX_DICTIONARIES_DEPTH} from "@/constants/validation/dictionariesValidation.ts";
import type {ParentTreeOption} from "@/components/componentsGeneral/selects/MultiSelects/ParentTreeMultiSelectModal.tsx";
import {
    buildTree,
    filterTree,
    collectDescendantIds,
    findNode,
    computeLevels,
    subtreeHeight,
    type TreeDictItem,
    type DictTreeNode,
} from "@/utils/dictionaries/hierarchicalDictTree.ts";

export interface HierarchicalDictFormValues {
    titleRu: string;
    titleEn: string;
    titleKg: string;
    parentKeys: string[];
}

type BasePayloadValues = Omit<HierarchicalDictFormValues, "parentKeys">;

type FormModalState<T extends TreeDictItem> =
    | {mode: "create"; parentId: number | null}
    | {mode: "edit"; node: DictTreeNode<T>};

export interface HierarchicalDictService<TPayload> {
    create: (payload: TPayload) => Promise<unknown>;
    update: (id: number, payload: TPayload) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
}

export interface UseHierarchicalDictTreeOptions<T extends TreeDictItem, TPayload> {
    items: T[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    service: HierarchicalDictService<TPayload>;
    buildPayload: (values: BasePayloadValues, parentId: number | undefined) => TPayload;
    i18n?: {
        saveErrorKey?: string;
        deleteErrorKey?: string;
        maxDepthReasonKey?: string;
    };
}

// Результат хука - используется как тип пропсов для DictionaryTreePage
export interface HierarchicalDictTreeResult<T extends TreeDictItem> {
    loading: boolean;
    error: string | null;
    items: T[];
    filteredTree: DictTreeNode<T>[];
    isSearching: boolean;
    search: string;
    setSearch: (v: string) => void;
    collapsed: Set<number>;
    toggleCollapse: (id: number) => void;
    refetch: () => void;

    formModal: FormModalState<T> | null;
    formInitialValues: HierarchicalDictFormValues;
    parentOptions: ParentTreeOption[];
    submitting: boolean;
    formError: string | null;
    openCreateRoot: () => void;
    openCreateChild: (parentId: number) => void;
    openEdit: (node: DictTreeNode<T>) => void;
    closeFormModal: () => void;
    submitForm: (values: HierarchicalDictFormValues) => void;

    deleteTarget: DictTreeNode<T> | null;
    deleting: boolean;
    deleteError: string | null;
    openDelete: (node: DictTreeNode<T>) => void;
    closeDelete: () => void;
    confirmDelete: () => void;
}

export function useHierarchicalDictTree<T extends TreeDictItem, TPayload>(
    options: UseHierarchicalDictTreeOptions<T, TPayload>
): HierarchicalDictTreeResult<T> {
    const {items, loading, error, refetch, service, buildPayload, i18n} = options;
    const {t} = useTranslation();

    const saveErrorKey = i18n?.saveErrorKey ?? "dictionaries.saveError";
    const deleteErrorKey = i18n?.deleteErrorKey ?? "dictionaries.deleteError";
    const maxDepthReasonKey = i18n?.maxDepthReasonKey ?? "dictionaries.maxDepthReason";

    const [search, setSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

    const [formModal, setFormModal] = useState<FormModalState<T> | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DictTreeNode<T> | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const tree = useMemo(() => buildTree(items), [items]);
    const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);
    const isSearching = search.trim().length > 0;

    const toggleCollapse = useCallback((id: number) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const openCreateRoot = () => {
        setFormError(null);
        setFormModal({mode: "create", parentId: null});
    };

    const openCreateChild = (parentId: number) => {
        setFormError(null);
        setFormModal({mode: "create", parentId});
    };

    const openEdit = (node: DictTreeNode<T>) => {
        setFormError(null);
        setFormModal({mode: "edit", node});
    };

    const closeFormModal = () => {
        if (submitting) return;
        setFormModal(null);
        setFormError(null);
    };

    const formInitialValues: HierarchicalDictFormValues = useMemo(() => {
        if (!formModal) return {titleRu: "", titleEn: "", titleKg: "", parentKeys: []};
        if (formModal.mode === "create") {
            return {
                titleRu: "",
                titleEn: "",
                titleKg: "",
                parentKeys: formModal.parentId != null ? [String(formModal.parentId)] : [],
            };
        }
        return {
            titleRu: formModal.node.titleRu,
            titleEn: formModal.node.titleEn ?? "",
            titleKg: formModal.node.titleKg ?? "",
            parentKeys: formModal.node.parentId != null ? [String(formModal.node.parentId)] : [],
        };
    }, [formModal]);

    const parentOptions: ParentTreeOption[] = useMemo(() => {
        const excludeIds = new Set<number>();
        let requiredHeight = 1;

        if (formModal?.mode === "edit") {
            excludeIds.add(formModal.node.id);
            collectDescendantIds(formModal.node).forEach((id) => excludeIds.add(id));

            const freshNode = findNode(tree, formModal.node.id) ?? formModal.node;
            requiredHeight = subtreeHeight(freshNode);
        }

        const levels = computeLevels(tree);

        return items
            .filter((x) => !excludeIds.has(x.id))
            .map((x) => {
                const level = levels.get(x.id) ?? 1;
                const disabled = level > MAX_DICTIONARIES_DEPTH - requiredHeight;

                return {
                    key: String(x.id),
                    label: x.titleRu,
                    parentId: x.parentId != null && !excludeIds.has(x.parentId) ? String(x.parentId) : undefined,
                    disabled,
                    disabledReason: disabled
                        ? t(maxDepthReasonKey, {max: MAX_DICTIONARIES_DEPTH})
                        : undefined,
                };
            });
    }, [items, tree, formModal, t, maxDepthReasonKey]);

    const extractErrorMessage = (err: unknown, fallbackKey: string): string => {
        if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
            return err.response.data.message;
        }
        return t(fallbackKey);
    };

    const submitForm = async (values: HierarchicalDictFormValues) => {
        if (!formModal) return;
        setSubmitting(true);
        setFormError(null);

        const parentIds = values.parentKeys.map(Number);
        const baseValues: BasePayloadValues = {
            titleRu: values.titleRu,
            titleEn: values.titleEn,
            titleKg: values.titleKg,
        };

        try {
            if (formModal.mode === "create") {
                if (parentIds.length === 0) {
                    await service.create(buildPayload(baseValues, undefined));
                } else {
                    for (const parentId of parentIds) {
                        await service.create(buildPayload(baseValues, parentId));
                    }
                }
            } else {
                const [firstParentId, ...restParentIds] = parentIds;

                await service.update(formModal.node.id, buildPayload(baseValues, firstParentId));

                for (const parentId of restParentIds) {
                    await service.create(buildPayload(baseValues, parentId));
                }
            }

            refetch();
            setFormModal(null);
        } catch (err) {
            setFormError(extractErrorMessage(err, saveErrorKey));
        } finally {
            setSubmitting(false);
        }
    };

    const openDelete = (node: DictTreeNode<T>) => {
        setDeleteError(null);
        setDeleteTarget(node);
    };

    const closeDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
        setDeleteError(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError(null);

        try {
            await service.delete(deleteTarget.id);
            refetch();
            setDeleteTarget(null);
        } catch (err) {
            setDeleteError(extractErrorMessage(err, deleteErrorKey));
        } finally {
            setDeleting(false);
        }
    };

    return {
        loading, error, items, filteredTree, isSearching, search, setSearch,
        collapsed, toggleCollapse, refetch,
        formModal, formInitialValues, parentOptions, submitting, formError,
        openCreateRoot, openCreateChild, openEdit, closeFormModal, submitForm,
        deleteTarget, deleting, deleteError, openDelete, closeDelete, confirmDelete,
    };
}