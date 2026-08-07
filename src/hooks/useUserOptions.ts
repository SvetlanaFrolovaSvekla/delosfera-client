// Список пользователей для выбора участников группы - грузится один раз при монтировании
import {useEffect, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";

interface DictOption {
    key: string;
    label: string;
}

interface RawUserResponse {
    id: number;
    fullName: string;
    email: string;
}

export function useUserOptions() {
    const [options, setOptions] = useState<DictOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        axiosInstance
            .get<RawUserResponse[]>("users")
            .then(({data}) => {
                if (cancelled) return;
                setOptions(
                    data
                        .map((u) => ({key: String(u.id), label: `${u.fullName} (${u.email})`}))
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