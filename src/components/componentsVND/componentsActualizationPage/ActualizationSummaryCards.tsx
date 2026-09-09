import {useTranslation} from "react-i18next";
import {
    ACTUALIZATION_BUCKET_ORDER,
    useActualizationBucketMeta,
    useActualizationBucketThresholdText,
} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import type {ActualizationBucketKey, VndActualizationSummaryResponse} from "@/service/vndService/vndServiceType.ts";
import type {ActualizationBucketSettings} from "@/service/actualizationBucketSettingsService/actualizationBucketSettingsService.ts";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";

interface ActualizationSummaryCardsProps {
    summary: VndActualizationSummaryResponse | null;
    loading: boolean;
    activeBucket: ActualizationBucketKey | "all";
    onSelectBucket: (bucket: ActualizationBucketKey) => void;
    /** Клик по карточке "Всего действующих ВНД" — выбирает таб "Все" */
    onSelectAll: () => void;
    /** Клик по карточке "Ни разу не актуализированные" — выбирает таб "Все" + ставит галочку в чекбоксе */
    onSelectNeverActualized: () => void;
    neverActualizedOnly: boolean;
    /** Пороги индикации сроков актуализации — для тултипов на карточках бакетов */
    bucketSettings: ActualizationBucketSettings | null;
}

export function ActualizationSummaryCards({
    summary, loading, activeBucket, onSelectBucket, onSelectAll, onSelectNeverActualized, neverActualizedOnly,
    bucketSettings,
}: ActualizationSummaryCardsProps) {
    const {t} = useTranslation();
    const bucketMetaMap = useActualizationBucketMeta();
    const thresholdText = useActualizationBucketThresholdText(bucketSettings);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-5">
            <button
                onClick={onSelectAll}
                className={`text-left bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px] cursor-pointer transition-shadow ${
                    activeBucket === "all" && !neverActualizedOnly ? "shadow-[0_0_0_3px_rgba(78,87,214,0.12)]" : ""
                }`}
                style={{borderColor: activeBucket === "all" && !neverActualizedOnly ? "#4e57d6" : "#e9edf3"}}
            >
                <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[12.5px] font-bold text-[#55617a]">Всего действующих ВНД</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold leading-none text-[#3a4560]">
                        {loading ? "—" : summary?.totalActive ?? 0}
                    </span>
                    <span className="text-[12px] text-[#a3adbd]">{t("vnd.documentsUnit")}</span>
                </div>
            </button>

            {ACTUALIZATION_BUCKET_ORDER.map((key) => {
                const meta = bucketMetaMap[key];
                const Icon = meta.icon;
                const isActive = activeBucket === key;
                const count = summary ? summary[key] : null;

                return (
                    <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectBucket(key)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectBucket(key);
                            }
                        }}
                        className={`relative text-left bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px] cursor-pointer transition-shadow ${
                            isActive ? "shadow-[0_0_0_3px_rgba(78,87,214,0.12)]" : ""
                        }`}
                        style={{borderColor: isActive ? meta.color : "#e9edf3"}}
                    >
                        {/* Тултип с порогом — отдельный интерактивный элемент, поэтому гасим всплытие клика,
                            чтобы он не переключал выбор бакета */}
                        <span
                            className="absolute top-1.5 right-1.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <HelpTooltip content={thresholdText[key]}/>
                        </span>

                        <div className="flex items-center gap-2.5 mb-2 pr-7">
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
                    </div>
                );
            })}

            <button
                onClick={onSelectNeverActualized}
                className={`text-left bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px] cursor-pointer transition-shadow ${
                    activeBucket === "all" && neverActualizedOnly ? "shadow-[0_0_0_3px_rgba(78,87,214,0.12)]" : ""
                }`}
                style={{borderColor: activeBucket === "all" && neverActualizedOnly ? "#4e57d6" : "#e9edf3"}}
            >
                <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[12.5px] font-bold text-[#55617a]">
                        Ни разу не актуализированные (с одной редакцией)
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold leading-none text-[#3a4560]">
                        {loading ? "—" : summary?.neverActualized ?? 0}
                    </span>
                    <span className="text-[12px] text-[#a3adbd]">{t("vnd.documentsUnit")}</span>
                </div>
            </button>
        </div>
    );
}