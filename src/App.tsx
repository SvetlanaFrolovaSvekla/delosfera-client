import './App.css'
import {BrowserRouter, Routes, Route, Outlet} from 'react-router-dom';
import {Sidebar} from "@/components/componentsSidebar/Sidebar.tsx";
import {Header} from "@/components/componentsHeader/Header.tsx";

import {AuthProvider} from "@/context/AuthProvider.tsx";
import {ProtectedRoute} from "@/context/ProtectedRoute.tsx";

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
import {ToastContainer} from "@/components/componentsGeneral/knowledgeBaseComponents/ToastContainer.tsx";
import {NotificationsPage} from "@/pages/NotificationsPage.tsx";
import {CoordinationPage} from "@/pages/CoordinationPage/CoordinationPage.tsx";
import {ActualizationPage} from "@/pages/ActualizationPage/ActualizationPage.tsx";
import {ReportVndPage} from "@/pages/ReportPages/ReportVndPages/ReportVndPage.tsx";

const MainLayout = () => (
    <div className="flex h-screen overflow-hidden">
        <Sidebar/>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#edecf5]">
            <Header/>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <Outlet/>
            </div>
        </main>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Маршрут БЕЗ Sidebar и Header, доступен без авторизации */}
                    <Route path="/auth" element={<AuthorizationPage/>}/>

                    {/* Всё остальное — защищено, требует авторизации */}
                    <Route element={<ProtectedRoute/>}>
                        <Route element={<MainLayout/>}>
                            <Route path="/" element={<HomePage/>}/>

                            <Route path="/profile" element={<ProfilePage/>}/>

                            <Route path="/basevnd" element={<BaseVndPage/>}/>
                            <Route path="/basevnd/new" element={<CreateVndPage/>}/>
                            <Route path="/basevnd/:id" element={<OpenVndPage/>}/>

                            <Route path="/coordination" element={<CoordinationPage/>}/>
                            <Route path="/actualization" element={<ActualizationPage/>}/>
                            <Route path="/reportvnd" element={<ReportVndPage/>}/>

                            <Route path="/roles" element={<RolesPermissionPage/>}/>
                            <Route path="/notifications" element={<NotificationsPage/>}/>

                            <Route path="/roles" element={<RolesPermissionPage/>}/>
                            <Route path="/refs" element={<DictionariesPages/>}/>
                            <Route path="/refs/approval-body" element={<ApprovalBodyPage/>}/>
                            <Route path="/refs/organization-unit" element={<OrganizationUnitPage/>}/>
                            <Route path="/refs/position" element={<PositionPage/>}/>
                            <Route path="/refs/type-vnd" element={<TypeVndPage/>}/>
                            <Route path="/refs/security-level" element={<SecurityLevelPage/>}/>
                            <Route path="/refs/user-group" element={<UserGroupPage/>}/>
                            <Route path="/refs/rubric" element={<RubricPage/>}/>
                        </Route>
                    </Route>
                </Routes>
                <ToastContainer/>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App