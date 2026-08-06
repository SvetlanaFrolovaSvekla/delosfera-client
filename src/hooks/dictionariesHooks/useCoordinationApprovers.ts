// Хук для справочника обязательных участников согласования ВНД -
// фиксированные 4 записи,
// редактируется только согласующий по умолчанию для каждого этапа
import {useEffect, useMemo, useState} from "react";
import axios from "axios";
import {useTranslation} from "react-i18next";
import type {
    CoordinationDefaultApproverResponse
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";
import {
    coordinationApproverService
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverService.ts";


export function useCoordinationApprovers() {
    const {t} = useTranslation();

    const [items, setItems] = useState<CoordinationDefaultApproverResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [editTarget, setEditTarget] = useState<CoordinationDefaultApproverResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

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

    const openEdit = (item: CoordinationDefaultApproverResponse) => {
        setFormError(null);
        setEditTarget(item);
    };

    const closeEdit = () => {
        if (submitting) return;
        setEditTarget(null);
        setFormError(null);
    };

    const extractErrorMessage = (err: unknown, fallbackKey: string): string => {
        if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
            return err.response.data.message;
        }
        return t(fallbackKey);
    };

    const submitEdit = async (approverUserId: number | null) => {
        if (!editTarget) return;
        setSubmitting(true);
        setFormError(null);

        try {
            await coordinationApproverService.update(editTarget.id, {approverUserId});
            refetch();
            setEditTarget(null);
        } catch (err) {
            setFormError(extractErrorMessage(err, "dictionaries.saveError"));
        } finally {
            setSubmitting(false);
        }
    };

    const sortedItems = useMemo(
        () => [...items].sort((a, b) => a.id - b.id),
        [items]
    );

    return {
        loading, error, items: sortedItems, refetch,
        editTarget, submitting, formError,
        openEdit, closeEdit, submitEdit,
    };
}