/**
 * Рассмотрение документа на коллегиальном органе.
 */
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";

export interface BoardReview {
    meetingId: number;
    bodyTitle: string;
    meetingDate: string;
    agendaItemId: number;
    /** Номер вопроса в повестке - по нему человек ищет себя в заседании. */
    order: number;
    topic: string;
    draftResolution: string | null;
    decision: string | null;
    protocolNumber: string | null;
    protocolDate: string | null;
}

/** Локаль даты по языку интерфейса. */
const DATE_LOCALE: Record<string, string> = {ru: "ru-RU", en: "en-GB", kg: "ky-KG"};

const formatDate = (iso: string, lang: string) =>
    new Date(iso).toLocaleDateString(DATE_LOCALE[lang] ?? "ru-RU");

export function BoardReviewCard({review}: {review: BoardReview}) {
    const {t, i18n} = useTranslation();
    const fmt = (iso: string) => formatDate(iso, i18n.language);

    /** Решение появляется после заседания; до него виден только проект. */
    const isHeld = !!review.decision;

    return (
        <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="m-0 text-[15px] font-semibold text-[#0f1b2d]">
                    {/* "Рассмотрение на {{body}}"; для Правления - "Рассмотрение на Правлении" */}
                    {t("boardReview.title", {
                        body: review.bodyTitle === "Правление" ? t("boardReview.bodyBoard") : review.bodyTitle,
                    })}
                </h2>

                <span
                    className="rounded-[7px] px-2.5 py-1 text-[12px] font-semibold"
                    style={isHeld
                        ? {color: "#1c7a4d", background: "#eef8f2"}
                        : {color: "#8a6d1f", background: "#fdf6e6"}}
                >
                    {/* "Решение принято" / "Ожидает заседания" */}
                    {isHeld ? t("boardReview.decisionMade") : t("boardReview.awaitingMeeting")}
                </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-[#55617a]">
                <Link
                    to={`/meetings/${review.meetingId}`}
                    className="font-semibold text-[#2f68f5] no-underline hover:underline"
                >
                    {/* "Заседание {{date}}" */}
                    {t("boardReview.meeting", {date: fmt(review.meetingDate)})}
                </Link>
                <span>·</span>
                {/* "Вопрос № {{order}}" */}
                <span>{t("boardReview.question", {order: review.order})}</span>
                {review.protocolNumber && (
                    <>
                        <span>·</span>
                        <span>
                            {/* "Протокол {{number}}" + " от {{date}}" */}
                            {t("boardReview.protocol", {number: review.protocolNumber})}
                            {review.protocolDate && ` ${t("boardReview.protocolDate", {date: fmt(review.protocolDate)})}`}
                        </span>
                    </>
                )}
            </div>

            <div className="mt-2 text-[13.5px] text-[#0f1b2d]">{review.topic}</div>

            {review.draftResolution && (
                <div className="mt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        {/* "Проект постановления" */}
                        {t("boardReview.draftResolution")}
                    </div>
                    <div className="mt-1 text-[13.5px] text-[#55617a] whitespace-pre-wrap">
                        {review.draftResolution}
                    </div>
                </div>
            )}

            {review.decision && (
                <div className="mt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        {/* "Решение" */}
                        {t("boardReview.decision")}
                    </div>
                    <div className="mt-1 text-[13.5px] text-[#0f1b2d] whitespace-pre-wrap">
                        {review.decision}
                    </div>
                </div>
            )}
        </section>
    );
}