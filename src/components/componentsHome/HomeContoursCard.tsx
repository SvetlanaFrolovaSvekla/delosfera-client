import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {dashboardService, type DashboardSummary} from "@/service/dashboardService/dashboardService.ts";

/**
 * Сводка по остальным контурам и замещения на рабочем столе.
 *
 * Рабочий стол исторически показывал только ВНД, а служебные записки и закупки
 * жили каждый в своём разделе: чтобы понять, что горит, приходилось обходить их
 * по очереди. Здесь они собраны рядом, а тон плитки задаёт срочность — просрочка
 * краснеет независимо от контура (GEN-15).
 *
 * Замещение показывается отдельной строкой: пока период идёт, задачи отсутствующего
 * приходят замещающему, и он должен видеть, почему у него чужая работа (GEN-14).
 */
export function HomeContoursCard() {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);

    useEffect(() => {
        dashboardService.summary().then(setDashboard).catch(() => undefined);
    }, []);

    if (!dashboard) return null;

    return (
        <>
            {dashboard.actingFor.length > 0 && (
                <div className="mb-5 rounded-[14px] border border-[#f0c98a] bg-[#fffaf0] px-4 py-3">
                    <div className="text-[13px] font-semibold text-[#8a5a00]">Активно замещение</div>
                    {dashboard.actingFor.map((s) => (
                        <div key={s.id} className="mt-1 text-[12.5px] leading-[1.6] text-[#8a5a00]">
                            Вы замещаете: <b>{s.userName}</b> — задачи перенаправлены вам автоматически
                            с сохранением сроков. Период: {s.startsOn} — {s.endsOn}
                            {s.reason ? ` · ${s.reason}` : ""}
                        </div>
                    ))}
                </div>
            )}

            {dashboard.replacedBy.length > 0 && (
                <div className="mb-5 rounded-[14px] border border-[#cbddff] bg-[#e9f0ff] px-4 py-3">
                    {dashboard.replacedBy.map((s) => (
                        <div key={s.id} className="text-[12.5px] leading-[1.6] text-[#2f68f5]">
                            Вас замещает <b>{s.userName}</b> до {s.endsOn}
                            {s.reason ? ` · ${s.reason}` : ""}
                        </div>
                    ))}
                </div>
            )}

            {dashboard.kpis.length > 0 && (
                <div className="mb-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {dashboard.kpis.map((k) => {
                        const tone = k.tone === "danger"
                            ? {col: "#c0392b", tint: "#fdeeec", bd: "#f3c9c2"}
                            : k.tone === "warning"
                                ? {col: "#c77700", tint: "#fffaf0", bd: "#f0c98a"}
                                : {col: "#2f68f5", tint: "#f6f8fb", bd: "#e5e9f0"};

                        const target = k.code.startsWith("sz")
                            ? "/sz"
                            : k.code.startsWith("prc")
                                ? "/prc"
                                : "/tasks";

                        return (
                            <button
                                key={k.code}
                                onClick={() => navigate(target)}
                                className="cursor-pointer relative overflow-hidden rounded-[14px] border p-4 pb-[17px] text-left transition-transform hover:-translate-y-0.5"
                                style={{background: tone.tint, borderColor: tone.bd}}
                            >
                                <span className="absolute inset-y-0 left-0 w-1" style={{background: tone.col}}/>
                                <span className="block min-h-8 text-[12px] font-medium leading-[1.35] text-[#5b6675]">
                                    {k.label}
                                </span>
                                <span
                                    className="mt-1.5 block text-[28px] font-bold tracking-[-0.02em]"
                                    style={{color: tone.col, fontFamily: "'IBM Plex Mono', monospace"}}
                                >
                                    {k.value}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}
