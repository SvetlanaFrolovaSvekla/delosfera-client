import {useTranslation} from "react-i18next";
import {ACTUALIZATION_BUCKET_ORDER, useActualizationBucketMeta} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import type {ActualizationBucketKey, VndActualizationSummaryResponse} from "@/service/vndService/vndServiceType.ts";

export type ActualizationFilterValue = ActualizationBucketKey | "all";

interface ActualizationFilterPillsProps {
    value: ActualizationFilterValue;
    onChange: (v: ActualizationFilterValue) => void;
    summary: VndActualizationSummaryResponse | null;
}

export function ActualizationFilterPills({value, onChange, summary}: ActualizationFilterPillsProps) {
    const {t} = useTranslation();
    const bucketMetaMap = useActualizationBucketMeta();

    const pills: { key: ActualizationFilterValue; label: string; count: number | null; dot?: string }[] = [
        {key: "all", label: t("general.selectAll"), count: summary?.total ?? null},
        ...ACTUALIZATION_BUCKET_ORDER.map((key) => ({
            key,
            label: bucketMetaMap[key].label,
            count: summary ? summary[key] : null,
            dot: bucketMetaMap[key].color,
        })),
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap mb-3.5">
            {pills.map((p) => {
                const isActive = value === p.key;
                return (
                    <button
                        key={p.key}
                        onClick={() => onChange(p.key)}
                        className={`inline-flex items-center gap-[7px] h-8 px-[13px] rounded-lg border font-semibold text-[12.5px] cursor-pointer ${
                            isActive
                                ? "border-[#4e57d6] bg-[#f6f8fb] text-[#4e57d6]"
                                : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                        }`}
                    >
                        {p.dot && <span className="w-2 h-2 rounded-full flex-none" style={{background: p.dot}}/>}
                        {p.label}
                        <span className="opacity-60">{p.count ?? "—"}</span>
                    </button>
                );
            })}
        </div>
    );
}