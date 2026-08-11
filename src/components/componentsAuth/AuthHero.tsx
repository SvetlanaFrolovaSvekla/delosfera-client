// Левая (декоративная) панель страницы авторизации: анимация маршрута документа,
// плавающие иконки делопроизводства и брендинг «Делосферы».
import {useTranslation} from "react-i18next";

const FLOW_1 = "M60,760 C260,700 300,520 500,500 S 760,300 940,150";
const FLOW_2 = "M40,300 C220,340 280,470 480,460 S 720,560 960,620";

type HeroIcon = {
    top: string;
    left: string;
    size: number;
    dur: number;
    delay: number;
    rot: number;
    color: string;
    icon: "doc" | "pen" | "stamp" | "signline";
};

const HERO_ICONS: HeroIcon[] = [
    {top: "12%", left: "10%", size: 34, dur: 7.5, delay: 0, rot: -8, color: "rgba(255,255,255,.5)", icon: "doc"},
    {top: "72%", left: "14%", size: 26, dur: 6.2, delay: 0.8, rot: 10, color: "var(--brand)", icon: "pen"},
    {top: "20%", left: "78%", size: 30, dur: 8.4, delay: 0.3, rot: 6, color: "rgba(255,255,255,.4)", icon: "stamp"},
    {top: "82%", left: "70%", size: 30, dur: 6.8, delay: 1.2, rot: -6, color: "#9fd8bd", icon: "doc"},
    {top: "52%", left: "6%", size: 20, dur: 5.6, delay: 0.5, rot: 12, color: "rgba(255,255,255,.35)", icon: "signline"},
    {top: "6%", left: "52%", size: 22, dur: 7.0, delay: 1.6, rot: -10, color: "var(--brand)", icon: "pen"},
    {top: "88%", left: "38%", size: 24, dur: 9.0, delay: 0.9, rot: 8, color: "rgba(255,255,255,.4)", icon: "doc"},
    {top: "34%", left: "90%", size: 20, dur: 6.4, delay: 0.4, rot: -12, color: "#9fd8bd", icon: "stamp"},
];

export function AuthHero() {
    const {t} = useTranslation();

    return (
        <div
            className="relative hidden min-w-0 flex-[1.15] flex-col justify-between overflow-hidden px-14 pt-14 pb-12 text-white lg:flex"
            style={{background: "radial-gradient(circle at 20% 15%, #14603f 0%, #0f1b2d 55%, #071018 100%)"}}
        >
            <div data-auth-decor="" aria-hidden="true">
                {/* Светящиеся пятна */}
                <div
                    className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(36,163,107,.45), transparent 70%)",
                        animation: "authGlow 9s ease-in-out infinite",
                    }}
                />
                <div
                    className="absolute -right-40 -bottom-50 h-[480px] w-[480px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(70,90,180,.3), transparent 70%)",
                        animation: "authGlow 11s ease-in-out infinite 1s",
                    }}
                />

                {/* Маршруты согласования с «бегущими» документами */}
                <svg
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full opacity-90"
                >
                    <path d={FLOW_1} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.4" strokeDasharray="1 9"/>
                    <path
                        d={FLOW_1}
                        fill="none"
                        stroke="var(--brand)"
                        strokeWidth="1.6"
                        strokeDasharray="8 10"
                        style={{opacity: 0.55, animation: "authDash 5s linear infinite"}}
                    />
                    <path d={FLOW_2} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.4" strokeDasharray="1 9"/>
                    <path
                        d={FLOW_2}
                        fill="none"
                        stroke="#9fd8bd"
                        strokeWidth="1.6"
                        strokeDasharray="7 11"
                        style={{opacity: 0.4, animation: "authDash 6.5s linear infinite 1.2s"}}
                    />

                    <circle cx="60" cy="760" r="5" fill="var(--brand)" style={{opacity: 0.8}}/>
                    <circle cx="500" cy="500" r="5" fill="#fff" style={{opacity: 0.6}}/>
                    <circle cx="940" cy="150" r="5" fill="#fff" style={{opacity: 0.6}}/>

                    <g style={{offsetPath: `path('${FLOW_1}')`, animation: "authTravel 5s linear infinite"}}>
                        <circle r="6.5" fill="#ffffff"/>
                        <circle r="10" fill="none" stroke="var(--brand)" strokeWidth="1.5"/>
                    </g>
                    <g style={{offsetPath: `path('${FLOW_2}')`, animation: "authTravel 6.5s linear infinite 1.2s"}}>
                        <circle r="5.5" fill="#9fd8bd"/>
                    </g>
                </svg>

                {/* Плавающие иконки делопроизводства */}
                {HERO_ICONS.map((d, i) => (
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
                        <svg
                            viewBox="0 0 24 24"
                            width={d.size}
                            height={d.size}
                            fill="none"
                            stroke={d.color}
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            {d.icon === "doc" && (
                                <>
                                    <path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                                    <path d="M14 3v5h5"/>
                                    <path d="M9 13h6M9 16.5h4"/>
                                </>
                            )}
                            {d.icon === "pen" && <path d="M14.5 5.5 18.5 9.5M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19z"/>}
                            {d.icon === "stamp" && (
                                <>
                                    <path d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6z"/>
                                    <path d="m9 12 2 2 4-4"/>
                                </>
                            )}
                            {d.icon === "signline" && (
                                <>
                                    <path d="M3 17c2.5-6 4-9 6-9s1.5 6 3.5 6 2-4 4-4 2 3 4.5 3"/>
                                    <path d="M4 21h16"/>
                                </>
                            )}
                        </svg>
                    </div>
                ))}

                {/* «Печать» согласования */}
                <div
                    className="absolute top-[41%] left-[52%] -mt-[65px] -ml-[65px] h-[130px] w-[130px]"
                    style={{animation: "authStampPop 4.5s ease-in-out infinite"}}
                >
                    <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="var(--brand)" strokeWidth={1.1}>
                        <circle cx="12" cy="12" r="10.2" strokeDasharray="2.4 3.2"/>
                        <path d="m8 12.3 2.6 2.6L17 8.4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>

            {/* Логотип */}
            <div className="relative z-1 flex items-center gap-[11px]">
                <div
                    className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[var(--brand,#24a36b)] shadow-[0_4px_12px_-3px_rgba(0,0,0,.4)]">
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
            </div>

            {/* Слоган */}
            <div className="relative z-1 max-w-[460px]">
                <div className="text-[32px] leading-[1.2] font-bold tracking-[-0.01em]">{t("auth.heroTitle")}</div>
                <div className="mt-3.5 text-[14.5px] leading-[1.6] text-[#c3cfda]">{t("auth.heroSubtitle")}</div>
            </div>
        </div>
    );
}
