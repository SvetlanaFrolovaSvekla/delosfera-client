// Выбор/снятие всех чекбоксов в рубрикаторе
import {useTranslation} from "react-i18next";

interface SelectAllBarProps {
    allSelected: boolean;
    noneSelected: boolean;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

export function SelectAllBar({allSelected, noneSelected, onSelectAll, onDeselectAll}: SelectAllBarProps) {
    const {t} = useTranslation();

    return (
        <div className="flex items-center justify-between px-5 pb-2 flex-none">
            <button
                type="button"
                onClick={onSelectAll}
                disabled={allSelected}
                className="text-[11px] font-semibold cursor-pointer"
                style={{color: allSelected ? "#c3ccd8" : "#1c9c5c"}}
            >
                {t("general.selectAll")}
            </button>
            <button
                type="button"
                onClick={onDeselectAll}
                disabled={noneSelected}
                className="text-[11px] font-semibold cursor-pointer"
                style={{color: noneSelected ? "#c3ccd8" : "#1c9c5c"}}
            >
                {t("general.deselectAll")}
            </button>
        </div>
    );
}