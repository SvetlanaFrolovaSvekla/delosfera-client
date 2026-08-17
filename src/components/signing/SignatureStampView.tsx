import type {SignatureStamp} from "@/service/workflowService/workflowService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

/**
 * Визуальный штамп электронной подписи (SIG-03).
 *
 * Штамп отвечает на три вопроса: кто подписал, когда и под чем. Отпечаток нужен
 * именно для третьего: по нему видно, что подпись стоит под этой версией карточки,
 * а не под какой-то другой. Аннулированная подпись не прячется — то, что она была
 * и почему отпала, само по себе сведения о ходе дела.
 */

interface Props {
    signature: SignatureStamp;

    /** Печатная форма: без красок и рамок, чтобы читалось на бумаге. */
    forPrint?: boolean;
}

export const SignatureStampView = ({signature, forPrint = false}: Props) => {
    const отозвана = signature.revoked;

    if (forPrint) {
        return (
            <div style={{fontSize: 9, lineHeight: 1.45, color: "#000"}}>
                <div style={{fontWeight: 600}}>{signature.levelTitle}</div>
                {signature.fullName && <div>{signature.fullName}</div>}
                {signature.position && <div>{signature.position}</div>}
                <div>{formatDateTime(signature.at)}</div>
                {signature.timestampedAt && (
                    <div>
                        метка времени {formatDateTime(signature.timestampedAt)}
                        {signature.timestampAuthority && ` · ${signature.timestampAuthority}`}
                    </div>
                )}
                {signature.trustAuthority && <div>сертификат выдан: {signature.trustAuthority}</div>}
                {signature.fingerprint && <div>отпечаток {signature.fingerprint}</div>}
                {signature.caveats.map((текст) => <div key={текст}>{текст}</div>)}
                {отозвана && <div>подпись аннулирована: {signature.revokedReason}</div>}
            </div>
        );
    }

    return (
        <div
            className={`mt-1.5 inline-flex flex-col gap-0.5 rounded-[7px] border px-2.5 py-1.5 ${
                отозвана
                    ? "border-[#f1c9c2] bg-[#fbeae7]"
                    : "border-[#cfe3d6] bg-[#f2f9f5]"}`}
        >
            <span className={`text-[11px] font-semibold ${отозвана ? "text-[#c0392b]" : "text-[#1c7a4d]"}`}>
                {signature.levelTitle}
            </span>
            <span className="text-[11.5px] text-[#26324a]">
                {signature.fullName ?? "—"}
                {signature.position && <span className="text-[#8b97ab]"> · {signature.position}</span>}
            </span>
            <span className="text-[11px] text-[#8b97ab]">
                {formatDateTime(signature.at)}
                {signature.fingerprint && ` · отпечаток ${signature.fingerprint}`}
            </span>
            {signature.timestampedAt && (
                <span className="text-[11px] text-[#1c7a4d]">
                    метка времени {formatDateTime(signature.timestampedAt)}
                    {signature.timestampAuthority && ` · ${signature.timestampAuthority}`}
                </span>
            )}
            {signature.trustAuthority && (
                <span className="text-[11px] text-[#8b97ab]">
                    сертификат выдан: {signature.trustAuthority}
                </span>
            )}
            {/* Оговорки показываются на самом штампе: подпись без метки и без
                проверенной цепочки — всё ещё подпись, но опираться на неё в споре
                можно слабее, и видеть это должен тот, кто на неё смотрит. */}
            {signature.caveats.length > 0 && !отозвана && (
                <span className="text-[11px] leading-[1.5] text-[#8a5a00]">
                    {signature.caveats.join("; ")}
                </span>
            )}
            {отозвана && (
                <span className="text-[11px] text-[#c0392b]">
                    Аннулирована: {signature.revokedReason ?? "файл изменился после подписания"}
                </span>
            )}
        </div>
    );
};
