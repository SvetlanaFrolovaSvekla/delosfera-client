import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {UserProfileView} from "@/components/componentsUsers/UserProfileView.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

export function ProfilePage() {
    const {t} = useTranslation();
    const {user} = useAuth();

    if (!user) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] py-[26px] pb-[60px]">
                {/* Загрузка профиля… */}
                <Loader label={t("userProfileViewPage.loading")}/>
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto px-[30px] pt-[26px] pb-[60px]">
            <UserProfileView user={user} isOwnProfile/>
        </div>
    );
}
