// Список сотрудников с должностью — для строки "Разработано:" в таблице ТИД (см.
// TidChangesTable/VndUploadTidModal): нужны не только ФИО (как в useInitiatorOptions), но и
// должность, поэтому используем тот же эндпоинт, что и VndSelectApproverModal
// (GET /users/approvers — уже отфильтрован по активности/блокировке на бэке).
import {useEffect, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";

export interface ResponsibleEmployeeOption {
    id: number;
    fullName: string;
    positionName: string | null;
}

interface RawApproverResponse {
    id: number;
    fullName: string;
    positionName: string | null;
}

export function useResponsibleEmployeeOptions() {
    const [options, setOptions] = useState<ResponsibleEmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        axiosInstance
            .get<RawApproverResponse[]>("/users/approvers")
            .then(({data}) => {
                if (cancelled) return;
                setOptions(
                    data
                        .map((u) => ({id: u.id, fullName: u.fullName, positionName: u.positionName}))
                        .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru")),
                );
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить список сотрудников");
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
