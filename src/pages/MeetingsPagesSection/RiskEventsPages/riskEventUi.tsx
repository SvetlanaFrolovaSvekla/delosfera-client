import type {ReactNode} from "react";
import type {RiskEventSeverity, RiskEventStatus} from "../../../service/riskEventService/riskEventService.ts";

const ACCENT = "#4e57d6";

interface Tone {
    fg: string;
    bg: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const SEVERITY_TONE: Record<RiskEventSeverity, Tone> = {
    Low: {fg: "#5b6472", bg: "#f2f5f9"},
    Medium: {fg: ACCENT, bg: "#ececfc"},
    High: {fg: "#b3730a", bg: "#fdf3e2"},
    Critical: {fg: "#c0392b", bg: "#fbeae7"},
};

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_TONE: Record<RiskEventStatus, Tone> = {
    New: {fg: ACCENT, bg: "#ececfc"},
    InProgress: {fg: "#b3730a", bg: "#fdf3e2"},
    Closed: {fg: "#1c7a4d", bg: "#e5f7ee"},
};

export function Badge({tone, dot, children}: { tone: Tone; dot?: boolean; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[10px] py-[3px] text-[12px] font-semibold"
              style={{color: tone.fg, backgroundColor: tone.bg}}>
            {dot && <span className="h-[6px] w-[6px] rounded-full" style={{backgroundColor: tone.fg}}/>}
            {children}
        </span>
    );
}
