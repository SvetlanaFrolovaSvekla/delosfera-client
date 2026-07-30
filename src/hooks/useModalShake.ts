// Хук для "тряски" модалки
import {useRef} from "react";

export function useModalShake() {
    const panelRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = () => {
        panelRef.current?.animate(
            [
                {transform: "translateX(0)"},
                {transform: "translateX(-3px)"},
                {transform: "translateX(3px)"},
                {transform: "translateX(-2px)"},
                {transform: "translateX(2px)"},
                {transform: "translateX(0)"},
            ],
            {duration: 220, easing: "ease-in-out"}
        );
    };

    return {panelRef, handleBackdropClick};
}