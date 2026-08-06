import './App.css'
import {BrowserRouter, Routes, Route, Outlet} from 'react-router-dom';
import {AuthProvider} from "@/context/AuthProvider.tsx";
import {ProtectedRoute} from "@/context/ProtectedRoute.tsx";
import {RequirePermission} from "@/context/RequirePermission.tsx";
import {PermissionCode} from "@/constants/permissions.ts";
import {DictionariesProvider} from "@/context/DictionariesContext.tsx";
import {ToastContainer} from "@/components/componentsGeneral/knowledgeBaseComponents/ToastContainer.tsx";

import {Sidebar} from "@/components/componentsSidebar/Sidebar.tsx";
import {Header} from "@/components/componentsHeader/Header.tsx";

import {AuthorizationPage} from "@/pages/AuthorizationPage.tsx";
import {HomePage} from "@/pages/HomePage.tsx";
import {DictionariesPages} from "@/pages/DictionariesPages/DictionariesPages.tsx";
import {ApprovalBodyPage} from "@/pages/DictionariesPages/ApprovalBodyPage.tsx";
import {OrganizationUnitPage} from "@/pages/DictionariesPages/OrganizationUnitPage.tsx";
import {PositionPage} from "@/pages/DictionariesPages/PositionPage.tsx";
import {TypeVndPage} from "@/pages/DictionariesPages/TypeVndPage.tsx";
import {SecurityLevelPage} from "@/pages/DictionariesPages/SecurityLevelPage.tsx";
import {UserGroupPage} from "@/pages/DictionariesPages/UserGroupPage.tsx";
import {RubricPage} from "@/pages/DictionariesPages/RubricPage.tsx";
import {RolesPermissionPage} from "@/pages/RolesPermissionPage.tsx";
import {BaseVndPage} from "@/pages/VndPages/BaseVndPage.tsx";
import {CreateVndPage} from "@/pages/VndPages/CreateVndPage.tsx";
import {OpenVndPage} from "@/pages/VndPages/OpenVndPage.tsx";
import {ProfilePage} from "@/pages/ProfilePage.tsx";
import {NotificationsPage} from "@/pages/NotificationsPage/NotificationsPage.tsx";
import {ActualizationPage} from "@/pages/ActualizationPage/ActualizationPage.tsx";
import {ReportVndPage} from "@/pages/ReportPages/ReportVndPages/ReportVndPage.tsx";
import {TasksVndPage} from "@/pages/TasksPages/TasksVndPage.tsx";
import {OpenNotificationPage} from "@/pages/NotificationsPage/OpenNotificationPage.tsx";
import {KeywordPage} from "@/pages/DictionariesPages/KeywordPage.tsx";
import {CoordinationApproversPage} from "@/pages/DictionariesPages/CoordinationApproversPage.tsx";

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
                <Routes>
                    {/* Маршрут БЕЗ Sidebar и Header, доступен без авторизации */}
                    <Route path="/auth" element={<AuthorizationPage/>}/>

                    {/* Всё остальное - защищено, требует авторизации */}
                    <Route element={<ProtectedRoute/>}>
                        <Route element={<MainLayout/>}>
                            <Route path="/" element={<HomePage/>}/>

                            <Route path="/profile" element={<ProfilePage/>}/>

                            <Route path="/basevnd" element={<BaseVndPage/>}/>
                            <Route path="/basevnd/new" element={<CreateVndPage/>}/>
                            <Route path="/basevnd/:id" element={<OpenVndPage/>}/>

                            <Route path="/tasks" element={<TasksVndPage/>}/>
                            <Route path="/actualization" element={<ActualizationPage/>}/>
                            <Route path="/reportvnd" element={<ReportVndPage/>}/>

                            <Route path="/notifications" element={<NotificationsPage/>}/>
                            <Route path="/notifications/:id" element={<OpenNotificationPage />} />

                            <Route element={<RequirePermission code={PermissionCode.ManageRoles} />}>
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
                <ToastContainer/>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App