// Кнопка для переключения месяца в шапке календаря
import type {ReactNode} from "react";

export function NavButton({label, onClick, children}: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="w-9 h-9 grid place-items-center rounded-[9px] border border-[#e5e9f0] bg-white cursor-pointer hover:bg-[#f6f8fb]"
        >
            {children}
        </button>
    );
}