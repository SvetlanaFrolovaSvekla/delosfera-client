import type {ReactNode} from "react";
import {FilePlus2, Layers} from "lucide-react";
import type {VndStatusKey} from "@/service/vndService/vndServiceType.ts";

interface VndStatusBannerProps {
    status: VndStatusKey;
    /** Клик по первичному действию */
    onPrimaryAction?: () => void;
    /** Клик по вторичному действию (напр. «Консолидировать согласованную версию») */
    onSecondaryAction?: () => void;
    compact?: boolean;
    /** Может ли текущий пользователь выполнить консолидацию — актуально только для статуса "Консолидация".
     * Если не передано (undefined), баннер считает, что действие доступно (обратная совместимость),
     * поэтому для статуса "consol" это значение обязательно нужно вычислять и передавать явно. */
    canConsolidate?: boolean;
}

interface BannerConfig {
    icon: ReactNode;
    iconColor: string;
    iconBg: string;
    borderColor: string;
    gradientFrom: string;
    gradientTo: string;
    titleColor: string;
    title: string;
    textColor: string;
    text: ReactNode;
    primaryLabel?: string;
    primaryIcon?: ReactNode;
    secondaryLabel?: string;
    accentColor: string;
}

const BANNER_CONFIG: Partial<Record<VndStatusKey, BannerConfig>> = {
    consol: {
        icon: <Layers className="w-[21px] h-[21px]" strokeWidth={1.8}/>,
        iconColor: "#7a5ce0",
        iconBg: "#efeafe",
        borderColor: "#ddd0fa",
        gradientFrom: "#f4f0ff",
        gradientTo: "#faf8ff",
        titleColor: "#2a2352",
        title: "Документ в статусе «Консолидация»",
        textColor: "#6b6494",
        text: "Согласование завершено. Дождитесь решения руководства и подтвердите консолидацию — после этого ВНД станет действующим.",
        secondaryLabel: "Консолидировать согласованную версию",
        accentColor: "#7a5ce0",
    },
    draft: {
        icon: <FilePlus2 className="w-[21px] h-[21px]" strokeWidth={1.8}/>,
        iconColor: "#5b6472",
        iconBg: "#eef0f3",
        borderColor: "#dfe3ea",
        gradientFrom: "#f6f8fb",
        gradientTo: "#fbfcfe",
        titleColor: "#26324a",
        title: "Документ в статусе «Черновик»",
        textColor: "#55617a",
        text: "Добавьте первую редакцию документа, чтобы ВНД стал действующим! ",
        // Кнопок для черновика намеренно нет — primaryLabel/secondaryLabel не заданы,
        // поэтому оба блока с кнопками ниже просто не отрендерятся.
        accentColor: "#5b6472",
    },
};

// Текст для тех, кто видит статус "Консолидация", но не имеет права её подтвердить
// (согласующие, рядовые пользователи и т.д.)
const CONSOL_READONLY_TEXT =
    "Согласование завершено. Дождитесь решения руководства по консолидации.";

export function VndStatusBanner({status, onPrimaryAction, onSecondaryAction, compact, canConsolidate}: VndStatusBannerProps) {
    const config = BANNER_CONFIG[status];
    if (!config) return null;

    // Право действовать по консолидации проверяется только для статуса "consol";
    // canConsolidate === false — единственный случай, когда прячем кнопку и меняем текст
    const isConsolWithoutRights = status === "consol" && canConsolidate === false;

    const displayText = isConsolWithoutRights ? CONSOL_READONLY_TEXT : config.text;
    const secondaryLabel = isConsolWithoutRights ? undefined : config.secondaryLabel;

    const hasActions = config.primaryLabel || secondaryLabel;

    return (
        <div
            className={`rounded-[13px] ${compact ? "px-[15px] py-[14px]" : "flex items-center gap-[15px] px-[18px] py-[15px] mb-[18px]"}`}
            style={{
                border: `1px solid ${config.borderColor}`,
                background: `linear-gradient(90deg, ${config.gradientFrom}, ${config.gradientTo})`,
            }}
        >
            <div className={compact ? "flex items-start gap-[12px]" : "contents"}>
                <span
                    className="w-10 h-10 flex-none rounded-[11px] grid place-items-center"
                    style={{background: config.iconBg, color: config.iconColor}}
                >
                    {config.icon}
                </span>

                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px]" style={{color: config.titleColor}}>
                        {config.title}
                    </div>
                    <div className="text-[12.5px] mt-0.5" style={{color: config.textColor}}>
                        {displayText}
                    </div>
                </div>
            </div>

            {hasActions && (
                <div className={compact ? "flex flex-wrap gap-2 mt-3" : "contents"}>
                    {config.primaryLabel && (
                        <button
                            onClick={onPrimaryAction}
                            className={`inline-flex items-center gap-2 h-[38px] px-[15px] rounded-[9px] bg-white font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${compact ? "" : "flex-none"}`}
                            style={{border: `1px solid ${config.borderColor}`, color: config.accentColor}}
                        >
                            {config.primaryIcon}
                            {config.primaryLabel}
                        </button>
                    )}

                    {secondaryLabel && (
                        <button
                            onClick={onSecondaryAction}
                            className={`h-[38px] px-[15px] border-none rounded-[9px] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] ${compact ? "" : "flex-none"}`}
                            style={{background: config.accentColor}}
                        >
                            {secondaryLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}