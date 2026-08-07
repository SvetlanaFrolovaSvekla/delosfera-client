import {useAuth} from "@/context/AuthContext.ts";
import {useApprovalBodyTree} from "@/hooks/dictionariesHooks/useApprovalBodyTree.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {DictionaryTreePage} from "@/components/componentsDictionaries/DictionaryTreePage.tsx";
import {Landmark} from "lucide-react";

export function ApprovalBodyPage() {
    const {hasPermission} = useAuth();
    const tree = useApprovalBodyTree();

    return (
        <DictionaryTreePage
            tree={tree}
            canManage={hasPermission(PermissionCode.ManageGeneralDictionaries)}
            pageKey="approvalBodyPage"
            icon={Landmark}
            backTo="/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}