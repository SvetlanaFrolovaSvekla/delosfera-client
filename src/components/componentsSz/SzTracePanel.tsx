import {useEffect, useState} from "react";
import {szService, type SzTraceStep} from "@/service/szService/szService.ts";

/**
 * Путь записки (СЗ-8): курированный таймлайн по статусам — когда, кто перевёл и
 * сколько записка пробыла на каждом этапе. Отвечает на «где записка застряла и как
 * дошла до текущего статуса», чего сырой журнал аудита с полем-на-строку не даёт.
 */
interface Props {
    szId: number;
}

/** Часы → человекочитаемо: «3 дн 4 ч», «5 ч», «40 мин». */
function humanDuration(hours: number): string {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} мин`;
    if (hours < 24) return `${Math.round(hours)} ч`;
    const days = Math.floor(hours / 24);
    const rem = Math.round(hours - days * 24);
    return rem > 0 ? `${days} дн ${rem} ч` : `${days} дн`;
}

function formatAt(iso: string): string {
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
}

export function SzTracePanel({szId}: Props) {
    const [steps, setSteps] = useState<SzTraceStep[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        szService.trace(szId)
            .then((s) => alive && setSteps(s))
            .catch(() => alive && setError(true));
        return () => {
            alive = false;
        };
    }, [szId]);

    if (error || (steps && steps.length === 0)) return null;

    return (
        <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd] mb-4">Путь записки</div>

            {!steps ? (
                <div className="text-[13px] text-[#8b97ab]">Загрузка…</div>
            ) : (
                <div className="flex flex-col">
                    {steps.map((s, i) => {
                        const last = i === steps.length - 1;
                        const dot = s.isCurrent ? "#2f68f5" : last ? "#1f8a4c" : "#c9d2e0";
                        return (
                            <div key={i} className="flex gap-3">
                                {/* Ось таймлайна: точка + линия до следующей вехи. */}
                                <div className="flex flex-col items-center" style={{width: 16}}>
                                    <span style={{
                                        width: 11, height: 11, borderRadius: "50%", background: dot,
                                        boxShadow: s.isCurrent ? "0 0 0 3px #dbe4fb" : undefined, flexShrink: 0,
                                        marginTop: 3,
                                    }}/>
                                    {!last && <span style={{width: 2, flex: 1, background: "#eef2f7", minHeight: 22}}/>}
                                </div>

                                <div className={last ? "pb-0" : "pb-4"} style={{flex: 1, minWidth: 0}}>
                                    <div className="flex items-baseline flex-wrap gap-x-2">
                                        <span style={{fontSize: 13.5, fontWeight: 600, color: s.isCurrent ? "#2f68f5" : "#0f1b2d"}}>
                                            {s.statusTitle}
                                        </span>
                                        {s.durationHours != null && (
                                            <span style={{fontSize: 11.5, color: "#8b97ab"}}>
                                                · {humanDuration(s.durationHours)}
                                                {s.isCurrent && " (идёт)"}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{fontSize: 11.5, color: "#8b97ab", marginTop: 1}}>
                                        {formatAt(s.at)}
                                        {s.actorName && ` · ${s.actorName}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
