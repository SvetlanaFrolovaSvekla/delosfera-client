// Минималистичный серый узор для нижней части пустых панелей (например, на главной странице
// "Пока нет уведомлений", "Пока нет событий"): точечная сетка с шариками
const FADE_MASK =
    "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,.95) 45%, rgba(0,0,0,.4) 75%, rgba(0,0,0,.25) 80%, rgba(0,0,0,0) 100%)";

export function EmptyPanelPattern({className = ""}: { className?: string }) {
    return (
        <div
            className={`pointer-events-none select-none ${className}`}
            style={{WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK}}
            aria-hidden="true"
        >
            {/* Точечная сетка */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #d9dce2 1.1px, transparent 1.3px)",
                    backgroundSize: "18px 18px",
                    backgroundPosition: "center bottom",
                }}
            />
        </div>
    );
}
