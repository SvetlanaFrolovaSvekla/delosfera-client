import {useAuth} from "@/context/AuthContext.ts";
import {useOrganizationUnitTree} from "@/hooks/dictionariesHooks/useOrganizationUnitTree.ts";
import {DictionaryTreePage} from "@/components/componentsDictionaries/DictionaryTreePage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Building2} from "lucide-react";

export function OrganizationUnitPage() {
    const {hasPermission} = useAuth();
    const tree = useOrganizationUnitTree();

    return (
        <DictionaryTreePage
            tree={tree}
            canManage={hasPermission(PermissionCode.ManageGeneralDictionaries)}
            pageKey="organizationUnitPage"
            icon={Building2}
            backTo="/management/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}