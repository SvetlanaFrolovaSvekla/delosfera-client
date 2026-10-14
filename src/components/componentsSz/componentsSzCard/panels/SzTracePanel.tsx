/**
 * Путь записки (СЗ-8): курированный таймлайн по статусам — когда, кто перевёл и
 * сколько записка пробыла на каждом этапе. Отвечает на «где записка застряла и как
 * дошла до текущего статуса», чего сырой журнал аудита с полем-на-строку не даёт.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {szService, type SzTraceStep} from "@/service/szService/szService.ts";
import {formatDateTime} from "@/utils/szProcess/szCardUtils.ts";

interface Props {
    szId: number;
    /**
     * Текущий статус записки с карточки. Путь строится по сменам статуса, поэтому
     * при его смене (отправка, регистрация, решение, отзыв) таймлайн перечитывается —
     * иначе он оставался прежним до перезагрузки страницы.
     */
    statusCode?: string;
}

/** Часы → человекочитаемо: «3 дн 4 ч», «5 ч», «40 мин». */
function humanDuration(hours: number, t: TFunction): string {
    // Сначала округляем, потом раскладываем: иначе 47,6 ч давали «1 дн 24 ч», а 0,995 ч — «60 мин».
    const minutes = Math.round(hours * 60);
    // {n} мин
    if (minutes < 60) return t("szCard.trace.min", {n: Math.max(1, minutes)});
    const totalHours = Math.round(hours);
    // {n} ч
    if (totalHours < 24) return t("szCard.trace.hour", {n: totalHours});
    const days = Math.floor(totalHours / 24);
    const rem = totalHours % 24;
    // {n} дн {h} ч / {n} дн
    return rem > 0 ? t("szCard.trace.dayHour", {n: days, h: rem}) : t("szCard.trace.day", {n: days});
}

export function SzTracePanel({szId, statusCode}: Props) {
    const {t, i18n} = useTranslation();
    const [steps, setSteps] = useState<SzTraceStep[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        // Пока идёт перечитывание, показываем прежний путь — без мигания «Загрузка…».
        szService.trace(szId)
            .then((s) => {
                if (!alive) return;
                setSteps(s);
                setError(false);
            })
            .catch(() => alive && setError(true));
        return () => {
            alive = false;
        };
    }, [szId, statusCode]);

    if (error || (steps && steps.length === 0)) return null;

    return (
        <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd] mb-4">
                {/* Путь записки */}
                {t("szCard.trace.title")}
            </div>

            {!steps ? (
                <div className="text-[13px] text-[#8b97ab]">{t("szCard.trace.loading")}</div> /* Загрузка… */
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
                                                · {humanDuration(s.durationHours, t)}
                                                {/* (идёт) */}
                                                {s.isCurrent && ` (${t("szCard.trace.ongoing")})`}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{fontSize: 11.5, color: "#8b97ab", marginTop: 1}}>
                                        {formatDateTime(s.at, i18n.language, {day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"})}
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
