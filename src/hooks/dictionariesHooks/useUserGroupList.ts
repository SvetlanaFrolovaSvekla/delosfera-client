// Хук для CRUD + поиск справочника групп пользователей (плоский, но с мультиселектом участников)
import {useMemo, useState} from "react";
import axios from "axios";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {userGroupService} from "@/service/dictionariesService/userGroupService/userGroupService.ts";
import type {
    UserGroupResponse,
    CreateUserGroupRequest,
} from "@/service/dictionariesService/userGroupService/userGroupServiceType.ts";

export interface UserGroupFormValues {
    titleRu: string;
    titleEn: string;
    titleKg: string;
    userKeys: string[]; // ключи выбранных пользователей (String(id))
}

type FormModalState =
    | {mode: "create"}
    | {mode: "edit"; item: UserGroupResponse};

export function useUserGroupList() {
    const {userGroups: items, loading, error, refetch} = useDictionaries();
    const {t} = useTranslation();

    const [search, setSearch] = useState("");
    const [formModal, setFormModal] = useState<FormModalState | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<UserGroupResponse | null>(null);
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

    const openEdit = (item: UserGroupResponse) => {
        setFormError(null);
        setFormModal({mode: "edit", item});
    };

    const closeFormModal = () => {
        if (submitting) return;
        setFormModal(null);
        setFormError(null);
    };

    const formInitialValues: UserGroupFormValues = useMemo(() => {
        if (!formModal) return {titleRu: "", titleEn: "", titleKg: "", userKeys: []};
        if (formModal.mode === "create") return {titleRu: "", titleEn: "", titleKg: "", userKeys: []};
        return {
            titleRu: formModal.item.titleRu,
            titleEn: formModal.item.titleEn ?? "",
            titleKg: formModal.item.titleKg ?? "",
            userKeys: formModal.item.users.map((u) => String(u.id)),
        };
    }, [formModal]);

    const extractErrorMessage = (err: unknown, fallbackKey: string): string => {
        if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
            return err.response.data.message;
        }
        return t(fallbackKey);
    };

    const submitForm = async (values: UserGroupFormValues) => {
        if (!formModal) return;
        setSubmitting(true);
        setFormError(null);

        const payload: CreateUserGroupRequest = {
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            userIds: values.userKeys.map(Number),
        };

        try {
            if (formModal.mode === "create") {
                await userGroupService.create(payload);
            } else {
                await userGroupService.update(formModal.item.id, payload);
            }
            refetch();
            setFormModal(null);
        } catch (err) {
            setFormError(extractErrorMessage(err, "dictionaries.saveError"));
        } finally {
            setSubmitting(false);
        }
    };

    const openDelete = (item: UserGroupResponse) => {
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
            await userGroupService.delete(deleteTarget.id);
            refetch();
            setDeleteTarget(null);
        } catch (err) {
            setDeleteError(extractErrorMessage(err, "dictionaries.deleteError"));
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