import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

// "Редактор ВНД" - тот, кто участвует в процессах ВНД: может согласовывать, создавать или
// актуализировать/консолидировать документы (роли "Редактор ВНД"/"Главный редактор ВНД" и
// выше - см. комментарий у RoleResponse в userServiceType.ts). Общий набор прав для мест, где
// рядовому пользователю не нужно/нельзя видеть служебные детали процесса:
//  - строка "Статус ВНД" (документ-уровня) в OpenVndPage.tsx;
//  - чекбокс "Только связанные со мной" (canFilterLinkedToMe) в BaseVndPage.tsx;
//  - редакции в статусах "черновик"/"на согласовании"/"отклонена"/"на консолидации" на
//    вкладке «Редакции» открытого ВНД (VndEditionsTab.tsx) - см. isRedactionVisibleToRegularUser
//    в utils/redactionStatus.ts.
// Раньше вычислялось по месту в каждом из этих файлов одним и тем же списком прав - вынесено
// сюда, чтобы список не разъезжался при правках.
export function useIsVndEditor(): boolean {
    const {hasPermission} = useAuth();
    return (
        hasPermission(PermissionCode.ActAsApprover) ||
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeVndWithApprovalByRequest) ||
        hasPermission(PermissionCode.ActualizeVndWithoutApprovalByRequest)
    );
}
