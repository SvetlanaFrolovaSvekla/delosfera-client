// Сообщения над формой: результат действия, ошибка, плашка статуса и пометка об отзыве.
import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import type {SzStatusCode} from "@/service/szService/szService.ts";
import {AlertCircle, FilePen, Info} from "lucide-react";

interface BannerTone {
    iconColor: string;
    iconBg: string;
    borderColor: string;
    gradientFrom: string;
    gradientTo: string;
    titleColor: string;
    textColor: string;
}

const BLUE: BannerTone = {
    iconColor: "#2f68f5",
    iconBg: "#e4ecff",
    borderColor: "#cfdcfb",
    gradientFrom: "#eef3ff",
    gradientTo: "#f8faff",
    titleColor: "#1a2d5c",
    textColor: "#55658c",
};

const RED: BannerTone = {
    iconColor: "#c0392b",
    iconBg: "#fbe1dc",
    borderColor: "#f1c9c2",
    gradientFrom: "#fdf0ed",
    gradientTo: "#fff8f6",
    titleColor: "#6b1d14",
    textColor: "#a2443a",
};

const AMBER: BannerTone = {
    iconColor: "#b3730a",
    iconBg: "#fbebc8",
    borderColor: "#f0dcae",
    gradientFrom: "#fdf6e6",
    gradientTo: "#fffbf2",
    titleColor: "#5c3b05",
    textColor: "#94650f",
};

export function SzBanner({tone, icon, title, text}: {
    tone: BannerTone; icon: ReactNode; title?: string; text: string;
}) {
    return (
        <div
            className="mt-4 flex items-center gap-[15px] rounded-[13px] px-[18px] py-[15px]"
            style={{
                border: `1px solid ${tone.borderColor}`,
                background: `linear-gradient(90deg, ${tone.gradientFrom}, ${tone.gradientTo})`,
            }}
        >
            <span
                className="grid h-10 w-10 flex-none place-items-center rounded-[11px]"
                style={{background: tone.iconBg, color: tone.iconColor}}
            >
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                {title && (
                    <div className="text-[14px] font-semibold" style={{color: tone.titleColor}}>{title}</div>
                )}
                <div className={`text-[12.5px] ${title ? "mt-0.5" : ""}`} style={{color: title ? tone.textColor : tone.titleColor}}>
                    {text}
                </div>
            </div>
        </div>
    );
}

const ICON = "w-[21px] h-[21px]";

export function SzCardNotices({notice, error}: { notice: string | null; error: string | null }) {
    return (
        <>
            {notice && (
                <SzBanner tone={BLUE} icon={<Info className={ICON} strokeWidth={1.8}/>} text={notice}/>
            )}
            {error && (
                <SzBanner tone={RED} icon={<AlertCircle className={ICON} strokeWidth={1.8}/>} text={error}/>
            )}
        </>
    );
}

/**
 * Плашка статуса: где записка сейчас и что автору делать дальше. Пока — для черновика:
 * после сохранения автор должен понимать, что записка ещё никуда не ушла.
 */
export function SzStatusBanner({statusCode, isAuthor}: { statusCode: SzStatusCode; isAuthor: boolean }) {
    const {t} = useTranslation();

    if (statusCode === "Draft" && isAuthor) {
        return (
            <SzBanner
                tone={BLUE}
                icon={<FilePen className={ICON} strokeWidth={1.8}/>}
                title={t("szCard.statusBanner.draftTitle")}
                text={t("szCard.statusBanner.draftText")}
            />
        );
    }

    return null;
}

export function SzWithdrawnBanner({text}: { text: string }) {
    return <SzBanner tone={AMBER} icon={<AlertCircle className={ICON} strokeWidth={1.8}/>} text={text}/>;
}
