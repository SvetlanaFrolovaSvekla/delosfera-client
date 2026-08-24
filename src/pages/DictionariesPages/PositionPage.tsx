import {useAuth} from "@/context/AuthContext.ts";
import {usePositionList} from "@/hooks/dictionariesHooks/usePositionList.ts";
import {FlatDictListPage} from "@/components/componentsDictionaries/FlatDictListPage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Briefcase} from "lucide-react";

export function PositionPage() {
    const {hasPermission} = useAuth();
    const list = usePositionList();

    return (
        <FlatDictListPage
            list={list}
            canManage={hasPermission(PermissionCode.ManageGeneralDictionaries)}
            pageKey="positionPage"
            icon={Briefcase}
            backTo="/management/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}