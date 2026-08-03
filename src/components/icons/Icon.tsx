import type {JSX, SVGProps} from "react";

const paths: Record<string, JSX.Element> = {
    cube: (
        <>
            <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
            <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
        </>
    ),
    dash: (
        <>
            <rect x="3" y="3" width="7" height="8" rx="1.6" />
            <rect x="14" y="3" width="7" height="5" rx="1.6" />
            <rect x="14" y="11" width="7" height="10" rx="1.6" />
            <rect x="3" y="14" width="7" height="7" rx="1.6" />
        </>
    ),
    folder: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
        </svg>
    ),
    vnd: (
        <>
            <path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            <path d="M14 3v5h5" />
            <path d="M9 13h6M9 16.5h4" />
        </>
    ),
    pln: (
        <>
            <rect x="3" y="4.5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v3M16 3v3" />
            <path d="m9 14 2 2 4-4" />
        </>
    ),
    tid: (
        <>
            <circle cx="6" cy="6" r="2.4" />
            <circle cx="6" cy="18" r="2.4" />
            <circle cx="18" cy="12" r="2.4" />
            <path d="M6 8.4v7.2M8.2 6h4.8a2 2 0 0 1 2 2v2.2M8.2 18h4.8a2 2 0 0 0 2-2v-2.2" />
        </>
    ),
    rpt: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    sz: (
        <>
            <path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            <path d="M14 3v5h5" />
            <path d="M8.5 13h7M8.5 16.5h7M8.5 9.5h3" />
        </>
    ),
    bell: (
        <>
            <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z" />
            <path d="M10.5 20a2 2 0 0 0 3 0" />
        </>
    ),
    prc: (
        <>
            <path d="M3 4h2l2.2 12.3a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20.5 8H6" />
            <circle cx="9.5" cy="20" r="1.3" />
            <circle cx="17.5" cy="20" r="1.3" />
        </>
    ),
    matrix: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1.4" />
            <rect x="14" y="3" width="7" height="7" rx="1.4" />
            <rect x="3" y="14" width="7" height="7" rx="1.4" />
            <rect x="14" y="14" width="7" height="7" rx="1.4" />
        </>
    ),
    flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
    shield: (
        <>
            <path d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6z" />
            <path d="m9 12 2 2 4-4" />
        </>
    ),
    committee: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15.5 13.4A4.5 4.5 0 0 1 21 17.8" />
        </>
    ),
    hr: (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2.5" />
            <circle cx="12" cy="9" r="2.6" />
            <path d="M7.5 17c0-2.3 2-3.6 4.5-3.6s4.5 1.3 4.5 3.6" />
        </>
    ),
    check: <path d="m5 12 5 5L20 6" />,
    mobile: (
        <>
            <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
            <path d="M10.5 18.5h3" />
        </>
    ),
    refs: (
        <>
            <ellipse cx="12" cy="6" rx="8" ry="3" />
            <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </>
    ),
    kb: (
        <>
            <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
            <path d="M4 5v14" />
            <path d="M9 7h6M9 10h4" />
        </>
    ),
    future: (
        <>
            <path d="m12 2 2.1 5.9L20 10l-5.9 2.1L12 18l-2.1-5.9L4 10l5.9-2.1z" />
            <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </>
    ),
    lock: (
        <>
            <rect x="4.5" y="10" width="15" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
        </>
    ),
    tasks: (
        <>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="m8 12.5 2.5 2.5L16 9" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chev: <path d="m6 9 6 6 6-6" />,
    chevr: <path d="m9 6 6 6-6 6" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
};

export type IconName = keyof typeof paths;

interface IconProps extends SVGProps<SVGSVGElement> {
    name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {paths[name]}
        </svg>
    );
}