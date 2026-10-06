// Белая карточка-обёртка блоков страницы служебной записки.
import type {ReactNode} from "react";

export function SzPanel({children, className = ""}: { children: ReactNode; className?: string }) {
    return (
        <div className={`mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5 ${className}`}>
            {children}
        </div>
    );
}
