import {useAuth} from "@/context/AuthContext.ts";
import {useSzRubricTree} from "@/hooks/dictionariesHooks/useSzRubricTree.ts";
import {DictionaryTreePage} from "@/components/componentsDictionaries/DictionaryTreePage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Folder} from "lucide-react";

export function SzRubricPage() {
    const {hasPermission} = useAuth();
    const tree = useSzRubricTree();

    return (
        <DictionaryTreePage
            tree={tree}
            canManage={hasPermission(PermissionCode.ManageSzDictionaries)}
            pageKey="szRubricPage"
            icon={Folder}
            backTo="/management/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}
