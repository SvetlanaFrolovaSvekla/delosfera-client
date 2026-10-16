import {useTranslation} from "react-i18next";
import {Archive, Download, Star, StarOff} from "lucide-react";

interface Props {
    count: number;
    exporting: boolean;
    onExport: () => void;
    onArchive: () => void;
    /** Сдать пачку в дело может делопроизводство; остальным кнопка не нужна. */
    canArchive?: boolean;
    onClear: () => void;
    /** Среди отмеченных есть записки не из «Избранного» — показываем «В избранное». */
    canAddFavorites?: boolean;
    /** Среди отмеченных есть записки из «Избранного» — показываем «Убрать из избранного». */
    canRemoveFavorites?: boolean;
    /** Идёт массовое изменение избранного. */
    favoriteBusy?: boolean;
    onAddFavorites?: () => void;
    onRemoveFavorites?: () => void;
}

const BUTTON = "inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#c9d6f5] bg-white text-[12.5px] font-semibold text-[#2f68f5] cursor-pointer disabled:opacity-60";

/** Панель массовых операций над отмеченными строками (СЗ-7). */
export function BulkActionsBar({
                                   count, exporting, onExport, onArchive, onClear, canArchive = false,
                                   canAddFavorites, canRemoveFavorites, favoriteBusy, onAddFavorites, onRemoveFavorites,
                               }: Props) {
    const {t} = useTranslation();
    return (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[12px] border border-[#dbe4fb] bg-[#eef3ff] px-4 py-2.5">
            <span className="text-[12.5px] font-semibold text-[#2f68f5]">
                {t("szRegistry.selected", {count})}
            </span>
            <button type="button" onClick={onExport} disabled={exporting} className={BUTTON}>
                <Download className="w-3.5 h-3.5"/> {t("szRegistry.exportSelected")}
            </button>
            {canArchive && (
                <button type="button" onClick={onArchive} className={BUTTON}>
                    <Archive className="w-3.5 h-3.5"/> {t("szRegistry.sendToArchive")}
                </button>
            )}
            {/* Избранное: кнопка видна, только если ей есть что сделать с отмеченными строками */}
            {canAddFavorites && onAddFavorites && (
                <button type="button" onClick={onAddFavorites} disabled={favoriteBusy} className={BUTTON}>
                    <Star className="w-3.5 h-3.5" fill="#f5b400" color="#e0a100"/> {t("szRegistry.addToFavorites")}
                </button>
            )}
            {canRemoveFavorites && onRemoveFavorites && (
                <button type="button" onClick={onRemoveFavorites} disabled={favoriteBusy} className={BUTTON}>
                    <StarOff className="w-3.5 h-3.5"/> {t("szRegistry.removeFromFavorites")}
                </button>
            )}
            <button
                type="button" onClick={onClear}
                className="text-[12px] text-[#8b97ab] cursor-pointer bg-transparent border-none"
            >
                {t("szRegistry.clearSelection")}
            </button>
        </div>
    );
}
