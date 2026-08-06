// Всплывающее уведомление при успехе, загрузки, предупреждении и др.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { toast, type ToastItem } from "@/service/toastService.ts";

const VARIANT_META = {
    success: { icon: CheckCircle2, color: "#1c7a4d", bg: "#eafaf1", border: "#bfe8d0" },
    error: { icon: XCircle, color: "#c0392b", bg: "#fdf1f1", border: "#f2c2c2" },
    info: { icon: Info, color: "#4e57d6", bg: "#f2f3fd", border: "#dadcf7" },
    loading: { icon: Loader2, color: "#4e57d6", bg: "#f2f3fd", border: "#dadcf7" },
} as const;

function ToastCard({ item }: { item: ToastItem }) {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const meta = VARIANT_META[item.variant];
    const Icon = meta.icon;

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        let hideTimer: ReturnType<typeof setTimeout> | undefined;
        let removeTimer: ReturnType<typeof setTimeout> | undefined;

        if (item.duration > 0) {
            hideTimer = setTimeout(() => setLeaving(true), item.duration);
            removeTimer = setTimeout(() => toast.dismiss(item.id), item.duration + 200);
        }

        return () => {
            cancelAnimationFrame(raf);
            if (hideTimer) clearTimeout(hideTimer);
            if (removeTimer) clearTimeout(removeTimer);
        };
    }, [item.id, item.duration]);

    const handleClose = () => {
        setLeaving(true);
        setTimeout(() => toast.dismiss(item.id), 200);
    };

    return (
        <div
            className={`pointer-events-auto flex w-[340px] items-start gap-3 rounded-[12px] border px-4 py-3 shadow-[0_10px_30px_-8px_rgba(28,39,64,0.25)] transition-all duration-200 ${
                visible && !leaving ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            style={{ background: meta.bg, borderColor: meta.border }}
        >
            <Icon
                size={19}
                className={`mt-[1px] flex-none ${item.variant === "loading" ? "animate-spin" : ""}`}
                style={{ color: meta.color }}
            />
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#1c2740]">{item.title}</div>
                {item.description && (
                    <div className="mt-[3px] text-[12px] leading-[1.5] text-[#55617a]">{item.description}</div>
                )}
            </div>
            {item.variant !== "loading" && (
                <button onClick={handleClose} className="flex-none cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                    <X size={15} />
                </button>
            )}
        </div>
    );
}

export function ToastContainer() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => toast.subscribe(setItems), []);

    if (items.length === 0) return null;

    return createPortal(
        <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-[10px]">
            {items.map((item) => (
                <ToastCard key={item.id} item={item} />
            ))}
        </div>,
        document.body
    );
}