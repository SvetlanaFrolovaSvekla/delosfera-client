// Сколько пожеланий и замечаний ещё не разобрано (статус «Новое») - красная точка у
// «Настройки системы» в боковом меню и у пункта «Пожелания и замечания» в разделе управления.
// Только у тех, кто разбирает сообщения (право ManageSystemSettings - то же, что у самой
// страницы); у остальных хук ничего не запрашивает и отдаёт 0.
import {useEffect, useState} from "react";
import {feedbackService, FEEDBACK_CHANGED_EVENT} from "@/service/feedbackService/feedbackService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

const REFRESH_MS = 120_000;

export function useFeedbackNewCount(): number {
    const {hasPermission} = useAuth();
    const canSee = hasPermission(PermissionCode.ManageSystemSettings);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!canSee) return;
        let cancelled = false;
        const refresh = () => {
            feedbackService.newCount()
                .then((n) => {
                    if (!cancelled) setCount(n);
                })
                .catch(() => {
                    // счётчик не критичен - просто не показываем точку
                });
        };
        refresh();
        const timer = setInterval(refresh, REFRESH_MS);
        window.addEventListener(FEEDBACK_CHANGED_EVENT, refresh);
        return () => {
            cancelled = true;
            clearInterval(timer);
            window.removeEventListener(FEEDBACK_CHANGED_EVENT, refresh);
        };
    }, [canSee]);

    return canSee ? count : 0;
}
