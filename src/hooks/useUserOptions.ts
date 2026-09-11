// Список пользователей для выбора участников группы - грузится один раз при монтировании
import {useEffect, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";

interface DictOption {
    key: string;
    label: string;
}

interface LookupUser {
    id: number;
    fullName: string;
    position?: string | null;
    orgUnit?: string | null;
}

export function useUserOptions() {
    const [options, setOptions] = useState<DictOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        // Раньше дёргали GET /users — а он отдаёт СТРАНИЦУ (items, total, 20 по умолчанию),
        // а не массив: data.map падал/усекал список участников до двадцати. Берём
        // /users/lookup — плоский список всех активных, тот же, что и в подборе людей.
        axiosInstance
            .get<LookupUser[]>("users/lookup")
            .then(({data}) => {
                if (cancelled) return;
                setOptions(
                    data
                        .map((u) => {
                            const где = [u.position, u.orgUnit].filter(Boolean).join(" · ");
                            return {key: String(u.id), label: где ? `${u.fullName} (${где})` : u.fullName};
                        })
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