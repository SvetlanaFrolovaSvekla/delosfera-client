// Компонент Loader загрузки (кольцо)
interface LoaderProps {
    label?: string;
    size?: "sm" | "md" | "lg";
    fullHeight?: boolean;
}

const SIZE_MAP = {
    sm: "w-5 h-5 border-2",
    md: "w-9 h-9 border-[3px]",
    lg: "w-14 h-14 border-4",
} as const;

export function Loader({label = "Загрузка…", size = "md", fullHeight = true}: LoaderProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 ${
                fullHeight ? "py-16" : "py-6"
            }`}
        >
            <div className="relative flex items-center justify-center">
                <div
                    className={`${SIZE_MAP[size]} rounded-full border-[#ececfc] border-t-[#4e57d6] animate-spin`}
                />
            </div>
            {label && (
                <span className="text-[13px] text-[#8b97ab]">{label}</span>
            )}
        </div>
    );
}