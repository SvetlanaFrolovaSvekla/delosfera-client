import './App.css'
import {lazy, Suspense} from 'react';
import {BrowserRouter, Routes, Route, Outlet} from 'react-router-dom';
import {AuthProvider} from "@/context/AuthProvider.tsx";
import {ProtectedRoute} from "@/context/ProtectedRoute.tsx";
import {RequirePermission} from "@/context/RequirePermission.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {DictionariesProvider} from "@/context/DictionariesContext.tsx";
import {EcpSessionProvider} from "@/context/EcpSessionProvider.tsx";
import {ToastContainer} from "@/components/componentsGeneral/knowledgeBaseComponents/ToastContainer.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

import {Sidebar} from "@/components/componentsSidebar/Sidebar.tsx";
import {Header} from "@/components/componentsHeader/Header.tsx";
import {RegulationConsentGate} from "@/components/componentsSigning/RegulationConsentGate.tsx";
import {useUsageTracking} from "@/hooks/useUsageTracking.ts";
import {FeedbackButton} from "@/components/componentsGeneral/FeedbackButton.tsx";

// Страницы грузятся лениво — каждая попадает в отдельный чанк, а не в один общий бандл.
// Named-экспорты оборачиваем в { default } для React.lazy.
const AuthorizationPage = lazy(() => import("@/pages/CommonSection/AuthorizationPage.tsx").then(m => ({default: m.AuthorizationPage})));
const HomePage = lazy(() => import("@/pages/CommonSection/HomePage.tsx").then(m => ({default: m.HomePage})));
const DictionariesPages = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages.tsx").then(m => ({default: m.DictionariesPages})));
const ApprovalBodyPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/General/ApprovalBodyPage.tsx").then(m => ({default: m.ApprovalBodyPage})));
const OrganizationUnitPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/General/OrganizationUnitPage.tsx").then(m => ({default: m.OrganizationUnitPage})));
const UnitCuratorsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/UnitCuratorsPage.tsx").then(m => ({default: m.UnitCuratorsPage})));
const PositionPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/General/PositionPage.tsx").then(m => ({default: m.PositionPage})));
const BodyMembersPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/General/BodyMembersPage.tsx").then(m => ({default: m.BodyMembersPage})));
const RouteTemplatesPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/General/RouteTemplatesPage.tsx").then(m => ({default: m.RouteTemplatesPage})));
const AuthorityMatrixSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/Procurement/AuthorityMatrixSettingsPage.tsx").then(m => ({default: m.AuthorityMatrixSettingsPage})));
const TypeVndPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/TypeVndPage.tsx").then(m => ({default: m.TypeVndPage})));
const SecurityLevelPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/SecurityLevelPage.tsx").then(m => ({default: m.SecurityLevelPage})));
const UserGroupPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/UserGroupPage.tsx").then(m => ({default: m.UserGroupPage})));
const RubricPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/VndRubricPage.tsx").then(m => ({default: m.RubricPage})));
const SzRubricPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/SZ/SzRubricPage.tsx").then(m => ({default: m.SzRubricPage})));
const KeywordPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/General/KeywordPage.tsx").then(m => ({default: m.KeywordPage})));
const CoordinationApproversPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/CoordinationApproversPage.tsx").then(m => ({default: m.CoordinationApproversPage})));
const RolesPermissionPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/PeopleAndAccessSettings/RolesPermissionPage.tsx").then(m => ({default: m.RolesPermissionPage})));
const BaseVndPage = lazy(() => import("@/pages/VndPagesSection/BaseVndPage.tsx").then(m => ({default: m.BaseVndPage})));
const CreateVndPage = lazy(() => import("@/pages/VndPagesSection/CreateVndPage.tsx").then(m => ({default: m.CreateVndPage})));
const OpenVndPage = lazy(() => import("@/pages/VndPagesSection/OpenVndPage.tsx").then(m => ({default: m.OpenVndPage})));
const ProfilePage = lazy(() => import("@/pages/CommonSection/UsersPages/ProfilePage.tsx").then(m => ({default: m.ProfilePage})));
const UserProfileViewPage = lazy(() => import("@/pages/CommonSection/UsersPages/UserProfileViewPage.tsx").then(m => ({default: m.UserProfileViewPage})));
const NotificationsPage = lazy(() => import("@/pages/CommonSection/NotificationsPage/NotificationsPage.tsx").then(m => ({default: m.NotificationsPage})));
const OpenNotificationPage = lazy(() => import("@/pages/CommonSection/NotificationsPage/OpenNotificationPage.tsx").then(m => ({default: m.OpenNotificationPage})));
const ActualizationPage = lazy(() => import("@/pages/VndPagesSection/ActualizationPage.tsx").then(m => ({default: m.ActualizationPage})));
const ReportVndPage = lazy(() => import("@/pages/CommonSection/AnalyticsPages/ReportVndPages/ReportVndPage.tsx").then(m => ({default: m.ReportVndPage})));
const AnalyticsPage = lazy(() => import("@/pages/CommonSection/AnalyticsPages/AnalyticsPage.tsx").then(m => ({default: m.AnalyticsPage})));
const UsersPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/PeopleAndAccessSettings/UsersPage.tsx").then(m => ({default: m.UsersPage})));

// Контур служебных записок (контур 4 ТЗ)
const SzRegistryPage = lazy(() => import("@/pages/SzPagesSection/SzPages/SzRegistryPage.tsx").then(m => ({default: m.SzRegistryPage})));
const SzTrackerPage = lazy(() => import("@/pages/SzPagesSection/SzTrackerPage.tsx").then(m => ({default: m.SzTrackerPage})));
const SzCardPage = lazy(() => import("@/pages/SzPagesSection/SzPages/SzCardPage.tsx").then(m => ({default: m.SzCardPage})));
const SzPrintPage = lazy(() => import("@/pages/SzPagesSection/SzPages/SzPrintPage.tsx").then(m => ({default: m.SzPrintPage})));
const SubstitutionPrintPage = lazy(() => import("@/pages/SzPagesSection/SubstitutionsPages/SubstitutionPrintPage.tsx").then(m => ({default: m.SubstitutionPrintPage})));

// Контур закупок (контур 6 ТЗ)
const AuthorityMatrixPage = lazy(() => import("@/pages/ProcurementPagesSection/AuthorityMatrixPage.tsx").then(m => ({default: m.AuthorityMatrixPage})));
const ProcurementRegistryPage = lazy(() => import("@/pages/ProcurementPagesSection/ProcurementRegistryPage.tsx").then(m => ({default: m.ProcurementRegistryPage})));
const ProcurementTrackerPage = lazy(() => import("@/pages/ProcurementPagesSection/ProcurementTrackerPage.tsx").then(m => ({default: m.ProcurementTrackerPage})));
const ProcurementNewPage = lazy(() => import("@/pages/ProcurementPagesSection/ProcurementNewPage.tsx").then(m => ({default: m.ProcurementNewPage})));
const ProcurementCardPage = lazy(() => import("@/pages/ProcurementPagesSection/ProcurementCardPage.tsx").then(m => ({default: m.ProcurementCardPage})));
const ProcurementProtocolPage = lazy(() => import("@/pages/ProcurementPagesSection/ProcurementProtocolPage.tsx").then(m => ({default: m.ProcurementProtocolPage})));

// Сводный реестр задач по всем контурам (GEN-11)
const TaskInboxPage = lazy(() => import("@/pages/CommonSection/TasksPages/TaskInboxPage.tsx").then(m => ({default: m.TaskInboxPage})));
const DigestPage = lazy(() => import("@/pages/CommonSection/DigestPage.tsx").then(m => ({default: m.DigestPage})));
const CalendarPage = lazy(() => import("@/pages/CommonSection/CalendarPage/CalendarPage.tsx").then(m => ({default: m.CalendarPage})));
const NotificationSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/NotificationsSettings/NotificationSettingsPage.tsx").then(m => ({default: m.NotificationSettingsPage})));
const TaskStatsPage = lazy(() => import("@/pages/CommonSection/TasksPages/TaskStatsPage.tsx").then(m => ({default: m.TaskStatsPage})));
const ObligationsBoardPage = lazy(() => import("@/pages/MeetingsPagesSection/ObligationsPages/ObligationsBoardPage.tsx").then(m => ({default: m.ObligationsBoardPage})));
const HrRoutingSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/PeopleAndAccessSettings/HrRoutingSettingsPage.tsx").then(m => ({default: m.HrRoutingSettingsPage})));
const SubstitutionRequestsPage = lazy(() => import("@/pages/SzPagesSection/SubstitutionsPages/SubstitutionsPage.tsx").then(m => ({default: m.SubstitutionRequestsPage})));
const SubstitutionCardPage = lazy(() => import("@/pages/SzPagesSection/SubstitutionsPages/SubstitutionCardPage.tsx").then(m => ({default: m.SubstitutionCardPage})));
const RiskEventsPage = lazy(() => import("@/pages/MeetingsPagesSection/RiskEventsPages/RiskEventsPage.tsx").then(m => ({default: m.RiskEventsPage})));

// Полная лента событий по всем контурам — развёрнутая версия виджета
// "Последняя активность" с главной (кнопка "Смотреть всю активность").
const ActivityFeedPage = lazy(() => import("@/pages/CommonSection/ActivityFeedPage.tsx").then(m => ({default: m.ActivityFeedPage})));

// Поиск по документам: реквизиты и текстовые поля карточек (GEN-02/04)
const UserCardPage = lazy(() => import("@/pages/CommonSection/UsersPages/UserCardPage.tsx").then(m => ({default: m.UserCardPage})));
const SystemSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/SystemSettings/SystemSettingsPage.tsx").then(m => ({default: m.SystemSettingsPage})));
const SearchPage = lazy(() => import("@/pages/CommonSection/SearchPage/SearchPage.tsx").then(m => ({default: m.SearchPage})));

// Заседания Правления, КПА и комитетов: журнал и карточка с повесткой
const MeetingRegistryPage = lazy(() => import("@/pages/MeetingsPagesSection/MeetingRegistryPage.tsx").then(m => ({default: m.MeetingRegistryPage})));
const MeetingCardPage = lazy(() => import("@/pages/MeetingsPagesSection/MeetingCardPage.tsx").then(m => ({default: m.MeetingCardPage})));
const AuditLogPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Observation/AuditLogPage.tsx").then(m => ({default: m.AuditLogPage})));
const SigningWorkplacePage = lazy(() => import("@/pages/ManagementPagesSection/SigningWorkplacePage.tsx").then(m => ({default: m.SigningWorkplacePage})));
const AcknowledgementPage = lazy(() => import("@/pages/PersonDocManagementSection/AcknowledgementPage.tsx").then(m => ({default: m.AcknowledgementPage})));
const HelpPage = lazy(() => import("@/pages/ManagementPagesSection/HelpPage.tsx").then(m => ({default: m.HelpPage})));
const VndProposalsPage = lazy(() => import("@/pages/VndPagesSection/VndProposalsPage.tsx").then(m => ({default: m.VndProposalsPage})));
const VndBoardPage = lazy(() => import("@/pages/VndPagesSection/VndBoardPage.tsx").then(m => ({default: m.VndBoardPage})));
const VndAuthenticityPage = lazy(() => import("@/pages/VndPagesSection/VndAuthenticityPage.tsx").then(m => ({default: m.VndAuthenticityPage})));
const FeedbackInboxPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Observation/FeedbackInboxPage.tsx").then(m => ({default: m.FeedbackInboxPage})));
const UsageAnalyticsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Observation/UsageAnalyticsPage.tsx").then(m => ({default: m.UsageAnalyticsPage})));
const PoaRegistryPage = lazy(() => import("@/pages/ChancelleryPagesSection/PoaRegistryPage.tsx").then(m => ({default: m.PoaRegistryPage})));
const CorrespondencePage = lazy(() => import("@/pages/ChancelleryPagesSection/CorrespondencePage.tsx").then(m => ({default: m.CorrespondencePage})));
const ObligationsPage = lazy(() => import("@/pages/MeetingsPagesSection/ObligationsPages/ObligationsPage.tsx").then(m => ({default: m.ObligationsPage})));
const AgendaCandidatesPage = lazy(() => import("@/pages/MeetingsPagesSection/AgendaCandidatesPage.tsx").then(m => ({default: m.AgendaCandidatesPage})));
const ActualizationBucketSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/ActualizationBucketSettingsPage.tsx").then(m => ({default: m.ActualizationBucketSettingsPage})));
const VndApprovalNormSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/VndApprovalNormSettingsPage.tsx").then(m => ({default: m.VndApprovalNormSettingsPage})));
const VndWorkCalendarPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DictionariesPages/VND/VndWorkCalendarPage.tsx").then(m => ({default: m.VndWorkCalendarPage})));
const ManagementPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/SettingsPage.tsx").then(m => ({default: m.SettingsPage})));
const NotificationMailingSettingsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/NotificationsSettings/NotificationMailingSettingsPage.tsx").then(m => ({default: m.NotificationMailingSettingsPage})));
const DocumentTypesPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Dictionaries/DocumentTypesPage.tsx").then(m => ({default: m.DocumentTypesPage})));
const SettingsChangesPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/Observation/SettingsChangesPage.tsx").then(m => ({default: m.SettingsChangesPage})));
const HrOrdersPage = lazy(() => import("@/pages/PersonDocManagementSection/HrOrdersPage.tsx").then(m => ({default: m.HrOrdersPage})));
const SzStatisticsPage = lazy(() => import("@/pages/SzPagesSection/SzPages/SzStatisticsPage.tsx").then(m => ({default: m.SzStatisticsPage})));
const SubstitutionsPage = lazy(() => import("@/pages/ManagementPagesSection/SettingsPages/PeopleAndAccessSettings/SubstitutionsPage.tsx").then(m => ({default: m.SubstitutionsPage})));
const SupplierRegistryPage = lazy(() => import("@/pages/ProcurementPagesSection/SupplierRegistryPage.tsx").then(m => ({default: m.SupplierRegistryPage})));
const ProcurementPlanPage = lazy(() => import("@/pages/ProcurementPagesSection/ProcurementPlanPage.tsx").then(m => ({default: m.ProcurementPlanPage})));

const MainLayout = () => {
    // Учёт посещаемости включаем здесь, а не в App: сюда попадают только
    // авторизованные экраны, и страница входа в статистику не просачивается.
    useUsageTracking(true);

    return (
        <DictionariesProvider>
            {/* ЭЦП-сессия ГП «Инфоком» (SIG-ECP) — только в памяти, на время нахождения в
                авторизованной части приложения. Смена вкладки/перезагрузка сбрасывает её. */}
            <EcpSessionProvider>
            {/* Согласие с регламентом ПЭП спрашивается один раз, до первого подписания. */}
            <RegulationConsentGate/>
            <div className="flex h-screen overflow-hidden">
                <Sidebar/>
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#edecf5]">
                    <Header/>
                    <div id="main-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Outlet/> {/* Место для вложенных маршрутов */}
                    </div>
                </main>
            </div>
            {/* Кнопка «Сообщить» — на каждом экране, а не в отдельном разделе:
                замечание случается посреди работы, и искать его некуда некогда. */}
            <FeedbackButton/>
            </EcpSessionProvider>
        </DictionariesProvider>
    );
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Suspense fallback={<Loader label="Загрузка…" fullHeight={true}/>}>
                    <Routes>
                        {/* Маршрут БЕЗ Sidebar и Header, доступен без авторизации */}
                        <Route path="/auth" element={<AuthorizationPage/>}/>

                        {/* Всё остальное - защищено, требует авторизации */}
                        <Route element={<ProtectedRoute/>}>
                            {/* Печатная форма идёт без бокового меню и шапки — лист уходит на A4 как есть. */}
                            <Route path="/sz/:id/print" element={<SzPrintPage/>}/>
                            {/* «Скачать / печать» приказа и договора МО заявки на замещение — так же без меню. */}
                            <Route path="/substitutions/:id/print/:form" element={<SubstitutionPrintPage/>}/>

                            <Route element={<MainLayout/>}>
                                <Route path="/" element={<HomePage/>}/>

                                <Route path="/profile" element={<ProfilePage/>}/>
                                {/* Просмотр профиля любого сотрудника (только чтение) — доступен всем,
                                    в отличие от /management/users/:id (правка, только для админов). */}
                                <Route path="/users/:id" element={<UserProfileViewPage/>}/>

                                <Route path="/base-vnd" element={<BaseVndPage/>}/>
                                <Route path="/base-vnd/new" element={<CreateVndPage/>}/>
                                <Route path="/base-vnd/:id" element={<OpenVndPage/>}/>

                                {/* Доска ВНД: документы, связанные с СП пользователя, + добавленные вручную */}
                                <Route element={<RequirePermission code={PermissionCode.ViewVnd}/>}>
                                    <Route path="/vnd-board" element={<VndBoardPage/>}/>
                                </Route>

                                <Route path="/tasks" element={<TaskInboxPage/>}/>

                                {/* Предложения сотрудников по ВНД — для главного редактора ВНД */}
                                <Route element={<RequirePermission code={PermissionCode.ManageVndProposals}/>}>
                                    <Route path="/vnd-proposals" element={<VndProposalsPage/>}/>
                                </Route>

                                {/* Проверка подлинности согласования ВНД по файлу редакции — кто подписал ЭЦП этот текст */}
                                <Route element={<RequirePermission code={PermissionCode.ViewVnd}/>}>
                                    <Route path="/vnd-authenticity" element={<VndAuthenticityPage/>}/>
                                </Route>

                                <Route element={<RequirePermission code={PermissionCode.ViewVndActualizationPage}/>}>
                                    <Route path="/actualization" element={<ActualizationPage/>}/>
                                </Route>

                                <Route path="/reportvnd" element={<ReportVndPage/>}/>
                                <Route path="/analytics" element={<AnalyticsPage/>}/>

                                <Route path="/notifications" element={<NotificationsPage/>}/>
                                <Route path="/notifications/:id" element={<OpenNotificationPage/>}/>

                                <Route path="/tasks/stats" element={<TaskStatsPage/>}/>
                                <Route path="/activity" element={<ActivityFeedPage/>}/>
                                <Route path="/digest" element={<DigestPage/>}/>
                                <Route path="/calendar" element={<CalendarPage/>}/>

                                <Route path="/prc" element={<ProcurementRegistryPage/>}/>
                                <Route path="/prc/new" element={<ProcurementNewPage/>}/>
                                <Route path="/prc/:id/edit" element={<ProcurementNewPage/>}/>
                                <Route path="/prc/matrix" element={<AuthorityMatrixPage/>}/>
                                <Route path="/prc/suppliers" element={<SupplierRegistryPage/>}/>
                                <Route path="/prc/plan" element={<ProcurementPlanPage/>}/>
                                <Route path="/prc/tracker" element={<ProcurementTrackerPage/>}/>
                                <Route path="/prc/:id" element={<ProcurementCardPage/>}/>
                                <Route path="/prc/:id/protocol" element={<ProcurementProtocolPage/>}/>

                                <Route path="/search" element={<SearchPage/>}/>

                                <Route path="/meetings" element={<MeetingRegistryPage/>}/>
                                <Route path="/meetings/:id" element={<MeetingCardPage/>}/>

                                <Route path="/sz" element={<SzRegistryPage/>}/>
                                <Route path="/sz/new" element={<SzCardPage/>}/>
                                <Route path="/sz/tracker" element={<SzTrackerPage/>}/>
                                <Route path="/sz/:id" element={<SzCardPage/>}/>
                                <Route path="/sz-analytics" element={<SzStatisticsPage/>}/>

                                <Route path="/signing-workplace" element={<SigningWorkplacePage/>}/>
                                <Route path="/hr-ack" element={<AcknowledgementPage/>}/>
                                <Route path="/help" element={<HelpPage/>}/>

                                {/* Управление: настройки, справочники, доступы, наблюдение.
                                    Собрано в один раздел с подменю — пунктов настройки
                                    полтора десятка, и в общем меню они вытесняли бы работу. */}
                                <Route path="/management" element={<ManagementPage/>}>
                                    <Route path="users" element={<UsersPage/>}/>
                                    <Route path="users/new" element={<UserCardPage/>}/>
                                    <Route path="users/:id" element={<UserCardPage/>}/>

                                    <Route path="refs" element={<DictionariesPages/>}/>
                                    <Route path="document-types" element={<DocumentTypesPage/>}/>
                                    <Route path="refs/approval-body" element={<ApprovalBodyPage/>}/>
                                    <Route path="refs/organization-unit" element={<OrganizationUnitPage/>}/>
                                    <Route path="refs/unit-curators" element={<UnitCuratorsPage/>}/>
                                    <Route path="refs/position" element={<PositionPage/>}/>
                                    <Route path="refs/body-members" element={<BodyMembersPage/>}/>
                                    <Route path="refs/keyword" element={<KeywordPage/>}/>
                                    <Route path="refs/type-vnd" element={<TypeVndPage/>}/>
                                    <Route path="refs/security-level" element={<SecurityLevelPage/>}/>
                                    <Route path="refs/user-group" element={<UserGroupPage/>}/>
                                    <Route path="refs/rubric" element={<RubricPage/>}/>
                                    <Route path="refs/sz-rubric" element={<SzRubricPage/>}/>
                                    <Route path="refs/coordination-users" element={<CoordinationApproversPage/>}/>
                                    <Route path="refs/actualization-thresholds" element={<ActualizationBucketSettingsPage/>}/>
                                    <Route path="refs/approval-norms" element={<VndApprovalNormSettingsPage/>}/>
                                    <Route path="refs/work-calendar" element={<VndWorkCalendarPage/>}/>
                                    <Route path="mailing-settings" element={<NotificationMailingSettingsPage/>}/>
                                    <Route path="notification-settings" element={<NotificationSettingsPage/>}/>
                                    {/* Та же лента, что /activity, но внутри "Наблюдения" - компактная и с
                                        пояснением, чем отличается от "Журнала действий" */}
                                    <Route path="activity" element={<ActivityFeedPage embedded/>}/>


                                    <Route element={<RequirePermission code={PermissionCode.ManageRoles}/>}>
                                        <Route path="roles" element={<RolesPermissionPage/>}/>
                                    </Route>
                                    <Route element={<RequirePermission code={PermissionCode.ManageUsers}/>}>
                                        <Route path="substitutions" element={<SubstitutionsPage/>}/>
                                        <Route path="audit" element={<AuditLogPage/>}/>
                                    </Route>
                                    <Route element={<RequirePermission code={PermissionCode.ViewFullStatistics}/>}>
                                        <Route path="usage" element={<UsageAnalyticsPage/>}/>
                                    </Route>
                                    <Route element={<RequirePermission code={PermissionCode.ManageSystemSettings}/>}>
                                        <Route path="route-templates" element={<RouteTemplatesPage/>}/>
                                        <Route path="matrix-settings" element={<AuthorityMatrixSettingsPage/>}/>
                                        <Route path="feedback" element={<FeedbackInboxPage/>}/>
                                        <Route path="changes" element={<SettingsChangesPage/>}/>
                                        <Route path="integrations" element={<SystemSettingsPage/>}/>
                                        <Route path="signing" element={<SystemSettingsPage/>}/>
                                        <Route path="hr-routing" element={<HrRoutingSettingsPage/>}/>
                                        <Route path="help" element={<HelpPage/>}/>
                                    </Route>
                                </Route>

                                {/* Обкатка подразделениями: разбор пожеланий и учёт посещаемости */}
                                {/* Доверенности и книга регистрации корреспонденции */}
                                <Route element={<RequirePermission code={PermissionCode.ViewPowersOfAttorney}/>}>
                                    <Route path="/poa" element={<PoaRegistryPage/>}/>
                                </Route>
                                <Route element={<RequirePermission code={PermissionCode.ViewCorrespondence}/>}>
                                    <Route path="/correspondence" element={<CorrespondencePage/>}/>
                                </Route>

                                {/* Периодичность заседаний и отчётов; отбор вопросов секретарём */}
                                <Route path="/substitutions/new" element={<SubstitutionCardPage/>}/>
                                <Route path="/substitutions/:id" element={<SubstitutionCardPage/>}/>
                                <Route path="/substitutions" element={<SubstitutionRequestsPage/>}/>

                                <Route path="/obligations/board" element={<ObligationsBoardPage/>}/>
                                <Route path="/obligations" element={<ObligationsPage/>}/>

                                {/* События операционного риска из componentsWorkflow (RISK-1, 716-П / НБКР) */}
                                <Route element={<RequirePermission code={PermissionCode.ViewRiskEvents}/>}>
                                    <Route path="/risk-events" element={<RiskEventsPage/>}/>
                                </Route>
                                <Route element={<RequirePermission code={PermissionCode.ViewHrOrders}/>}>
                                    <Route path="/hr/orders" element={<HrOrdersPage/>}/>
                                </Route>
                                <Route element={<RequirePermission code={PermissionCode.ViewMeetings}/>}>
                                    <Route path="/meetings/candidates" element={<AgendaCandidatesPage/>}/>
                                </Route>

                            </Route>
                        </Route>

                        {/* Адрес, которого нет, раньше давал пустой экран — по нему было не
                            понять, сломалась система или раздел просто не открывается. */}
                        <Route
                            path="*"
                            element={
                                <div style={{padding: 24}}>
                                    <div style={{fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                                        Страница не найдена
                                    </div>
                                    <div style={{marginTop: 6, fontSize: 13, color: "#8b97ab"}}>
                                        Раздел не существует или ещё не открыт для вашей роли.
                                    </div>
                                    <a href="/" style={{
                                        display: "inline-block", marginTop: 14, fontSize: 12.5,
                                        fontWeight: 600, color: "#2f68f5",
                                    }}>
                                        На рабочий стол
                                    </a>
                                </div>
                            }
                        />
                    </Routes>
                </Suspense>
                <ToastContainer/>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
