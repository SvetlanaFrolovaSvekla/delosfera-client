// Звёздочка "Избранное" у служебной записки
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {szService} from "@/service/szService/szService.ts";
import {toast} from "@/service/toastService.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {Star} from "lucide-react";


interface SzFavoriteButtonProps {
    szId: number;
    isFavorite: boolean;
    /** «button» — квадратная кнопка со звёздочкой в шапке карточки (как у ВНД), «icon» — звёздочка в строке реестра. */
    variant?: "button" | "icon";
    /** Отметка сохранена на сервере. */
    onChange?: (isFavorite: boolean) => void;
}

export function SzFavoriteButton({szId, isFavorite, variant = "icon", onChange}: SzFavoriteButtonProps) {
    const {t} = useTranslation();
    const [favorite, setFavorite] = useState(isFavorite);
    const [busy, setBusy] = useState(false);

    // Записку перезагрузили (или открыли другую) — берём актуальное значение с сервера
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFavorite(isFavorite);
    }, [szId, isFavorite]);

    const toggle = async () => {
        if (busy) return;
        const next = !favorite;
        setFavorite(next);
        setBusy(true);
        try {
            if (next) await szService.addToFavorites(szId);
            else await szService.removeFromFavorites(szId);
            onChange?.(next);
        } catch (e) {
            setFavorite(!next);
            toast.error(t("favorites.toggleError"), e instanceof Error ? e.message : undefined);
        } finally {
            setBusy(false);
        }
    };

    const tooltip = favorite ? t("favorites.removeTooltip") : t("szRegistry.favoriteAddTooltip");
    const star = (
        <Star
            className={`transition-transform w-[15px] h-[15px] ${favorite ? "scale-110" : ""}`}
            strokeWidth={2}
            fill={favorite ? "#f5b400" : "none"}
            color={favorite ? "#e0a100" : "currentColor"}
        />
    );

    if (variant === "button") {
        return (
            <Tooltip content={tooltip} side="bottom">
                <button
                    type="button"
                    onClick={toggle}
                    disabled={busy}
                    aria-pressed={favorite}
                    aria-label={tooltip}
                    className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border transition-colors disabled:opacity-60 ${
                        favorite
                            ? "border-[#f3d48a] bg-[#fff8e6] text-[#a86b00] hover:bg-[#fff1cc]"
                            : "border-[#d7dee8] bg-white text-[#55617a] hover:border-[#f3d48a] hover:bg-[#fffaf0] hover:text-[#a86b00]"
                    }`}
                >
                    {star}
                </button>
            </Tooltip>
        );
    }

    return (
        <Tooltip content={tooltip} side="bottom">
            <button
                type="button"
                onClick={toggle}
                disabled={busy}
                aria-pressed={favorite}
                aria-label={tooltip}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent cursor-pointer hover:bg-[#fdf3e0] disabled:opacity-60 ${
                    favorite ? "" : "text-[#c3cad6] hover:text-[#e0a100]"}`}
            >
                {star}
            </button>
        </Tooltip>
    );
}
