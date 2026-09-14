// Виджет "План актуализации ВНД" - карточки В норме, прибл. срок, крит. срок, просрочено
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {VndActualizationSummaryResponse} from "@/service/vndService/vndServiceType.ts";
import {ACTUALIZATION_BUCKET_ORDER, useActualizationBucketMeta} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import {HOME_TOP_ROW_HEIGHT} from "@/constants/home.ts";

interface ActualizationPlanCardProps {
    summary: VndActualizationSummaryResponse | null | undefined;
    isLoading: boolean;
}

export function ActualizationPlanCard({summary, isLoading}: ActualizationPlanCardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const bucketMetaMap = useActualizationBucketMeta();

    return (
        // Высота карточки зафиксирована (HOME_TOP_ROW_HEIGHT) и совпадает с "Мои задачи" рядом
        // (см. MyTasksCard.tsx) - обе теперь одной и той же высоты вместо того, чтобы одна
        // растягивалась/обрезалась под другую (см. items-start в HomePage.tsx: сам грид больше
        // не тянет ячейки по высоте друг под друга, высоту каждая карточка задаёт сама).
        <div
            className="flex flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            style={{height: HOME_TOP_ROW_HEIGHT}}
        >
            <div className="flex flex-none items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                <h2 className="text-[15px] font-semibold">
                    {/* План актуализации ВНД */}
                    {t("home.planActualizationTitle")}
                </h2>
                <button
                    onClick={() => navigate("/actualization")}
                    className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                >
                    {/* Смотреть план */}
                    {t("home.seeActualization")}
                </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-[9px] px-8">
                <div className="grid w-full grid-cols-2 gap-[9px]">
                    {ACTUALIZATION_BUCKET_ORDER.map((key) => {
                        const meta = bucketMetaMap[key];
                        const BucketIcon = meta.icon;
                        const count = summary ? summary[key] : null;

                        return (
                            <div
                                key={key}
                                className="rounded-[11px] border px-1.5 py-[12px] text-center"
                                style={{borderColor: meta.color + "33", background: meta.bg}}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <BucketIcon className="w-[13px] h-[13px]" style={{color: meta.color}} strokeWidth={2}/>
                                    <div
                                        className="text-[26px] font-bold leading-none"
                                        style={{color: meta.color, fontFamily: "'IBM Plex Mono', monospace"}}
                                    >
                                        {isLoading ? "—" : count ?? 0}
                                    </div>
                                </div>
                                <div className="mt-[5px] text-[10.5px] font-semibold" style={{color: meta.color}}>
                                    {meta.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}