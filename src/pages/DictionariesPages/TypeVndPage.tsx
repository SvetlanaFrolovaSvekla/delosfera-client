import {useAuth} from "@/context/AuthContext.ts";
import {useTypeVndList} from "@/hooks/dictionariesHooks/useTypeVndList.ts";
import {FlatDictListPage} from "@/components/componentsDictionaries/FlatDictListPage.tsx";
import {PermissionCode} from "@/constants/permissions.ts";
import {FileText} from "lucide-react";

export function TypeVndPage() {
    const {hasPermission} = useAuth();
    const list = useTypeVndList();

    return (
        <FlatDictListPage
            list={list}
            canManage={hasPermission(PermissionCode.ManageVndDictionaries)}
            pageKey="typeVndPage"
            icon={FileText}
            backTo="/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}