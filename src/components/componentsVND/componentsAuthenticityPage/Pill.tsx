// Скруглённая метка-«таблетка» с тонами neutral / good / warn / accent (статусы, язык, версии).
import type {ReactNode} from "react";

export function Pill({tone = "neutral", children}: {
    tone?: "neutral" | "good" | "warn" | "accent";
    children: ReactNode
}) {
    const style = {
        neutral: "border-[#e5e9f0] bg-[#f6f8fb] text-[#55617a]",
        good: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]",
        warn: "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]",
        accent: "border-[#d9dcf7] bg-[#ececfc] text-[#4e57d6]",
    }[tone];
    return <span className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${style}`}>{children}</span>;
}
