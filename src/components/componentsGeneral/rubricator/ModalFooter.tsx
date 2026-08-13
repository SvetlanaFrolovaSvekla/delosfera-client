// Нижняя часть рубрикатора (кнопки отмена/перейти, кол-во выбранных рубрик)
import {useTranslation} from "react-i18next";

interface ModalFooterProps {
    counterLabel: string;
    counterValue: number;
    onCancel: () => void;
    onApply: () => void;
    applyLabel: string;
}

export function ModalFooter({counterLabel, counterValue, onCancel, onApply, applyLabel}: ModalFooterProps) {
    const {t} = useTranslation();

    return (
        <div className="flex items-center justify-between gap-2.5 px-5 py-4 border-t border-[#eef2f7] flex-none">
            <span className="text-[12px] text-[#8b97ab]">
                {counterLabel}{" "}
                <b className="text-[#3a4560] font-mono">{counterValue}</b>
            </span>
            <div className="flex items-center gap-2.5">
                <button
                    onClick={onCancel}
                    className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                >
                    {t("general.cancel")}
                </button>
                <button
                    onClick={onApply}
                    className="h-9 px-5 rounded-[9px] border-none text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                    style={{background: "#1c9c5c"}}
                >
                    {applyLabel}
                </button>
            </div>
        </div>
    );
}