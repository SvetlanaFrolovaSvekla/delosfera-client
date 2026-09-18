/**
 * Аналитика по всем контурам.
 *
 * Отчётность нормотворчества и аналитика записок лежали каждая в своём разделе
 * меню, и человек, которому нужны обе, ходил за ними в разные концы. Здесь они
 * рядом, вкладками — как их и смотрят: сначала одно, потом другое.
 */

import {useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {contourReportsService} from "@/service/analyticsService/contourReportsService.ts";

import {ReportVndPage} from "@/pages/ReportPages/ReportVndPages/ReportVndPage.tsx";
import {ReportVndActualizationPage} from "@/pages/ReportPages/ReportVndPages/ReportVndActualizationPage.tsx";
import {ReportVndApprovalsPage} from "@/pages/ReportPages/ReportVndPages/ReportVndApprovalsPage.tsx";
import {SzStatisticsPage} from "@/pages/SZPages/SzStatisticsPage.tsx";
import {ProcurementStatisticsPage} from "@/pages/ProcurementPages/ProcurementStatisticsPage.tsx";
import {SlaDashboardPage} from "@/pages/SlaDashboardPage.tsx";

import {ContourReportView} from "@/components/componentsReport/ContourReportView.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";

const TAB_IDS = ["vnd", "sla", "sz", "prc", "meetings", "hr", "office"] as const;
type TabId = (typeof TAB_IDS)[number];

// Подвкладки внутри "ВНД" - сводный отчёт, статистика по актуализации и по согласованиям,
// но список специально сделан открытым: со временем сюда добавятся ещё отчёты (по этому же
// принципу, что и верхнеуровневые TAB_IDS выше).
const VND_SUB_TAB_IDS = ["all", "actualization", "approvals"] as const;
type VndSubTabId = (typeof VND_SUB_TAB_IDS)[number];

export function AnalyticsPage() {
    const {t} = useTranslation();

    const TABS = TAB_IDS.map((id) => ({id, label: t(`analyticsPage.tabs.${id}`)}));
    const VND_SUB_TABS = VND_SUB_TAB_IDS.map((id) => ({id, label: t(`analyticsPage.vndSubTabs.${id}`)}));

    // Страницу открывают и по прямой ссылке с заранее выбранной вкладкой/подвкладкой —
    // например, кнопка "Аналитика по актуализации" со страницы "Планирование актуализации"
    // ведёт сюда с ?tab=vnd&sub=actualization. Читаем один раз при монтировании: обратная
    // синхронизация в URL при переключении вкладок мышью не нужна — это не тот случай,
    // когда ссылку хочется скопировать или обновить страницу с сохранением состояния.
    const [searchParams] = useSearchParams();

    const [tab, setTab] = useState<TabId>(() => {
        const fromUrl = searchParams.get("tab");
        return TAB_IDS.includes(fromUrl as TabId) ? (fromUrl as TabId) : "vnd";
    });

    const [vndSubTab, setVndSubTab] = useState<VndSubTabId>(() => {
        const fromUrl = searchParams.get("sub");
        return VND_SUB_TAB_IDS.includes(fromUrl as VndSubTabId) ? (fromUrl as VndSubTabId) : "all";
    });

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("analyticsPage.title")}
                description={t("analyticsPage.description")}
            />

            <Tabs<TabId> tabs={TABS} value={tab} onChange={setTab}/>

            {tab === "sla" && <SlaDashboardPage/>}
            {tab === "vnd" && (
                <>
                    <Tabs<VndSubTabId>
                        tabs={VND_SUB_TABS}
                        value={vndSubTab}
                        onChange={setVndSubTab}
                        className="mb-4 -mt-1"
                    />
                    {vndSubTab === "all" && <ReportVndPage embedded/>}
                    {vndSubTab === "actualization" && <ReportVndActualizationPage/>}
                    {vndSubTab === "approvals" && <ReportVndApprovalsPage/>}
                </>
            )}
            {tab === "sz" && <SzStatisticsPage embedded/>}
            {tab === "prc" && <ProcurementStatisticsPage embedded/>}
            {tab === "meetings" && <ContourReportView load={contourReportsService.meetings}/>}
            {tab === "hr" && <ContourReportView load={contourReportsService.hr}/>}
            {tab === "office" && <ContourReportView load={contourReportsService.office}/>}
        </div>
    );
}