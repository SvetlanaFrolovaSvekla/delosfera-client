import {useEffect, useState} from "react";
import {
    actualizationBucketSettingsService,
    type ActualizationBucketSettings,
} from "@/service/actualizationBucketSettingsService/actualizationBucketSettingsService.ts";

/** Пороги индикации сроков актуализации (справочник "Пороги индикации сроков
 * актуализации", раздел ВНД) — грузятся один раз и используются для тултипов
 * на карточках-метриках и на таблетке "Статус срока" в таблице. */
export function useActualizationBucketSettings() {
    const [settings, setSettings] = useState<ActualizationBucketSettings | null>(null);

    useEffect(() => {
        let cancelled = false;
        actualizationBucketSettingsService.get()
            .then((data) => {
                if (!cancelled) setSettings(data);
            })
            .catch(() => {
                // Тултип с порогом — не критичная функция: молча остаёмся без него при ошибке
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return settings;
}
