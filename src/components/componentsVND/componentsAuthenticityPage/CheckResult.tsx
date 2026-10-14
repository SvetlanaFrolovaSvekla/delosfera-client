// Результат проверки подлинности: итоговый вердикт (подтверждено / частично / не найдено),
// отпечаток проверяемого файла и список найденных редакций ВНД с этим текстом.
import {useTranslation} from "react-i18next";
import type {VndAuthenticityCheckResponse} from "@/service/vndService/vndAuthenticityService.ts";
import {type Verdict, verdictOf} from "@/utils/vndProcess/authenticityUtils.ts";
import {FileFingerprint} from "./FileFingerprint.tsx";
import {RedactionMatch} from "./RedactionMatch.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {AlertTriangle, CheckCircle2, XCircle, type LucideIcon} from "lucide-react";

export function CheckResult({result}: { result: VndAuthenticityCheckResponse }) {
    const {t} = useTranslation();
    const {verdict, signed, total} = verdictOf(result);

    const verdictView: Record<Verdict, {
        icon: LucideIcon;
        box: string;
        iconBox: string;
        title: string;
        text: string
    }> = {
        confirmed: {
            icon: CheckCircle2,
            box: "border-[#cfe3d6] bg-[#f2f9f5]",
            iconBox: "bg-[#1c9c5c] text-white",
            title: t("vndAuthenticity.verdict.confirmedTitle"),
            text: t("vndAuthenticity.verdict.confirmed", {total}),
        },
        partial: {
            icon: AlertTriangle,
            box: "border-[#f3dfb0] bg-[#fdf7e8]",
            iconBox: "bg-[#e0a43a] text-white",
            title: t("vndAuthenticity.verdict.partialTitle"),
            text: t("vndAuthenticity.verdict.partial", {signed, total}),
        },
        notFound: {
            icon: XCircle,
            box: "border-[#f2c2c2] bg-[#fdf1f1]",
            iconBox: "bg-[#c0392b] text-white",
            title: t("vndAuthenticity.notFound"),
            text: t("vndAuthenticity.notFoundHint"),
        },
    };
    const view = verdictView[verdict];

    return (
        <div className="mt-4 flex flex-col gap-4">
            {/* Итог */}
            <div className={`flex items-start gap-3.5 rounded-2xl border p-4 ${view.box}`}>
                <span className={`grid h-10 w-10 flex-none place-items-center rounded-full ${view.iconBox}`}>
                    <view.icon className="h-5 w-5" strokeWidth={2.2}/>
                </span>
                <div className="min-w-0">
                    <div className="text-[15px] font-bold text-[#0f1b2d]">{view.title}</div>
                    <div className="mt-0.5 text-[13px] leading-[1.6] text-[#55617a]">{view.text}</div>
                </div>
            </div>

            <FileFingerprint result={result}/>

            {result.hasHiddenMatches && (
                <Clue>{t("vndAuthenticity.hiddenMatches")}</Clue>
            )}

            {result.matches.map((match) => (
                <RedactionMatch key={match.redactionId} match={match}/>
            ))}

            {result.truncated && <Clue>{t("vndAuthenticity.truncated")}</Clue>}
        </div>
    );
}
