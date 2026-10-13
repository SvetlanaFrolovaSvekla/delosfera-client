// Права текущего пользователя, от которых зависят кнопки вкладки "Редакции"
import {useMemo} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

// ВАЖНО: только права "...WithoutApproval" реально дают возможность обойти согласование.
// CreateVndWithApproval/ActualizeAnyVndWithApproval позволяют создавать/актуализировать ВНД,
// но по итогу всё равно требуют согласования - наличие только этих прав (например, у роли
// "Редактор ВНД") не должно давать кнопку "Сделать актуальной редакцией без согласования"
const PUBLISH_WITHOUT_APPROVAL_PERMISSIONS: number[] = [
    PermissionCode.CreateVndWithoutApproval,
    PermissionCode.ActualizeAnyVndWithoutApproval,
];

export function useEditionsPermissions() {
    const {hasPermission, user} = useAuth();

    // Зеркалит бэковый IsChiefEditor() (VndService/VndApprovalService) - см. те же права
    // в VndCoordinationTab.tsx/OpenVndPage.tsx.
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    // Системная роль "Администратор" - id === 1 (см. комментарий у RoleResponse в
    // userServiceType.ts: 1 - Администратор, 2 - Рядовой пользователь, 3 - Редактор ВНД,
    // 4 - Главный редактор ВНД).
    const isAdmin = user?.roles.some((role) => role.id === 1) ?? false;

    // Именно право обойти согласование (см. PUBLISH_WITHOUT_APPROVAL_PERMISSIONS) - уже, чем
    // isChiefEditor, чтобы его не получал тот, у кого есть только ...WithApproval.
    const canPublishWithoutApproval =
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    // Роли, давшие право публиковать без согласования - для подсказки в окне подтверждения
    const publishWithoutApprovalRoleNames = useMemo(() => {
        if (!canPublishWithoutApproval || !user) return [];
        return user.roles
            .filter((role) =>
                role.permissionCodes.some((code) => PUBLISH_WITHOUT_APPROVAL_PERMISSIONS.includes(code))
            )
            .map((role) => role.name);
    }, [canPublishWithoutApproval, user]);

    // Роли, дающие право "Редактировать последнюю редакцию напрямую" - для подсказки в
    // VndEditLastRevisionModal, тот же паттерн, что и выше.
    const editLastRevisionRoleNames = useMemo(() => {
        if (!user) return [];
        return user.roles
            .filter((role) => role.permissionCodes.includes(PermissionCode.EditLastRevisionDirectly))
            .map((role) => role.name);
    }, [user]);

    return {
        user,
        isChiefEditor,
        // Право менять поле "Разработчик" сформированного ТИД (VndUploadTidModal) - главному
        // редактору и администратору; остальные видят поле без выпадающего списка.
        canChangeTidDeveloper: isChiefEditor || isAdmin,
        canPublishWithoutApproval,
        publishWithoutApprovalRoleNames,
        canEditLastRevision: hasPermission(PermissionCode.EditLastRevisionDirectly),
        editLastRevisionRoleNames,
        // Выбор инициатора при запуске согласования - не isChiefEditor: тот широкий набор прав
        // есть практически у любого автора ВНД. Нужно узкое право EditAnyVndApprovalRoute
        // ("роль главного редактора"), см. VndApprovalService.StartAsync на бэке.
        canChooseInitiator: hasPermission(PermissionCode.EditAnyVndApprovalRoute),
    };
}
