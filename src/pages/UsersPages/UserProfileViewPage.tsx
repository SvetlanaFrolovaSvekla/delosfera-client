/**
 * Просмотр профиля другого сотрудника — тот же вид, что и «Мой профиль» (ProfilePage),
 * но по id любого пользователя. В отличие от карточки в Управление → Пользователи
 * (UserCardPage, требует прав администратора и открыта на редактирование), эта
 * страница доступна любому авторизованному пользователю и только для чтения.
 *
 * Ведут сюда: клик по имени/аватару в реестре «Пользователи» и клик по ФИО
 * инициатора/куратора на вкладке «Реквизиты» карточки ВНД.
 */
import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {UserProfileView} from "@/components/componentsUsers/UserProfileView.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

import {ArrowLeft} from "lucide-react";

export function UserProfileViewPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {user: authUser} = useAuth();

    const [user, setUser] = useState<UserResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);
        userService
            .getById(Number(id))
            .then((data) => {
                if (!cancelled) setUser(data);
            })
            .catch(() => {
                if (!cancelled) setError(t("userProfileViewPage.loadError"));
            }) // Не удалось загрузить профиль пользователя
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id, t]);

    const backButton = (
        <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[12.5px] text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
        >
            <ArrowLeft size={14}/>
            {/* Назад */}
            {t("usersPage.back")}
        </button>
    );

    if (loading) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] py-[26px] pb-[60px]">
                {backButton}
                {/* Загрузка профиля… */}
                <Loader label={t("userProfileViewPage.loading")}/>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] py-[26px] pb-[60px]">
                {backButton}
                {/* Пользователь не найден */}
                <EmptyState
                    variant="error"
                    title={error ?? t("userProfileViewPage.notFound")}
                />
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto px-[30px] pt-[26px] pb-[60px]">
            {backButton}
            <UserProfileView user={user} isOwnProfile={authUser?.id === user.id}/>
        </div>
    );
}