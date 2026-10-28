// Страница «Адрес не найден» (маршрут "*"). Визуально продолжает левую панель авторизации
// (AuthHero): тот же тёмно-зелёный фон, светящиеся пятна и плавающие иконки делопроизводства,
// а сюжет — маршрут документа, который «оборвался» и потерялся у знака вопроса.
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {CSSProperties} from "react";

// Маршрут: начинается в левом нижнем углу, поднимается и обрывается слева от «404».
const LOST_ROUTE = "M-20,900 C120,860 180,720 230,620 S 290,430 330,390";
// Второй, фоновый маршрут — по правому краю, документ по нему спокойно доходит.
const SIDE_ROUTE = "M1020,560 C930,620 900,760 820,820 S 700,900 640,1020";

type FloatIcon = {
    top: string;
    left: string;
    size: number;
    dur: number;
    delay: number;
    rot: number;
    color: string;
    icon: "doc" | "pen" | "stamp" | "search" | "signline";
};

const ICONS: FloatIcon[] = [
    {top: "14%", left: "8%", size: 34, dur: 7.5, delay: 0, rot: -8, color: "rgba(255,255,255,.45)", icon: "doc"},
    {top: "70%", left: "10%", size: 26, dur: 6.2, delay: 0.8, rot: 10, color: "var(--brand)", icon: "pen"},
    {top: "18%", left: "84%", size: 30, dur: 8.4, delay: 0.3, rot: 6, color: "rgba(255,255,255,.38)", icon: "stamp"},
    {top: "78%", left: "82%", size: 30, dur: 6.8, delay: 1.2, rot: -6, color: "#9fd8bd", icon: "search"},
    {top: "46%", left: "4%", size: 20, dur: 5.6, delay: 0.5, rot: 12, color: "rgba(255,255,255,.3)", icon: "signline"},
    {top: "7%", left: "46%", size: 22, dur: 7.0, delay: 1.6, rot: -10, color: "var(--brand)", icon: "doc"},
    {top: "90%", left: "34%", size: 24, dur: 9.0, delay: 0.9, rot: 8, color: "rgba(255,255,255,.35)", icon: "search"},
    {top: "40%", left: "93%", size: 20, dur: 6.4, delay: 0.4, rot: -12, color: "#9fd8bd", icon: "pen"},
];

function IconGlyph({icon}: { icon: FloatIcon["icon"] }) {
    switch (icon) {
        case "doc":
            return (
                <>
                    <path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                    <path d="M14 3v5h5"/>
                    <path d="M9 13h6M9 16.5h4"/>
                </>
            );
        case "pen":
            return <path d="M14.5 5.5 18.5 9.5M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19z"/>;
        case "stamp":
            return (
                <>
                    <path d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6z"/>
                    <path d="m9 12 2 2 4-4"/>
                </>
            );
        case "search":
            return (
                <>
                    <circle cx="11" cy="11" r="6.5"/>
                    <path d="m20 20-4.2-4.2"/>
                </>
            );
        case "signline":
            return (
                <>
                    <path d="M3 17c2.5-6 4-9 6-9s1.5 6 3.5 6 2-4 4-4 2 3 4.5 3"/>
                    <path d="M4 21h16"/>
                </>
            );
    }
}

const digitStyle: CSSProperties = {
    background: "linear-gradient(180deg, #ffffff 0%, #bfe8d3 55%, #5cc596 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    textShadow: "0 18px 50px rgba(36,163,107,.35)",
};

export function NotFoundPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {pathname} = useLocation();

    // Если вкладку открыли сразу по битой ссылке, «назад» уведёт с сайта — тогда ведём на главную.
    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

    return (
        <div
            className="relative flex min-h-screen w-full flex-col overflow-hidden px-6 py-8 text-white sm:px-14 sm:py-12"
            style={{background: "radial-gradient(circle at 22% 18%, #14603f 0%, #0f1b2d 55%, #071018 100%)"}}
        >
            <div data-auth-decor="" aria-hidden="true">
                {/* Светящиеся пятна */}
                <div
                    className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(36,163,107,.45), transparent 70%)",
                        animation: "authGlow 9s ease-in-out infinite",
                    }}
                />
                <div
                    className="absolute -right-44 -bottom-52 h-[520px] w-[520px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(70,90,180,.28), transparent 70%)",
                        animation: "authGlow 11s ease-in-out infinite 1s",
                    }}
                />
                <div
                    className="absolute top-1/2 left-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(36,163,107,.16), transparent 65%)",
                        animation: "authGlow 7s ease-in-out infinite .5s",
                    }}
                />

                {/* Маршруты: один обрывается (документ теряется), второй — фоновый */}
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                    <path d={LOST_ROUTE} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.4" strokeDasharray="1 9"/>
                    <path
                        d={LOST_ROUTE}
                        fill="none"
                        stroke="var(--brand)"
                        strokeWidth="1.6"
                        strokeDasharray="8 10"
                        style={{opacity: 0.6, animation: "authDash 5s linear infinite"}}
                    />
                    <path d={SIDE_ROUTE} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.4" strokeDasharray="1 9"/>
                    <path
                        d={SIDE_ROUTE}
                        fill="none"
                        stroke="#9fd8bd"
                        strokeWidth="1.4"
                        strokeDasharray="7 11"
                        style={{opacity: 0.3, animation: "authDash 6.5s linear infinite 1.2s"}}
                    />

                    <circle cx="230" cy="620" r="5" fill="#fff" style={{opacity: 0.55}}/>
                    <circle cx="330" cy="390" r="5" fill="#fff" style={{opacity: 0.55}}/>

                    <g style={{offsetPath: `path('${LOST_ROUTE}')`, animation: "nfLost 5s ease-in infinite"}}>
                        <circle r="6.5" fill="#ffffff"/>
                        <circle r="10" fill="none" stroke="var(--brand)" strokeWidth="1.5"/>
                    </g>
                    <g style={{offsetPath: `path('${SIDE_ROUTE}')`, animation: "authTravel 6.5s linear infinite 1.2s"}}>
                        <circle r="5" fill="#9fd8bd"/>
                    </g>
                </svg>

                {/* Плавающие иконки */}
                {ICONS.map((d, i) => (
                    <div
                        key={i}
                        className="absolute opacity-85"
                        style={{
                            top: d.top,
                            left: d.left,
                            ["--rot" as string]: `${d.rot}deg`,
                            animation: `authFloat ${d.dur}s ease-in-out ${d.delay}s infinite`,
                        }}
                    >
                        <svg viewBox="0 0 24 24" width={d.size} height={d.size} fill="none" stroke={d.color}
                             strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <IconGlyph icon={d.icon}/>
                        </svg>
                    </div>
                ))}
            </div>

            {/* Логотип */}
            <Link to="/" className="relative z-1 flex w-fit items-center gap-[11px] no-underline" style={{color: "#fff"}}>
                <div className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[var(--brand,#24a36b)] shadow-[0_4px_12px_-3px_rgba(0,0,0,.4)]">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" strokeWidth={2}
                         strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/>
                        <path d="M12 3v18M4 7.5l8 4.5 8-4.5"/>
                    </svg>
                </div>
                <div>
                    <div className="text-[17px] leading-none font-bold tracking-[-0.01em]">{t("auth.brandName")}</div>
                    <div className="mt-[3px] text-[11px] font-medium tracking-[0.04em] text-[#9fb3ad]">
                        {t("auth.brandSub")}
                    </div>
                </div>
            </Link>

            {/* Центр */}
            <main className="relative z-1 flex flex-1 flex-col items-center justify-center py-10 text-center">
                <div
                    data-nf-anim=""
                    className="flex items-center justify-center gap-1 select-none sm:gap-3"
                    style={{animation: "nfRise .7s cubic-bezier(.2,.8,.2,1) both"}}
                    aria-hidden="true"
                >
                    <span className="text-[110px] leading-none font-extrabold tracking-[-0.04em] sm:text-[170px]" style={digitStyle}>4</span>

                    {/* «0» — печать согласования, которая ищет потерянный документ */}
                    <span className="relative grid h-[96px] w-[96px] place-items-center sm:h-[150px] sm:w-[150px]">
                        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" fill="none"
                             style={{animation: "nfSpin 14s linear infinite"}}>
                            <circle cx="12" cy="12" r="10.6" stroke="var(--brand)" strokeWidth={0.9} strokeDasharray="2.4 3.2"/>
                        </svg>
                        <svg viewBox="0 0 24 24" className="absolute inset-[12%] h-[76%] w-[76%]" fill="none"
                             style={{animation: "nfSpin 9s linear infinite reverse"}}>
                            <circle cx="12" cy="12" r="10.6" stroke="rgba(255,255,255,.35)" strokeWidth={0.7} strokeDasharray="0.8 2.6"/>
                        </svg>
                        <span
                            className="relative text-[52px] leading-none font-extrabold sm:text-[80px]"
                            style={{...digitStyle, animation: "nfWobble 3.2s ease-in-out infinite", display: "inline-block"}}
                        >
                            ?
                        </span>
                    </span>

                    <span className="text-[110px] leading-none font-extrabold tracking-[-0.04em] sm:text-[170px]" style={digitStyle}>4</span>
                </div>

                <h1
                    data-nf-anim=""
                    className="mt-4 text-[26px] leading-[1.2] font-bold tracking-[-0.01em] sm:text-[32px]"
                    style={{animation: "nfRise .7s cubic-bezier(.2,.8,.2,1) .12s both"}}
                >
                    {t("notFoundPage.title")}
                </h1>
                <p
                    data-nf-anim=""
                    className="mt-3 max-w-[460px] text-[14.5px] leading-[1.6] text-[#c3cfda]"
                    style={{animation: "nfRise .7s cubic-bezier(.2,.8,.2,1) .2s both"}}
                >
                    {t("notFoundPage.subtitle")}
                </p>

                {pathname && pathname !== "/" && (
                    <div
                        data-nf-anim=""
                        className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3.5 py-1.5 text-[12px] text-[#9fb3ad] backdrop-blur-sm"
                        style={{animation: "nfRise .7s cubic-bezier(.2,.8,.2,1) .28s both"}}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2}
                             strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/>
                            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>
                        </svg>
                        <span className="truncate font-mono">{decodeURIComponent(pathname)}</span>
                    </div>
                )}

                <div
                    data-nf-anim=""
                    className="mt-8 flex flex-wrap items-center justify-center gap-3"
                    style={{animation: "nfRise .7s cubic-bezier(.2,.8,.2,1) .36s both"}}
                >
                    <Link
                        to="/"
                        className="inline-flex h-11 items-center gap-2 rounded-[11px] bg-[var(--brand,#24a36b)] px-5 text-[14px] font-semibold text-white no-underline shadow-[0_10px_30px_-8px_rgba(36,163,107,.7)] transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_34px_-8px_rgba(36,163,107,.85)]"
                        // Глобальное правило a { color } в index.css не в слое Tailwind и перебивает text-white
                        style={{color: "#fff"}}
                    >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={2}
                             strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="9" rx="1.5"/>
                            <rect x="14" y="3" width="7" height="5" rx="1.5"/>
                            <rect x="14" y="12" width="7" height="9" rx="1.5"/>
                            <rect x="3" y="16" width="7" height="5" rx="1.5"/>
                        </svg>
                        {t("notFoundPage.toDesktop")}
                    </Link>
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[11px] border border-white/15 bg-white/[.06] px-5 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[.12]"
                    >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={2}
                             strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M11 18l-6-6 6-6"/>
                        </svg>
                        {t("notFoundPage.back")}
                    </button>
                </div>
            </main>

            <div className="relative z-1 text-center text-[12px] text-[#7f948e]">
                {t("notFoundPage.hint")}
            </div>
        </div>
    );
}
