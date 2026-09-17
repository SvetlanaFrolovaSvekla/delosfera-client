import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

// Текст тултипа на заблокированных из-за отсутствия прав кнопках создания ВНД
// ("Создать ВНД" в реестре, "Далее" в модалке выбора типа документа, "Создать
// черновик-карточку" на странице разработки ВНД). Без этой проверки клик доходит
// до бэкенда и там падает с сырой технической ошибкой авторизации вместо
// понятного сообщения - см. VndService/PermissionCode на бэке.
export function useCannotCreateVndMessage(): string {
    const {t} = useTranslation();
    // У Вас нет прав на создание нового ВНД!
    return t("createVnd.cannotCreateMessage");
}

// Право создавать новую ВНД - с последующим согласованием или без. Общая проверка
// для всех мест, откуда можно инициировать создание ВНД.
export function useCanCreateVnd(): boolean {
    const {hasPermission} = useAuth();
    return (
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval)
    );
}