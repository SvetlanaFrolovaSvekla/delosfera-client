// Кнопка-звёздочка "Добавить в избранное" на странице ВНД. Избранное личное: у каждого
// пользователя свой список, он виден на вкладке "Избранное" в реестре ВНД, а в строках реестра
// у таких документов горит звёздочка (см. VndTable, колонка statusIcon).
//
// Отметка ставится оптимистично — звезда загорается сразу, а при ошибке запроса возвращается
// назад с тостом.
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Star} from "lucide-react";

import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

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
        <Tooltip content={favorite ? t("favorites.removeTooltip") : t("favorites.addTooltip")} side="bottom">
            <button
                type="button"
                onClick={toggle}
                aria-pressed={favorite}
                className={`shrink-0 inline-flex h-7 items-center gap-1.5 rounded-[9px] border px-1.5 text-[12px] font-semibold cursor-pointer transition-colors ${
                    favorite
                        ? "border-[#f3d48a] bg-[#fff8e6] text-[#a86b00] hover:bg-[#fff1cc]"
                        : "border-[#d7dee8] bg-white text-[#55617a] hover:border-[#f3d48a] hover:bg-[#fffaf0] hover:text-[#a86b00]"
                }`}
            >
                <Star
                    className={`w-3.5 h-3.5 transition-transform ${favorite ? "scale-110" : ""}`}
                    strokeWidth={2}
                    fill={favorite ? "#f5b400" : "none"}
                    color={favorite ? "#e0a100" : "currentColor"}
                />
            </button>
        </Tooltip>
    );
}
