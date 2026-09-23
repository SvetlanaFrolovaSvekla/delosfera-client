// Всплывающее уведомление при успехе, загрузки, предупреждении и др.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { toast, type ToastItem } from "@/service/toastService.ts";

const VARIANT_META = {
    success: { icon: CheckCircle2, color: "#1c7a4d", bg: "#eafaf1", border: "#bfe8d0" },
    error: { icon: XCircle, color: "#c0392b", bg: "#fdf1f1", border: "#f2c2c2" },
    warning: { icon: AlertTriangle, color: "#b3730a", bg: "#fdf3e0", border: "#f0dcae" },
    info: { icon: Info, color: "#4e57d6", bg: "#f2f3fd", border: "#dadcf7" },
    loading: { icon: Loader2, color: "#4e57d6", bg: "#f2f3fd", border: "#dadcf7" },
} as const;

// Максимум строк заголовка/описания тоста - остальное обрезается многоточием.
const TITLE_MAX_LINES = 2;
const DESCRIPTION_MAX_LINES = 3;

function clampStyle(lines: number): React.CSSProperties {
    return {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
    };
}

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

    const handleCardClick = () => {
        if (!item.onClick) return;
        item.onClick();
        setLeaving(true);
        setTimeout(() => toast.dismiss(item.id), 200);
    };

    return (
        <div
            onClick={handleCardClick}
            className={`pointer-events-auto flex w-[340px] max-h-[160px] items-start overflow-hidden gap-3 rounded-[12px] border px-4 py-3 shadow-[0_10px_30px_-8px_rgba(28,39,64,0.25)] transition-all duration-200 ${
                item.onClick ? "cursor-pointer" : ""
            } ${visible && !leaving ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            style={{ background: meta.bg, borderColor: meta.border }}
        >
            <Icon
                size={19}
                className={`mt-[1px] flex-none ${item.variant === "loading" ? "animate-spin" : ""}`}
                style={{ color: meta.color }}
            />
            {/* Заголовок и описание ограничены по числу строк (см. clampStyle) - уведомления
                вроде "Редакцию согласовали (с замечаниями)" приходят с длинным текстом и
                раньше растягивали тост на пол-экрана. Полный текст - во всплывающей подсказке
                (title) и в самом уведомлении, куда ведёт клик по тосту. */}
            <div
                className="min-w-0 flex-1"
                title={item.description ? `${item.title}\n${item.description}` : item.title}
            >
                <div
                    className="break-words text-[13px] font-semibold text-[#1c2740]"
                    style={clampStyle(TITLE_MAX_LINES)}
                >
                    {item.title}
                </div>
                {item.description && (
                    <div
                        className="mt-[3px] break-words text-[12px] leading-[1.5] text-[#55617a]"
                        style={clampStyle(DESCRIPTION_MAX_LINES)}
                    >
                        {item.description}
                    </div>
                )}
            </div>
            {item.variant !== "loading" && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setLeaving(true);
                        setTimeout(() => toast.dismiss(item.id), 200);
                    }}
                    className="flex-none cursor-pointer text-[#8b97ab] hover:text-[#3a4560]"
                >
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
