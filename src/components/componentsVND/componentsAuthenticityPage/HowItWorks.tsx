// Блок "Как это работает" над проверкой: три пронумерованных шага с иконками.
import {useTranslation} from "react-i18next";
import {CARD} from "./styles/authenticityStyles.ts";
import {Download, ShieldCheck, Upload, type LucideIcon} from "lucide-react";

export function HowItWorks() {
    const {t} = useTranslation();

    const steps: { icon: LucideIcon; title: string; text: string }[] = [
        {icon: Download, title: t("vndAuthenticity.how.step1Title"), text: t("vndAuthenticity.how.step1")},
        {icon: Upload, title: t("vndAuthenticity.how.step2Title"), text: t("vndAuthenticity.how.step2")},
        {icon: ShieldCheck, title: t("vndAuthenticity.how.step3Title"), text: t("vndAuthenticity.how.step3")},
    ];

    return (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
                <div key={index} className={`${CARD} flex items-start gap-3 p-4`}>
                    <span
                        className="relative grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-[#ececfc] text-[#4e57d6]">
                        <step.icon className="h-[18px] w-[18px]" strokeWidth={2}/>
                        <span
                            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#4e57d6] text-[10.5px] font-bold text-white ring-2 ring-white">
                            {index + 1}
                        </span>
                    </span>
                    <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#1c2740]">{step.title}</div>
                        <div className="mt-0.5 text-[12px] leading-[1.55] text-[#8b97ab]">{step.text}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
