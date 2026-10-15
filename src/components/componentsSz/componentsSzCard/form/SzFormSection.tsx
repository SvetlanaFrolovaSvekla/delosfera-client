// Секция формы служебной записки: чуть более тёмная подложка с заголовком,
// внутри - обычные белые поля. Помогает отделить основное от дополнительного.
import type {ReactNode} from "react";

interface SzFormSectionProps {
    title: string;
    /** Пояснение справа от заголовка: что за поля в секции */
    hint?: string;
    children: ReactNode;
}

export function SzFormSection({title, hint, children}: SzFormSectionProps) {
    return (
        <section className="rounded-[12px] border border-[#e1e6ee] bg-[#fbfcff] p-5">
            <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-[#e5e9f0] pb-3">
                <h2 className="m-0 text-[12px] font-bold uppercase tracking-[.05em] text-[#55617a]">{title}</h2>
                {hint && <span className="text-[11.5px] text-[#8b97ab]">{hint}</span>}
            </header>
            {children}
        </section>
    );
}
