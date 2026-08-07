import {useAuth} from "@/context/AuthContext.ts";
import {useRubricTree} from "@/hooks/dictionariesHooks/useRubricTree.ts";
import {DictionaryTreePage} from "@/components/componentsDictionaries/DictionaryTreePage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Folder} from "lucide-react";

export function RubricPage() {
    const {hasPermission} = useAuth();
    const tree = useRubricTree();

    return (
        <DictionaryTreePage
            tree={tree}
            canManage={hasPermission(PermissionCode.ManageVndDictionaries)}
            pageKey="rubricPage"
            icon={Folder}
            backTo="/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}