// Список пользователей для фильтра "Инициатор" — грузится один раз при монтировании
// VndFilters. Использует тот же эндпоинт, что и VndSelectApproverModal (GET api/users),
// но не тянет orgUnit/position — для фильтра нужны только id и ФИО.
import {useEffect, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";

interface DictOption {
    key: string;
    label: string;
}

interface RawUserResponse {
    id: number;
    fullName: string;
}

export function useInitiatorOptions() {
    const [options, setOptions] = useState<DictOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        axiosInstance
            .get<RawUserResponse[]>("api/users")
            .then(({data}) => {
                if (cancelled) return;
                setOptions(
                    data
                        .map((u) => ({key: String(u.id), label: u.fullName}))
                        .sort((a, b) => a.label.localeCompare(b.label, "ru")),
                );
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить список пользователей");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {options, loading, error};
}