// Чем отличается "Активность на портале" от "Технического журнала действий" - сворачиваемая
// подсказка над обеими страницами (Управление -> Наблюдение). По умолчанию свёрнута: тем, кто уже
// знает разницу, не мешает, а кто не знает - раскроет одним кликом.
import {useId, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Activity, ArrowUpRight, ChevronDown, FileText, Lightbulb, ScrollText, Target, Users} from "lucide-react";

type Side = "activity" | "audit";

interface ActivityVsAuditNoteProps {
    /** На какой из двух страниц показываем - у неё пометка "Вы здесь", у другой - ссылка "Открыть" */
    current: Side;
    className?: string;
}

export function ActivityVsAuditNote({current, className = ""}: ActivityVsAuditNoteProps) {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const [open, setOpen] = useState(false);
    const bodyId = useId();

    const title = current === "activity" ? t("activityFeed.vsAudit.title") : t("activityFeed.vsAudit.titleFromAudit");

    return (
        <section className={`overflow-hidden rounded-[14px] border bg-white transition-shadow ${
            open ? "border-[#dfe6f5] shadow-[0_8px_24px_-14px_rgba(47,104,245,.35)]" : "border-[#e9edf3] hover:border-[#cfdcf7]"
        } ${className}`}>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={bodyId}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-[#eef3ff] to-[#e3ebff] text-[var(--app-accent,_#2f68f5)]">
                    <Lightbulb size={16} strokeWidth={2}/>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#1c2740]">{title}</span>
                    {!open && (
                        <span className="mt-0.5 block truncate text-[12px] text-[#8b97ab]">{t("activityFeed.vsAudit.teaser")}</span>
                    )}
                </span>
                <span className="inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-[var(--app-accent,_#2f68f5)] group-hover:bg-[#eef3ff]">
                    {open ? t("activityFeed.vsAudit.hide") : t("activityFeed.vsAudit.show")}
                    <ChevronDown size={15} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}/>
                </span>
            </button>

            {open && (
                <div id={bodyId} className="grid grid-cols-1 gap-3 border-t border-[#eef2f7] bg-[#fbfcfe] p-4 md:grid-cols-2">
                    <SideCard
                        icon={<Activity size={16}/>}
                        accent="#2f68f5" tint="#eef3ff"
                        title={t("activityFeed.vsAudit.activityName")}
                        here={current === "activity"}
                        link={current !== "activity" ? "/activity" : undefined}
                        what={t("activityFeed.vsAudit.activityWhat")}
                        who={t("activityFeed.vsAudit.activityWho")}
                        why={t("activityFeed.vsAudit.activityWhy")}
                    />
                    <SideCard
                        icon={<ScrollText size={16}/>}
                        accent="#55617a" tint="#eef1f5"
                        title={t("activityFeed.vsAudit.auditTitle")}
                        here={current === "audit"}
                        // Ссылку на технический журнал - только тем, кому он открыт
                        link={current !== "audit" && hasPermission(PermissionCode.ManageUsers) ? "/management/audit" : undefined}
                        what={t("activityFeed.vsAudit.auditWhat")}
                        who={t("activityFeed.vsAudit.auditWho")}
                        why={t("activityFeed.vsAudit.auditWhy")}
                    />
                </div>
            )}
        </section>
    );
}

function SideCard({icon, accent, tint, title, here, link, what, who, why}: {
    icon: ReactNode;
    accent: string;
    tint: string;
    title: string;
    here: boolean;
    link?: string;
    what: string;
    who: string;
    why: string;
}) {
    const {t} = useTranslation();
    return (
        <div className="relative overflow-hidden rounded-[12px] border border-[#e9edf3] bg-white p-4"
             style={here ? {borderColor: `${accent}55`, boxShadow: `inset 0 3px 0 ${accent}`} : undefined}>
            <div className="mb-3 flex items-center gap-2.5">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px]" style={{background: tint, color: accent}}>
                    {icon}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] font-bold text-[#1c2740]">{title}</span>
                {here ? (
                    <span className="flex-none rounded-full px-2 py-[2px] text-[11px] font-semibold" style={{background: tint, color: accent}}>
                        {t("activityFeed.vsAudit.youAreHere")}
                    </span>
                ) : link ? (
                    // !: глобальное a { color } из index.css перебивает обычные классы цвета у ссылок
                    <Link to={link}
                          className="inline-flex flex-none items-center gap-0.5 rounded-full px-2 py-[2px] text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]! hover:bg-[#eef3ff]">
                        {t("activityFeed.vsAudit.open")}
                        <ArrowUpRight size={13}/>
                    </Link>
                ) : null}
            </div>
            <dl className="m-0 flex flex-col gap-2.5">
                <Row icon={<FileText size={13}/>} label={t("activityFeed.vsAudit.labelWhat")} text={what}/>
                <Row icon={<Users size={13}/>} label={t("activityFeed.vsAudit.labelWho")} text={who}/>
                <Row icon={<Target size={13}/>} label={t("activityFeed.vsAudit.labelWhy")} text={why}/>
            </dl>
        </div>
    );
}

function Row({icon, label, text}: { icon: ReactNode; label: string; text: string }) {
    return (
        <div className="flex gap-2.5">
            <span className="mt-[2px] grid h-5 w-5 flex-none place-items-center rounded-full bg-[#f2f4f8] text-[#8b97ab]">{icon}</span>
            <div className="min-w-0">
                <dt className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">{label}</dt>
                <dd className="m-0 text-[12.5px] leading-[1.5] text-[#3a4560]">{text}</dd>
            </div>
        </div>
    );
}
