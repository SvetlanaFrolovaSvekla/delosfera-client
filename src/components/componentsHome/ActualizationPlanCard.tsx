// Виджет "План актуализации ВНД" - карточки В норме, прибл. срок, крит. срок, просрочено
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {VndActualizationSummaryResponse} from "@/service/vndService/vndServiceType.ts";
import {ACTUALIZATION_BUCKET_META, ACTUALIZATION_BUCKET_ORDER} from "@/constants/actualizationBucket.ts";

interface ActualizationPlanCardProps {
    summary: VndActualizationSummaryResponse | null | undefined;
    isLoading: boolean;
}

export function ActualizationPlanCard({summary, isLoading}: ActualizationPlanCardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
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
            <div className="grid grid-cols-2 gap-[9px] p-8">
                {ACTUALIZATION_BUCKET_ORDER.map((key) => {
                    const meta = ACTUALIZATION_BUCKET_META[key];
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
    );
}