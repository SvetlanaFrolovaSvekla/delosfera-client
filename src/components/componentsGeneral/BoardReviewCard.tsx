import {Link} from "react-router-dom";

/**
 * Рассмотрение документа на коллегиальном органе.
 *
 * Связь существовала в данных, но в карточке её не показывали: автор видел свою
 * записку и не знал, дошла ли она до Правления и чем там кончилось. Здесь видно
 * заседание, каким по счёту слушают вопрос, проект постановления и решение.
 */
export interface BoardReview {
    meetingId: number;
    bodyTitle: string;
    meetingDate: string;
    agendaItemId: number;
    /** Номер вопроса в повестке — по нему человек ищет себя в заседании. */
    order: number;
    topic: string;
    draftResolution: string | null;
    decision: string | null;
    protocolNumber: string | null;
    protocolDate: string | null;
}

const дата = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");

export function BoardReviewCard({review}: {review: BoardReview}) {
    /** Решение появляется после заседания; до него виден только проект. */
    const состоялось = !!review.decision;

    return (
        <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="m-0 text-[15px] font-semibold text-[#0f1b2d]">
                    Рассмотрение на {review.bodyTitle === "Правление" ? "Правлении" : review.bodyTitle}
                </h2>

                <span
                    className="rounded-[7px] px-2.5 py-1 text-[12px] font-semibold"
                    style={состоялось
                        ? {color: "#1c7a4d", background: "#eef8f2"}
                        : {color: "#8a6d1f", background: "#fdf6e6"}}
                >
                    {состоялось ? "Решение принято" : "Ожидает заседания"}
                </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-[#55617a]">
                <Link
                    to={`/meetings/${review.meetingId}`}
                    className="font-semibold text-[#2f68f5] no-underline hover:underline"
                >
                    Заседание {дата(review.meetingDate)}
                </Link>
                <span>·</span>
                <span>Вопрос № {review.order}</span>
                {review.protocolNumber && (
                    <>
                        <span>·</span>
                        <span>
                            Протокол {review.protocolNumber}
                            {review.protocolDate && ` от ${дата(review.protocolDate)}`}
                        </span>
                    </>
                )}
            </div>

            <div className="mt-2 text-[13.5px] text-[#0f1b2d]">{review.topic}</div>

            {review.draftResolution && (
                <div className="mt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        Проект постановления
                    </div>
                    <div className="mt-1 text-[13.5px] text-[#55617a] whitespace-pre-wrap">
                        {review.draftResolution}
                    </div>
                </div>
            )}

            {review.decision && (
                <div className="mt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        Решение
                    </div>
                    <div className="mt-1 text-[13.5px] text-[#0f1b2d] whitespace-pre-wrap">
                        {review.decision}
                    </div>
                </div>
            )}
        </section>
    );
}
