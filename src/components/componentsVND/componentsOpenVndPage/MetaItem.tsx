import type {ReactNode} from "react";

/** Подпись + значение в строке справа от табов на странице открытого ВНД*/
export function MetaItem({label, children}: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[#8b97ab]">{label}</span>
            {children}
        </div>
    );
}