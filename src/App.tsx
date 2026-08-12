import './App.css'
import {lazy, Suspense} from 'react';
import {BrowserRouter, Routes, Route, Outlet} from 'react-router-dom';
import {AuthProvider} from "@/context/AuthProvider.tsx";
import {ProtectedRoute} from "@/context/ProtectedRoute.tsx";
import {RequirePermission} from "@/context/RequirePermission.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {DictionariesProvider} from "@/context/DictionariesContext.tsx";
import {ToastContainer} from "@/components/componentsGeneral/knowledgeBaseComponents/ToastContainer.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

import {Sidebar} from "@/components/componentsSidebar/Sidebar.tsx";
import {Header} from "@/components/componentsHeader/Header.tsx";

// Страницы грузятся лениво — каждая попадает в отдельный чанк, а не в один общий бандл.
// Named-экспорты оборачиваем в { default } для React.lazy.
const AuthorizationPage = lazy(() => import("@/pages/AuthorizationPage.tsx").then(m => ({default: m.AuthorizationPage})));
const HomePage = lazy(() => import("@/pages/HomePage.tsx").then(m => ({default: m.HomePage})));
const DictionariesPages = lazy(() => import("@/pages/DictionariesPages/DictionariesPages.tsx").then(m => ({default: m.DictionariesPages})));
const ApprovalBodyPage = lazy(() => import("@/pages/DictionariesPages/ApprovalBodyPage.tsx").then(m => ({default: m.ApprovalBodyPage})));
const OrganizationUnitPage = lazy(() => import("@/pages/DictionariesPages/OrganizationUnitPage.tsx").then(m => ({default: m.OrganizationUnitPage})));
const PositionPage = lazy(() => import("@/pages/DictionariesPages/PositionPage.tsx").then(m => ({default: m.PositionPage})));
const TypeVndPage = lazy(() => import("@/pages/DictionariesPages/TypeVndPage.tsx").then(m => ({default: m.TypeVndPage})));
const SecurityLevelPage = lazy(() => import("@/pages/DictionariesPages/SecurityLevelPage.tsx").then(m => ({default: m.SecurityLevelPage})));
const UserGroupPage = lazy(() => import("@/pages/DictionariesPages/UserGroupPage.tsx").then(m => ({default: m.UserGroupPage})));
const RubricPage = lazy(() => import("@/pages/DictionariesPages/RubricPage.tsx").then(m => ({default: m.RubricPage})));
const KeywordPage = lazy(() => import("@/pages/DictionariesPages/KeywordPage.tsx").then(m => ({default: m.KeywordPage})));
const CoordinationApproversPage = lazy(() => import("@/pages/DictionariesPages/CoordinationApproversPage.tsx").then(m => ({default: m.CoordinationApproversPage})));
const RolesPermissionPage = lazy(() => import("@/pages/RolesPermissionPage.tsx").then(m => ({default: m.RolesPermissionPage})));
const BaseVndPage = lazy(() => import("@/pages/VndPages/BaseVndPage.tsx").then(m => ({default: m.BaseVndPage})));
const CreateVndPage = lazy(() => import("@/pages/VndPages/CreateVndPage.tsx").then(m => ({default: m.CreateVndPage})));
const OpenVndPage = lazy(() => import("@/pages/VndPages/OpenVndPage.tsx").then(m => ({default: m.OpenVndPage})));
const ProfilePage = lazy(() => import("@/pages/ProfilePage.tsx").then(m => ({default: m.ProfilePage})));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage/NotificationsPage.tsx").then(m => ({default: m.NotificationsPage})));
const OpenNotificationPage = lazy(() => import("@/pages/NotificationsPage/OpenNotificationPage.tsx").then(m => ({default: m.OpenNotificationPage})));
const ActualizationPage = lazy(() => import("@/pages/ActualizationPage/ActualizationPage.tsx").then(m => ({default: m.ActualizationPage})));
const ReportVndPage = lazy(() => import("@/pages/ReportPages/ReportVndPages/ReportVndPage.tsx").then(m => ({default: m.ReportVndPage})));
const TasksVndPage = lazy(() => import("@/pages/TasksPages/TasksVndPage.tsx").then(m => ({default: m.TasksVndPage})));
const UsersPage = lazy(() => import("@/pages/UsersPages/UsersPage.tsx").then(m => ({default: m.UsersPage})));

// Контур служебных записок (контур 4 ТЗ)
const SzRegistryPage = lazy(() => import("@/pages/SzRegistryPage.tsx").then(m => ({default: m.SzRegistryPage})));
const SzCardPage = lazy(() => import("@/pages/SzCardPage.tsx").then(m => ({default: m.SzCardPage})));
const SzPrintPage = lazy(() => import("@/pages/SzPrintPage.tsx").then(m => ({default: m.SzPrintPage})));

// Контур закупок (контур 6 ТЗ)
const AuthorityMatrixPage = lazy(() => import("@/pages/ProcurementPages/AuthorityMatrixPage.tsx").then(m => ({default: m.AuthorityMatrixPage})));
const ProcurementRegistryPage = lazy(() => import("@/pages/ProcurementPages/ProcurementRegistryPage.tsx").then(m => ({default: m.ProcurementRegistryPage})));
const ProcurementNewPage = lazy(() => import("@/pages/ProcurementPages/ProcurementNewPage.tsx").then(m => ({default: m.ProcurementNewPage})));
const ProcurementCardPage = lazy(() => import("@/pages/ProcurementPages/ProcurementCardPage.tsx").then(m => ({default: m.ProcurementCardPage})));
const ProcurementProtocolPage = lazy(() => import("@/pages/ProcurementPages/ProcurementProtocolPage.tsx").then(m => ({default: m.ProcurementProtocolPage})));

// Сводный реестр задач по всем контурам (GEN-11)
const TaskInboxPage = lazy(() => import("@/pages/TasksPages/TaskInboxPage.tsx").then(m => ({default: m.TaskInboxPage})));
const SupplierRegistryPage = lazy(() => import("@/pages/ProcurementPages/SupplierRegistryPage.tsx").then(m => ({default: m.SupplierRegistryPage})));

const MainLayout = () => (
    <DictionariesProvider>
        <div className="flex h-screen overflow-hidden">
            <Sidebar/>
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#edecf5]">
                <Header/>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Outlet/> {/* Место для вложенных маршрутов */}
                </div>
            </main>
        </div>
    </DictionariesProvider>
);

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

                            <Route element={<MainLayout/>}>
                                <Route path="/" element={<HomePage/>}/>

                                <Route path="/profile" element={<ProfilePage/>}/>

                                <Route path="/base-vnd" element={<BaseVndPage/>}/>
                                <Route path="/base-vnd/new" element={<CreateVndPage/>}/>
                                <Route path="/base-vnd/:id" element={<OpenVndPage/>}/>

                                <Route path="/tasks" element={<TasksVndPage/>}/>

                                <Route element={<RequirePermission code={PermissionCode.ViewVndActualizationPage}/>}>
                                    <Route path="/actualization" element={<ActualizationPage/>}/>
                                </Route>

                                <Route path="/reportvnd" element={<ReportVndPage/>}/>

                                <Route path="/notifications" element={<NotificationsPage/>}/>
                                <Route path="/notifications/:id" element={<OpenNotificationPage/>}/>

                                <Route path="/inbox" element={<TaskInboxPage/>}/>

                                <Route path="/prc" element={<ProcurementRegistryPage/>}/>
                                <Route path="/prc/new" element={<ProcurementNewPage/>}/>
                                <Route path="/prc/matrix" element={<AuthorityMatrixPage/>}/>
                                <Route path="/prc/suppliers" element={<SupplierRegistryPage/>}/>
                                <Route path="/prc/:id" element={<ProcurementCardPage/>}/>
                                <Route path="/prc/:id/protocol" element={<ProcurementProtocolPage/>}/>

                                <Route path="/sz" element={<SzRegistryPage/>}/>
                                <Route path="/sz/new" element={<SzCardPage/>}/>
                                <Route path="/sz/:id" element={<SzCardPage/>}/>

                                <Route path="/users" element={<UsersPage/>}/>

                                <Route element={<RequirePermission code={PermissionCode.ManageRoles}/>}>
                                    <Route path="/roles" element={<RolesPermissionPage/>}/>
                                </Route>

                                <Route path="/refs" element={<DictionariesPages/>}/>
                                <Route path="/refs/approval-body" element={<ApprovalBodyPage/>}/>
                                <Route path="/refs/organization-unit" element={<OrganizationUnitPage/>}/>
                                <Route path="/refs/position" element={<PositionPage/>}/>
                                <Route path="/refs/keyword" element={<KeywordPage/>}/>
                                <Route path="/refs/type-vnd" element={<TypeVndPage/>}/>
                                <Route path="/refs/security-level" element={<SecurityLevelPage/>}/>
                                <Route path="/refs/user-group" element={<UserGroupPage/>}/>
                                <Route path="/refs/rubric" element={<RubricPage/>}/>
                                <Route path="/refs/coordination-users" element={<CoordinationApproversPage/>}/>
                            </Route>
                        </Route>
                    </Routes>
                </Suspense>
                <ToastContainer/>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
