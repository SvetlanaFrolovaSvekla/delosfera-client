import {useTranslation} from "react-i18next";
import {ACTUALIZATION_BUCKET_ORDER, useActualizationBucketMeta} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import type {ActualizationBucketKey, VndActualizationSummaryResponse} from "@/service/vndService/vndServiceType.ts";

interface ActualizationSummaryCardsProps {
    summary: VndActualizationSummaryResponse | null;
    loading: boolean;
    activeBucket: ActualizationBucketKey | "all";
    onSelectBucket: (bucket: ActualizationBucketKey) => void;
}

export function ActualizationSummaryCards({summary, loading, activeBucket, onSelectBucket}: ActualizationSummaryCardsProps) {
    const {t} = useTranslation();
    const bucketMetaMap = useActualizationBucketMeta();

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
            {ACTUALIZATION_BUCKET_ORDER.map((key) => {
                const meta = bucketMetaMap[key];
                const Icon = meta.icon;
                const isActive = activeBucket === key;
                const count = summary ? summary[key] : null;

                return (
                    <button
                        key={key}
                        onClick={() => onSelectBucket(key)}
                        className={`text-left bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px] cursor-pointer transition-shadow ${
                            isActive ? "shadow-[0_0_0_3px_rgba(78,87,214,0.12)]" : ""
                        }`}
                        style={{borderColor: isActive ? meta.color : "#e9edf3"}}
                    >
                        <div className="flex items-center gap-2.5 mb-2">
                            <span
                                className="w-7 h-7 rounded-lg grid place-items-center flex-none"
                                style={{background: meta.bg, color: meta.color}}
                            >
                                <Icon className="w-[15px] h-[15px]" strokeWidth={2}/>
                            </span>
                            <span className="text-[12.5px] font-bold text-[#55617a]">{meta.label}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[28px] font-extrabold leading-none" style={{color: meta.color}}>
                                {loading ? "—" : count ?? 0}
                            </span>
                            <span className="text-[12px] text-[#a3adbd]">{t("vnd.documentsUnit")}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}