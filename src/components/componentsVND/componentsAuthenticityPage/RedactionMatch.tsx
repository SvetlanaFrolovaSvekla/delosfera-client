// Одна найденная редакция ВНД, совпавшая с файлом: код, название, язык, актуальность текста,
// промежуточные версии, ссылка на ВНД и процессы согласования этой редакции.
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import type {VndAuthenticityRedactionMatch} from "@/service/vndService/vndAuthenticityService.ts";
import {vndTitle} from "@/utils/vndProcess/authenticityUtils.ts";

import {Pill} from "./Pill.tsx";
import {ProcessBlock} from "./ProcessBlock.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {CARD} from "./styles/authenticityStyles.ts";
import {ArrowRight} from "lucide-react";

export function RedactionMatch({match}: { match: VndAuthenticityRedactionMatch }) {
    const {t, i18n} = useTranslation();

    return (
        <section className={`${CARD} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[#8b97ab]">
                        {match.vndCode} · {t("vndAuthenticity.redaction", {code: match.redactionCode})}
                    </div>
                    <div className="mt-0.5 text-[16px] font-bold text-[#0f1b2d]">{vndTitle(match, i18n.language)}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <Pill tone="accent">{t(`vndAuthenticity.language.${match.language}`)}</Pill>
                        {match.isCurrentText ? (
                            <Tooltip content={t("vndAuthenticity.currentTextHelp")}>
                                <span><Pill tone="good">{t("vndAuthenticity.currentText")}</Pill></span>
                            </Tooltip>
                        ) : (
                            <Tooltip content={t("vndAuthenticity.notCurrentTextHelp")}>
                                <span><Pill tone="warn">{t("vndAuthenticity.notCurrentText")}</Pill></span>
                            </Tooltip>
                        )}
                        {match.snapshotNumbers.map((n) => (
                            <Pill key={n}>
                                {t("vndAuthenticity.intermediateVersion", {code: `${match.redactionCode}.${n}`})}
                            </Pill>
                        ))}
                    </div>
                </div>
                <Link to={`/base-vnd/${match.vndId}`}
                      className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold !text-[#4e57d6] no-underline hover:brightness-110">
                    {t("vndAuthenticity.openVnd")} <ArrowRight className="h-4 w-4" strokeWidth={2}/>
                </Link>
            </div>

            {match.processes.length === 0 && (
                <div className="mt-4"><Clue>{t("vndAuthenticity.noProcesses")}</Clue></div>
            )}

            <div className="mt-4 flex flex-col gap-4">
                {match.processes.map((process) => (
                    <ProcessBlock key={process.approvalProcessId} vndId={match.vndId} process={process}/>
                ))}
            </div>
        </section>
    );
}
