/** Обратный отсчёт до истечения ЭЦП-сессии (статичный токен ГП «Инфоком») — опциональная
 * подсказка, пока действует сессия можно "Согласовать" ещё раз без повторного пин-кода. */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {formatEcpCountdown} from "@/utils/formatEcpDuration.ts";

export function EcpSessionCountdown({expireAt}: { expireAt: string }) {
    const {t} = useTranslation();
    const [msLeft, setMsLeft] = useState(() => new Date(expireAt).getTime() - Date.now());

    useEffect(() => {
        const tick = () => setMsLeft(new Date(expireAt).getTime() - Date.now());
        tick();
        // Статичный токен может жить месяцами
        const remaining = new Date(expireAt).getTime() - Date.now();
        const intervalMs = remaining < 3600_000 ? 1000 : 60_000;
        const id = setInterval(tick, intervalMs);
        return () => clearInterval(id);
    }, [expireAt]);

    if (msLeft <= 0) return null;

    return (
        <span className="rounded-full border border-[#cfe3d6] bg-[#f2f9f5] px-2.5 py-1 text-[11px] font-medium text-[#1c7a4d]">
            {t("resolutionPanel.ecpCountdown", {time: formatEcpCountdown(msLeft)})}
        </span>
    );
}
