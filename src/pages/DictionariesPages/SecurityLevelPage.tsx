import {useAuth} from "@/context/AuthContext.ts";
import {useSecurityLevelList} from "@/hooks/dictionariesHooks/useSecurityLevelList.ts";
import {FlatDictListPage} from "@/components/componentsDictionaries/FlatDictListPage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {ShieldCheck} from "lucide-react";

export function SecurityLevelPage() {
    const {hasPermission} = useAuth();
    const list = useSecurityLevelList();

    return (
        <FlatDictListPage
            list={list}
            canManage={hasPermission(PermissionCode.ManageVndDictionaries)}
            pageKey="securityLevelPage"
            icon={ShieldCheck}
            backTo="/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}