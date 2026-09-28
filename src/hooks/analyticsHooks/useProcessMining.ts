import {useEffect, useState} from "react";
import {processMiningService} from "@/service/analyticsService/processMiningService.ts";
import type {
    ProcessMiningFilterOptions,
    ProcessMiningReport,
} from "@/service/analyticsService/processMiningServiceType.ts";

/**
 * Данные дашборда process mining (MINE-1): справочник фильтров грузится один раз,
 * отчёт перезапрашивается при смене фильтра. Фильтр держим здесь, чтобы страница
 * оставалась презентационной.
 */
export function useProcessMining() {
    const [documentType, setDocumentType] = useState<number | null>(null);
    const [templateId, setTemplateId] = useState<number | null>(null);

    const [options, setOptions] = useState<ProcessMiningFilterOptions | null>(null);
    const [report, setReport] = useState<ProcessMiningReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        processMiningService
            .getFilters()
            .then((data) => {
                if (!cancelled) setOptions(data);
            })
            .catch(() => {
                if (!cancelled) setOptions({documentTypes: [], templates: []});
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);

        processMiningService
            .getReport({documentType, templateId, businessHours: true})
            .then((data) => {
                if (!cancelled) setReport(data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setReport(null);
                    setError(err instanceof Error ? err.message : "Не удалось загрузить отчёт");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [documentType, templateId]);

    return {
        documentType,
        setDocumentType,
        templateId,
        setTemplateId,
        options,
        report,
        loading,
        error,
    };
}
