import { useAuth } from "@/context/AuthContext";
import { UserProfileView } from "@/components/componentsUsers/UserProfileView.tsx";

export function ProfilePage() {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="max-w-[1200px] mx-auto px-[30px] py-[26px] pb-[60px]">
                <div className="text-sm text-[#8b97ab]">Загрузка профиля…</div>
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto px-[30px] pt-[26px] pb-[60px]">
            <UserProfileView user={user} isOwnProfile />
        </div>
    );
}
