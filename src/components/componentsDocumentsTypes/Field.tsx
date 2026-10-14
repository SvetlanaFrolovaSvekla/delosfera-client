import React from "react";

export function Field({label, hint, required, children}: {
    label: string; hint?: string;
    /** Красная звёздочка у подписи — поле обязательное. */
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="flex flex-col min-w-0">
            <span className="text-[11.5px] text-[#4d5a72] mb-[5px]">
                {label}{required && <span className="text-[#c0392b]"> *</span>}
            </span>
            {children}
            {hint && <span className="mt-1 text-[11.5px] leading-[1.5] text-[#96590a]">{hint}</span>}
        </label>
    );
}
