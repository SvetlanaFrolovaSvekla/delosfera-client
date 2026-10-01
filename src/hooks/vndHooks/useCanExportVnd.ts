import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/** Подсказка на заблокированной кнопке скачивания. */
export const NO_EXPORT_VND_HINT = "Нет права на скачивание документов ВНД (право «Экспорт ВНД»)";

/**
 * Право скачивать файлы ВНД: тексты редакций (RU/KG/EN), ТИД, листы согласования, матрицу
 * разногласий и приложения к редакциям. Без него документ можно только просматривать в
 * браузере, кнопки скачивания заблокированы. Сервер проверяет то же право
 * (GET /files/{id}?download=true — см. VndFileAccessAuthorizer.CanCurrentUserExportAsync).
 * У «Рядового пользователя» по умолчанию выключено.
 */
export function useCanExportVnd(): boolean {
    const {hasPermission} = useAuth();
    return hasPermission(PermissionCode.ExportVnd);
}
