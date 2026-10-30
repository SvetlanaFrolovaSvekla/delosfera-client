/* Справочник "Рубрикатор заявлений" */
import {useAuth} from "@/context/AuthContext.ts";
import {useStatementRubricTree} from "@/hooks/dictionariesHooks/useStatementRubricTree.ts";
import {DictionaryTreePage} from "@/components/componentsDictionaries/DictionaryTreePage.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Folder} from "lucide-react";

export function StatementRubricPage() {
    const {hasPermission} = useAuth();
    const tree = useStatementRubricTree();

    return (
        <DictionaryTreePage
            tree={tree}
            canManage={hasPermission(PermissionCode.ManageStatementDictionaries)}
            pageKey="statementRubricPage"
            icon={Folder}
            backTo="/management/refs"
            backLabelKey="dictionaries.navigateGeneral"
        />
    );
}
