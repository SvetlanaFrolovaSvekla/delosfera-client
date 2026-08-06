import {useEffect, useState} from "react";
import {vndAnalyticsService} from "@/service/analyticsService/vndAnalyticsService.ts";
import {GRANULARITY, type AnalyticsGranularity} from "@/service/analyticsService/vndAnalyticsServiceType.ts";
import type {
    ChartCategoryPoint,
    VndActualizationTrendPoint,
    VndApprovalPerformanceResponse,
    VndApproverWorkloadItem,
    VndDynamicsPoint,
    VndOrgUnitStatusMatrixItem,
    VndOverviewResponse,
} from "@/service/analyticsService/vndAnalyticsServiceType.ts";

/** Статичные данные страницы отчётности по ВНД: KPI + распределения по справочникам,
 * не зависящие от выбранного периода/шага группировки */
export function useVndReportOverview() {
    const [overview, setOverview] = useState<VndOverviewResponse | null>(null);
    const [statusDistribution, setStatusDistribution] = useState<ChartCategoryPoint[]>([]);
    const [typeDistribution, setTypeDistribution] = useState<ChartCategoryPoint[]>([]);
    const [developerDistribution, setDeveloperDistribution] = useState<ChartCategoryPoint[]>([]);
    const [securityLevelDistribution, setSecurityLevelDistribution] = useState<ChartCategoryPoint[]>([]);
    const [rubricDistribution, setRubricDistribution] = useState<ChartCategoryPoint[]>([]);
    const [keywordCloud, setKeywordCloud] = useState<ChartCategoryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);

        Promise.all([
            vndAnalyticsService.getOverview(),
            vndAnalyticsService.getStatusDistribution(),
            vndAnalyticsService.getTypeDistribution(),
            vndAnalyticsService.getDeveloperDistribution(10),
            vndAnalyticsService.getSecurityLevelDistribution(),
            vndAnalyticsService.getRubricDistribution(10),
            vndAnalyticsService.getKeywordCloud(24),
        ])
            .then(([ov, status, type, developer, security, rubric, keywords]) => {
                if (cancelled) return;
                setOverview(ov);
                setStatusDistribution(status);
                setTypeDistribution(type);
                setDeveloperDistribution(developer);
                setSecurityLevelDistribution(security);
                setRubricDistribution(rubric);
                setKeywordCloud(keywords);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить отчётность");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {
        overview,
        statusDistribution,
        typeDistribution,
        developerDistribution,
        securityLevelDistribution,
        rubricDistribution,
        keywordCloud,
        loading,
        error,
    };
}

/** Данные, зависящие от выбранного шага группировки: динамика, тренд актуализации,
 * эффективность согласования */
export function useVndReportPeriod() {
    const [granularity, setGranularity] = useState<AnalyticsGranularity>(GRANULARITY.Month);
    const [dynamics, setDynamics] = useState<VndDynamicsPoint[]>([]);
    const [actualizationTrend, setActualizationTrend] = useState<VndActualizationTrendPoint[]>([]);
    const [approvalPerformance, setApprovalPerformance] = useState<VndApprovalPerformanceResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);

        const request = {granularity};

        Promise.all([
            vndAnalyticsService.getDynamics(request),
            vndAnalyticsService.getActualizationTrend(request),
            vndAnalyticsService.getApprovalPerformance(request),
        ])
            .then(([dyn, trend, performance]) => {
                if (cancelled) return;
                setDynamics(dyn);
                setActualizationTrend(trend);
                setApprovalPerformance(performance);
            })
            .catch(() => {
                if (!cancelled) {
                    setDynamics([]);
                    setActualizationTrend([]);
                    setApprovalPerformance(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [granularity]);

    return {granularity, setGranularity, dynamics, actualizationTrend, approvalPerformance, loading};
}

/** Загрузка согласующих подразделений/пользователей + тепловая карта подразделение×статус */
export function useVndReportWorkload() {
    const [byUser, setByUser] = useState(false);
    const [workload, setWorkload] = useState<VndApproverWorkloadItem[]>([]);
    const [matrix, setMatrix] = useState<VndOrgUnitStatusMatrixItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        vndAnalyticsService
            .getOrgUnitStatusMatrix()
            .then((data) => {
                if (!cancelled) setMatrix(data);
            })
            .catch(() => {
                if (!cancelled) setMatrix([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        vndAnalyticsService
            .getApproverWorkload(byUser)
            .then((data) => {
                if (!cancelled) setWorkload(data);
            })
            .catch(() => {
                if (!cancelled) setWorkload([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [byUser]);

    return {byUser, setByUser, workload, matrix, loading};
}
