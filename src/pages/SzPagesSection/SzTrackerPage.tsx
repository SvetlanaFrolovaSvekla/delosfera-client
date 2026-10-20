/**
 * Доска записок по стадиям (РС-4). Реестр отвечает «какие записки есть», доска — «на
 * какой стадии каждая и где затор». Завершённые и отклонённые не показываем.
 */
import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {szService, type SzKind, type SzStatusCode, type SzTrackerColumn} from "@/service/szService/szService.ts";
import {STATUS_TONE} from "@/constants/szConstatns/szStatusTone.ts";
import {DoubleScroll} from "@/components/componentsGeneral/DoubleScroll.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {colors} from "@/design/tokens.ts";

export function SzTrackerPage() {
    const {t, i18n} = useTranslation();
    const [columns, setColumns] = useState<SzTrackerColumn[] | null>(null);
    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);
        szService.tracker()
            .then(setColumns)
            .catch(() => setError(t("szTracker.loadError")));
    }, [reloadKey, t]);

    // Вид записки приходит с сервера русской строкой — показываем на языке интерфейса.
    useEffect(() => {
        szService.kinds().then(setKinds).catch(() => {});
    }, []);

    const ageLabel = (days: number): string =>
        days === 0 ? t("szTracker.today") : t("time.days", {count: days});

    const kindLabel = (name: string): string => {
        const k = kinds.find((x) => x.titleRu === name);
        if (!k) return name;
        if (i18n.language === "ky") return k.titleKg || name;
        if (i18n.language === "en") return k.titleEn || name;
        return name;
    };

    const total = columns?.reduce((s, c) => s + c.count, 0) ?? 0;
    const stale = columns?.reduce((s, c) => s + c.items.filter(i => i.isStale).length, 0) ?? 0;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("szTracker.title")}</h1>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        {t("szTracker.subtitle")}
                        {columns && ` · ${t("szTracker.total", {n: total})}`}
                        {stale > 0 && ` · ${t("szTracker.stale", {n: stale})}`}
                    </div>
                </div>
                <Link to="/sz" className="text-[13px] font-semibold text-[#2f68f5] no-underline hover:underline">
                    ← {t("szTracker.back")}
                </Link>
            </div>

            {error && (
                <EmptyState
                    variant="error"
                    title={error}
                    description={t("szTracker.loadErrorHint")}
                    actionLabel={t("szTracker.retry")}
                    onAction={refetch}
                />
            )}
            {!columns && !error && <div className="text-[13px] text-[#8b97ab]">{t("general.loading")}</div>}

            {columns && (
                <DoubleScroll className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">
                    {columns.map(col => (
                        <div key={col.code} className="shrink-0 w-[270px] min-h-[calc(100vh-240px)] rounded-[13px] bg-[#f6f8fb] border border-[#e5e9f0] flex flex-col">
                            <div className="px-3.5 py-3 border-b border-[#e5e9f0] flex items-center justify-between">
                                <span className="text-[13px] font-bold"
                                      style={{color: (STATUS_TONE[col.code as SzStatusCode] ?? colors.status.draft).fg}}>
                                    {t(`szTracker.stages.${col.code}`, {defaultValue: col.title})}
                                </span>
                                <span className="text-[12px] font-bold text-[#55617a] bg-white border border-[#e5e9f0] rounded-full px-2 py-0.5">
                                    {col.count}
                                </span>
                            </div>

                            <div className="p-2.5 flex flex-col gap-2 flex-1 min-h-[60px]">
                                {col.items.length === 0 && (
                                    <div className="text-[12px] text-[#a3adbd] text-center py-4">{t("szTracker.empty")}</div>
                                )}
                                {col.items.map(it => (
                                    <Link
                                        key={it.id}
                                        to={`/sz/${it.id}`}
                                        className={`block rounded-[10px] border p-3 no-underline ${
                                            it.isStale ? "bg-[#fefaf2] border-[#f0dcae]" : "bg-white border-[#e9edf3] hover:border-[#c9d6f5]"
                                        }`}
                                    >
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="font-mono text-[11.5px] text-[#2f68f5]">{it.regNumber ?? t("szTracker.draftNumber")}</span>
                                            <span className="text-[11px] font-semibold whitespace-nowrap"
                                                  style={{color: it.isStale ? "#b3730a" : "#a3adbd"}}>
                                                {ageLabel(it.ageDays)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[12.5px] font-medium text-[#1c2740] leading-snug line-clamp-2">
                                            {it.title}
                                        </div>
                                        <div className="mt-1 text-[11px] text-[#8b97ab] truncate">
                                            {kindLabel(it.kind)}
                                            {it.addresseeName && ` · ${it.addresseeName}`}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </DoubleScroll>
            )}
        </div>
    );
}
