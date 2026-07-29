import type {ReactNode} from "react";
import {Copy, FilePlus2, Layers} from "lucide-react";
import type {VndStatusKey} from "@/service/vndService/vndServiceType.ts";

interface VndStatusBannerProps {
    status: VndStatusKey;
    /** Клик по первичному действию (напр. «Открыть Два окна» / «Добавить первую редакцию») */
    onPrimaryAction?: () => void;
    /** Клик по вторичному действию (напр. «Сформировать v4.0») */
    onSecondaryAction?: () => void;
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
        text: (
            <>После утверждения <b>ТИД-2026-014</b> внесите правки Ответственным редактором и сформируйте версию v4.0.</>
        ),
        primaryLabel: "Открыть «Два окна»",
        primaryIcon: <Copy className="w-4 h-4" strokeWidth={1.8}/>,
        secondaryLabel: "Сформировать v4.0",
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
        text: "Добавьте реквизиты и первую редакцию документа, чтобы ВНД стал действующим.",
        primaryLabel: "Добавить первую редакцию",
        primaryIcon: <FilePlus2 className="w-4 h-4" strokeWidth={1.8}/>,
        accentColor: "#5b6472",
    },
};

export function VndStatusBanner({status, onPrimaryAction, onSecondaryAction}: VndStatusBannerProps) {
    const config = BANNER_CONFIG[status];
    if (!config) return null;

    return (
        <div
            className="flex items-center gap-[15px] px-[18px] py-[15px] rounded-[13px] mb-[18px]"
            style={{
                border: `1px solid ${config.borderColor}`,
                background: `linear-gradient(90deg, ${config.gradientFrom}, ${config.gradientTo})`,
            }}
        >
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
                    {config.text}
                </div>
            </div>

            {/*TODO: цвет кнопки при hover*/}
            {config.primaryLabel && (
                <button
                    onClick={onPrimaryAction}
                    className="inline-flex items-center gap-2 h-[38px] px-[15px] rounded-[9px] bg-white font-semibold text-[12.5px] cursor-pointer flex-none hover:bg-[#f7f4ff]"
                    style={{border: `1px solid ${config.borderColor}`, color: config.accentColor}}
                >
                    {config.primaryIcon}
                    Изменить реквизиты
                </button>
            )}

            {config.primaryLabel && (
                <button
                    onClick={onPrimaryAction}
                    className="inline-flex items-center gap-2 h-[38px] px-[15px] rounded-[9px] bg-white font-semibold text-[12.5px] cursor-pointer flex-none hover:bg-[#f7f4ff]"
                    style={{border: `1px solid ${config.borderColor}`, color: config.accentColor}}
                >
                    {config.primaryIcon}
                    {config.primaryLabel}
                </button>
            )}

            {config.secondaryLabel && (
                <button
                    onClick={onSecondaryAction}
                    className="h-[38px] px-[15px] border-none rounded-[9px] text-white font-semibold text-[12.5px] cursor-pointer flex-none hover:brightness-[1.06]"
                    style={{background: config.accentColor}}
                >
                    {config.secondaryLabel}
                </button>
            )}
        </div>
    );
}