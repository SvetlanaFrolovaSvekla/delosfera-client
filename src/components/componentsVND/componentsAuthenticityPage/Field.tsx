// Пара «подпись сверху - значение снизу» для полей SignatureCard.
import type {ReactNode} from "react";

export function Field({label, children}: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#a3adbd]">{label}</div>
            <div className="mt-0.5 text-[12.5px] text-[#1c2740]">{children}</div>
        </div>
    );
}
