// Кнопка-звёздочка "Добавить в избранное" на странице ВНД. Избранное личное: у каждого
// пользователя свой список, он виден на вкладке "Избранное" в реестре ВНД, а в строках реестра
// у таких документов горит звёздочка (см. VndTable, колонка statusIcon).
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Star} from "lucide-react";

import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import {VndHeaderButton} from "@/components/componentsVND/componentsOpenVndPage/VndHeaderButton.tsx";

interface VndFavoriteButtonProps {
    vndId: number;
    isFavorite: boolean;
}

export function VndFavoriteButton({vndId, isFavorite}: VndFavoriteButtonProps) {
    const {t} = useTranslation();
    const [favorite, setFavorite] = useState(isFavorite);
    const [busy, setBusy] = useState(false);

    // Документ перезагрузили (или открыли другой) — берём актуальное значение с сервера
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFavorite(isFavorite);
    }, [vndId, isFavorite]);

    const toggle = async () => {
        if (busy) return;
        const next = !favorite;
        setFavorite(next);
        setBusy(true);
        try {
            if (next) await vndService.addToFavorites(vndId);
            else await vndService.removeFromFavorites(vndId);
        } catch (e) {
            setFavorite(!next);
            toast.error(t("favorites.toggleError"), e instanceof Error ? e.message : undefined);
        } finally {
            setBusy(false);
        }
    };

    return (
        <VndHeaderButton
            tooltip={favorite ? t("favorites.removeTooltip") : t("favorites.addTooltip")}
            onClick={toggle}
            pressed={favorite}
            variant={favorite ? "favoriteActive" : "favorite"}
            icon={
                <Star
                    className={`w-3.5 h-3.5 transition-transform ${favorite ? "scale-110" : ""}`}
                    strokeWidth={2}
                    fill={favorite ? "#f5b400" : "none"}
                    color={favorite ? "#e0a100" : "currentColor"}
                />
            }
        />
    );
}
