import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {MoreVertical} from "lucide-react";

export interface VndActionsMenuItem {
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Меню «три точки» в шапке карточки ВНД: опасные действия (удалить, архивировать) убраны с глаз
 * в одно меню. Если действий нет — меню не рисуется вовсе.
 */
export function VndActionsMenu({items}: { items: VndActionsMenuItem[] }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    // Меню рисуется порталом в body с fixed-позицией: шапка карточки создаёт свой контекст
    // наложения/обрезку, и обычный absolute-выпадающий список уходит под контент страницы.
    const [pos, setPos] = useState<{top: number; right: number} | null>(null);

    useLayoutEffect(() => {
        if (!open || !rootRef.current) return;
        const place = () => {
            const r = rootRef.current!.getBoundingClientRect();
            setPos({top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right)});
        };
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (items.length === 0) return null;

    return (
        <div ref={rootRef} className="shrink-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="grid h-7 w-7 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#3a4560] cursor-pointer hover:border-[#4e57d6]/40 hover:bg-[#ececfc] hover:text-[#4e57d6] transition-colors"
            >
                <MoreVertical className="w-3.5 h-3.5" strokeWidth={2}/>
            </button>

            {open && pos && createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    style={{position: "fixed", top: pos.top, right: pos.right}}
                    className="z-[1000] min-w-[190px] overflow-hidden rounded-[10px] border border-[#e5e9f0] bg-white py-1 shadow-[0_8px_24px_rgba(28,39,64,0.12)]"
                >
                    {items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={() => {
                                setOpen(false);
                                item.onClick();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] disabled:cursor-default disabled:opacity-50"
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
}
