// Generic хук для CRUD + поиск для плоского (без иерархии) справочника
import {useMemo, useState} from "react";
import axios from "axios";
import {useTranslation} from "react-i18next";

export interface FlatDictItem {
    id: number;
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
}

export interface FlatDictFormValues {
    titleRu: string;
    titleEn: string;
    titleKg: string;
}

type FormModalState<T extends FlatDictItem> =
    | {mode: "create"}
    | {mode: "edit"; item: T};

export interface FlatDictService<TPayload> {
    create: (payload: TPayload) => Promise<unknown>;
    update: (id: number, payload: TPayload) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
}

export interface UseFlatDictListOptions<T extends FlatDictItem, TPayload> {
    items: T[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    service: FlatDictService<TPayload>;
    buildPayload: (values: FlatDictFormValues) => TPayload;
    i18n?: {
        saveErrorKey?: string;
        deleteErrorKey?: string;
    };
}

export interface FlatDictListResult<T extends FlatDictItem> {
    loading: boolean;
    error: string | null;
    items: T[];
    filteredItems: T[];
    isSearching: boolean;
    search: string;
    setSearch: (v: string) => void;
    refetch: () => void;

    formModal: FormModalState<T> | null;
    formInitialValues: FlatDictFormValues;
    submitting: boolean;
    formError: string | null;
    openCreate: () => void;
    openEdit: (item: T) => void;
    closeFormModal: () => void;
    submitForm: (values: FlatDictFormValues) => void;

    deleteTarget: T | null;
    deleting: boolean;
    deleteError: string | null;
    openDelete: (item: T) => void;
    closeDelete: () => void;
    confirmDelete: () => void;
}

export function useFlatDictList<T extends FlatDictItem, TPayload>(
    options: UseFlatDictListOptions<T, TPayload>
): FlatDictListResult<T> {
    const {items, loading, error, refetch, service, buildPayload, i18n} = options;
    const {t} = useTranslation();

    const saveErrorKey = i18n?.saveErrorKey ?? "dictionaries.saveError";
    const deleteErrorKey = i18n?.deleteErrorKey ?? "dictionaries.deleteError";

    const [search, setSearch] = useState("");
    const [formModal, setFormModal] = useState<FormModalState<T> | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const isSearching = search.trim().length > 0;

    const filteredItems = useMemo(() => {
        const lower = search.trim().toLowerCase();
        if (!lower) return items;
        return items.filter((x) => x.titleRu.toLowerCase().includes(lower));
    }, [items, search]);

    const openCreate = () => {
        setFormError(null);
        setFormModal({mode: "create"});
    };

    const openEdit = (item: T) => {
        setFormError(null);
        setFormModal({mode: "edit", item});
    };

    const closeFormModal = () => {
        if (submitting) return;
        setFormModal(null);
        setFormError(null);
    };

    const formInitialValues: FlatDictFormValues = useMemo(() => {
        if (!formModal) return {titleRu: "", titleEn: "", titleKg: ""};
        if (formModal.mode === "create") return {titleRu: "", titleEn: "", titleKg: ""};
        return {
            titleRu: formModal.item.titleRu,
            titleEn: formModal.item.titleEn ?? "",
            titleKg: formModal.item.titleKg ?? "",
        };
    }, [formModal]);

    const extractErrorMessage = (err: unknown, fallbackKey: string): string => {
        if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
            return err.response.data.message;
        }
        return t(fallbackKey);
    };

    const submitForm = async (values: FlatDictFormValues) => {
        if (!formModal) return;
        setSubmitting(true);
        setFormError(null);

        try {
            const payload = buildPayload(values);
            if (formModal.mode === "create") {
                await service.create(payload);
            } else {
                await service.update(formModal.item.id, payload);
            }
            refetch();
            setFormModal(null);
        } catch (err) {
            setFormError(extractErrorMessage(err, saveErrorKey));
        } finally {
            setSubmitting(false);
        }
    };

    const openDelete = (item: T) => {
        setDeleteError(null);
        setDeleteTarget(item);
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
        loading, error, items, filteredItems, isSearching, search, setSearch, refetch,
        formModal, formInitialValues, submitting, formError,
        openCreate, openEdit, closeFormModal, submitForm,
        deleteTarget, deleting, deleteError, openDelete, closeDelete, confirmDelete,
    };
}