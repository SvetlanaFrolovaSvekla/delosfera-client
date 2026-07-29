// Строка поиска
import {useTranslation} from "react-i18next";
import {Icon} from "@/components/icons/Icon";
import {X} from "lucide-react";

interface SearchBarProps {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    maxWidth?: string; // ограничить рост, если понадобится в другом месте
    variant?: "gray" | "white"; // фон поля, серый по умолчанию
}

export function SearchBar({
                              placeholder,
                              value,
                              onChange,
                              className = "",
                              maxWidth,
                              variant = "gray",
                          }: SearchBarProps) {
    const {t} = useTranslation();

    return (
        <div
            className={`relative flex-1 ${className}`}
            style={maxWidth ? {maxWidth} : undefined}
        >
            <Icon
                name="search"
                width={17}
                height={17}
                className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[#8b97ab]"
            />
            <input
                placeholder={placeholder ?? t("general.search")}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className={`h-[38px] w-full rounded-[10px] border border-[#e5e9f0] pl-[38px] pr-9 text-[13px] outline-none focus:border-[var(--app-accent,_#4e57d6)] focus:bg-white focus:ring-[3px] focus:ring-[var(--app-soft,_#ececfc)] ${
                    variant === "white" ? "bg-white" : "bg-[#f6f8fb]"
                }`}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange?.("")}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#e5e9f0] hover:text-[#55617a] cursor-pointer"
                >
                    <X className="w-[13px] h-[13px]" strokeWidth={2.5}/>
                </button>
            )}
        </div>
    );
}