// Кнопка-переключатель подвкладки ("Ссылки на документы" / "Ссылающиеся документы")
import type {ReactNode} from "react";

export function SubTabButton({active, onClick, children}: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                active ? "bg-indigo-50 text-[#4e57d6]" : "text-[#8b97ab] hover:bg-slate-50"
            }`}
        >
            {children}
        </button>
    );
}
