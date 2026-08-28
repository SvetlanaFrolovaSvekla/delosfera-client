import {useState} from "react";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {ReportVndPage} from "@/pages/ReportPages/ReportVndPages/ReportVndPage.tsx";
import {SzStatisticsPage} from "@/pages/SzStatisticsPage.tsx";

/**
 * Аналитика по всем контурам.
 *
 * Отчётность нормотворчества и аналитика записок лежали каждая в своём разделе
 * меню, и человек, которому нужны обе, ходил за ними в разные концы. Здесь они
 * рядом, вкладками — как их и смотрят: сначала одно, потом другое.
 *
 * Контуры без готовых отчётов вкладку всё равно получают: пустая вкладка с
 * честной надписью объясняет, что отчёта пока нет, а её отсутствие оставляет
 * человека гадать, туда ли он попал.
 */

const TABS = [
    {id: "vnd", label: "ВНД"},
    {id: "sz", label: "Служебные записки"},
    {id: "prc", label: "Заявки и закупки"},
    {id: "meetings", label: "Заседания"},
    {id: "hr", label: "Кадровый документооборот"},
    {id: "office", label: "Канцелярия"},
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Что показывать на вкладке, для которой отчёта ещё нет. */
const СКОРО: Partial<Record<TabId, string>> = {
    prc: "Отчёты по закупкам: исполнение Плана закупок, сроки процедур, доля конкурсных способов.",
    meetings: "Отчёты по заседаниям: исполнение решений, просроченные поручения, нагрузка на органы.",
    hr: "Отчёты по кадровому документообороту: приказы, ознакомление сотрудников.",
    office: "Отчёты канцелярии: корреспонденция, доверенности, сроки регистрации.",
};

export function AnalyticsPage() {
    const [tab, setTab] = useState<TabId>("vnd");

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title="Аналитика"
                description="Отчётность по всем контурам системы: нормотворчество, служебные записки, закупки, заседания, кадры и канцелярия."
            />

            <Tabs<TabId> tabs={[...TABS]} value={tab} onChange={setTab}/>

            {/* Готовые отчёты показываем как есть — со своими фильтрами и выгрузками. */}
            {tab === "vnd" && <ReportVndPage embedded/>}
            {tab === "sz" && <SzStatisticsPage embedded/>}

            {СКОРО[tab] && (
                <div className="mt-2 rounded-[13px] border border-[#e5e9f0] bg-white px-6 py-10 text-center">
                    <div className="text-[14px] font-semibold text-[#0f1b2d]">Отчёт готовится</div>
                    <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-[1.7] text-[#8b97ab]">
                        {СКОРО[tab]}
                    </p>
                </div>
            )}
        </div>
    );
}
