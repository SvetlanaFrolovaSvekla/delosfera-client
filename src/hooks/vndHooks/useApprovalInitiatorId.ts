import {useEffect, useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

/** Инициатор согласования нужен только как fallback права на консолидацию - когда у ВНД
 * нет открытого цикла актуализации (ActualizationResponsibleUserId пуст). Подгружаем только
 * для статуса "Консолидация", чтобы не дёргать эндпоинт согласования лишний раз. */
export function useApprovalInitiatorId(vnd: VndResponse | null | undefined): number | null {
    const [initiatorId, setInitiatorId] = useState<number | null>(null);

    useEffect(() => {
        if (!vnd || vnd.status !== "consol") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setInitiatorId(null);
            return;
        }

        let cancelled = false;
        coordinationService
            .getByVndId(vnd.id)
            // Согласования могло не быть вовсе (редакция без RequiresApproval, но в рамках цикла
            // актуализации) - тогда консолидирует ответственный за актуализацию или главный редактор
            .then((process) => { if (!cancelled) setInitiatorId(process.initiatorUserId); })
            .catch(() => { if (!cancelled) setInitiatorId(null); });

        return () => {
            cancelled = true;
        };
    }, [vnd, vnd?.id, vnd?.status]);

    return initiatorId;
}
