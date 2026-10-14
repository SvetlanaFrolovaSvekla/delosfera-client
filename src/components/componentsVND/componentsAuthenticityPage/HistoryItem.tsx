// Одна запись ленты истории: комментарий инициатора или решение согласующего со статусом
// подписи; у подписанных решений - "Показать подпись" (раскрывает SignatureCard).
import {useState} from "react";
import {useTranslation} from "react-i18next";
import type {VndAuthenticityHistoryEntry} from "@/service/vndService/vndAuthenticityService.ts";
import {formatDateTime} from "@/utils/vndProcess/authenticityUtils.ts";
import {SignatureCard} from "./SignatureCard.tsx";
import {STATE_DOT, STATE_STYLE} from "./styles/authenticityStyles.ts";

export function HistoryItem({vndId, entry, locale}: {
    vndId: number; entry: VndAuthenticityHistoryEntry; locale: string;
}) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    const stageLabel = `${t(`vndAuthenticity.phase.${entry.phase}`)}${
        entry.phase !== "primary" ? `, ${t("ecp.journal.round", {n: entry.roundNumber})}` : ""}`;

    const dot = entry.kind === "initiator_comment"
        ? "bg-[#8b97ab]"
        : entry.signatureState ? STATE_DOT[entry.signatureState] : "bg-[#dfe4ec]";

    return (
        <li className="relative text-[12.5px] leading-[1.6] text-[#1c2740]">
            <span className={`absolute -left-[27px] top-[5px] h-3 w-3 rounded-full ring-[3px] ring-white ${dot}`}/>
            <div className="text-[11.5px] text-[#8b97ab]">
                {formatDateTime(entry.at, locale)} · {stageLabel}
                {entry.stageTitle && ` · ${entry.stageTitle}`}
            </div>

            {entry.kind === "initiator_comment" ? (
                <div className="mt-0.5 rounded-[10px] bg-[#f6f8fb] px-3 py-2">
                    <span className="font-semibold">{t("vndAuthenticity.initiatorComment")}</span>
                    {entry.fullName && <span className="text-[#8b97ab]"> · {entry.fullName}</span>}
                    {entry.comment && <div className="whitespace-pre-wrap text-[#55617a]">«{entry.comment}»</div>}
                </div>
            ) : (
                <div className="mt-0.5">
                    <div>
                        <span className="font-semibold">{entry.fullName}</span>
                        {entry.position && <span className="text-[#8b97ab]"> · {entry.position}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{entry.decision && t(`vndAuthenticity.decision.${entry.decision}`)}</span>
                        {entry.signatureState && (
                            <span
                                className={`inline-block rounded-[8px] border px-2 py-0.5 text-[11px] ${STATE_STYLE[entry.signatureState]}`}>
                                {t(`vndAuthenticity.signatureState.${entry.signatureState}`)}
                            </span>
                        )}
                        {entry.signature && (
                            <button type="button" onClick={() => setOpen((v) => !v)}
                                    className="cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-semibold text-[#4e57d6]">
                                {open ? t("vndAuthenticity.hideSignature") : t("vndAuthenticity.showSignature")}
                            </button>
                        )}
                    </div>
                    {entry.comment && <div className="whitespace-pre-wrap text-[#55617a]">«{entry.comment}»</div>}
                    {open && entry.signature && (
                        <div className="mt-2">
                            <SignatureCard vndId={vndId} signature={entry.signature} locale={locale}/>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
