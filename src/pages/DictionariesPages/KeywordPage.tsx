import {useAuth} from "@/context/AuthContext.ts";
import {useKeywordTree} from "@/hooks/dictionariesHooks/useKeywordTree.ts";
import {DictionaryTreePage} from "@/components/componentsDictionaries/DictionaryTreePage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Tag} from "lucide-react";

export function KeywordPage() {
    const {hasPermission} = useAuth();
    const tree = useKeywordTree();

    return (
        <DictionaryTreePage
            tree={tree}
            canManage={hasPermission(PermissionCode.ManageVndDictionaries)}
            pageKey="keywordPage"
            icon={Tag}
            backTo="/management/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}