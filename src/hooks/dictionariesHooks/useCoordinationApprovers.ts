// Хук для справочника обязательных (фиксированных) этапов согласования ВНД -
// полноценный CRUD: название/СП/согласующий редактируемы, записи можно добавлять,
// удалять и менять их порядок (влияет на порядок этапов в маршруте согласования).
import {useEffect, useMemo, useState} from "react";
import axios from "axios";
import {useTranslation} from "react-i18next";
import type {
    CoordinationDefaultApproverResponse
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";
import {
    coordinationApproverService
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverService.ts";

export interface CoordinationStageFormValues {
    title: string;
    orgUnitId: number;
    approverUserId: number | null;
}

type FormModalState =
    | {mode: "create"}
    | {mode: "edit"; item: CoordinationDefaultApproverResponse};

export function useCoordinationApprovers() {
    const {t} = useTranslation();

    const [items, setItems] = useState<CoordinationDefaultApproverResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [formModal, setFormModal] = useState<FormModalState | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<CoordinationDefaultApproverResponse | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const [reorderingId, setReorderingId] = useState<number | null>(null);

    const refetch = () => setReloadKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);

        coordinationApproverService.getAll()
            .then((res) => {
                if (!cancelled) setItems(res);
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить справочник");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const extractErrorMessage = (err: unknown, fallbackKey: string): string => {
        if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
            return err.response.data.message;
        }
        return t(fallbackKey);
    };

    const openCreate = () => {
        setFormError(null);
        setFormModal({mode: "create"});
    };

    const openEdit = (item: CoordinationDefaultApproverResponse) => {
        setFormError(null);
        setFormModal({mode: "edit", item});
    };

    const closeFormModal = () => {
        if (submitting) return;
        setFormModal(null);
        setFormError(null);
    };

    const submitForm = async (values: CoordinationStageFormValues) => {
        if (!formModal) return;
        setSubmitting(true);
        setFormError(null);

        try {
            if (formModal.mode === "create") {
                await coordinationApproverService.create(values);
            } else {
                await coordinationApproverService.update(formModal.item.id, values);
            }
            refetch();
            setFormModal(null);
        } catch (err) {
            setFormError(extractErrorMessage(err, "dictionaries.saveError"));
        } finally {
            setSubmitting(false);
        }
    };

    const openDelete = (item: CoordinationDefaultApproverResponse) => {
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
            await coordinationApproverService.delete(deleteTarget.id);
            refetch();
            setDeleteTarget(null);
        } catch (err) {
            setDeleteError(extractErrorMessage(err, "dictionaries.deleteError"));
        } finally {
            setDeleting(false);
        }
    };

    const sortedItems = useMemo(
        () => [...items].sort((a, b) => a.order - b.order),
        [items]
    );

    /** Поменять этап местами с соседним (вверх/вниз) - влияет на порядок обязательных
     * этапов в маршруте согласования. */
    const moveItem = async (id: number, direction: "up" | "down") => {
        const idx = sortedItems.findIndex((x) => x.id === id);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (idx < 0 || swapIdx < 0 || swapIdx >= sortedItems.length) return;

        const orderedIds = sortedItems.map((x) => x.id);
        [orderedIds[idx], orderedIds[swapIdx]] = [orderedIds[swapIdx], orderedIds[idx]];

        setReorderingId(id);
        try {
            const updated = await coordinationApproverService.reorder({orderedIds});
            setItems(updated);
        } catch {
            refetch();
        } finally {
            setReorderingId(null);
        }
    };

    return {
        loading, error, items: sortedItems, refetch,
        formModal, submitting, formError,
        openCreate, openEdit, closeFormModal, submitForm,
        deleteTarget, deleting, deleteError, openDelete, closeDelete, confirmDelete,
        moveItem, reorderingId,
    };
}

export type UseCoordinationApproversReturn = ReturnType<typeof useCoordinationApprovers>;
