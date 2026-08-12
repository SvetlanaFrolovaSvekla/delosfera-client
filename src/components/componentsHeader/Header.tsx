import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {LanguageSwitcher} from "@/components/componentsHeader/LanguageSwitcher.tsx";
import {NotificationsDropdown} from "@/components/componentsHeader/NotificationsDropdown.tsx";
import {ProfileMenu} from "@/components/componentsHeader/ProfileButton.tsx";
import {useTranslation} from "react-i18next";

export function Header() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    return (
        <header className="flex h-[60px] flex-none items-center gap-4 border-b border-[#e5e9f0] bg-white px-[22px]">
            <SearchBar
                placeholder={t("header.search")}
                value={search}
                onChange={setSearch}
                // Строка в шапке до сих пор никуда не вела: набранное оседало в состоянии
                // компонента. Enter отправляет запрос на страницу поиска.
                onSubmit={(value) => navigate(`/search?q=${encodeURIComponent(value)}`)}
            />
            <LanguageSwitcher/>
            <NotificationsDropdown/>
            <ProfileMenu/>
        </header>
    );
}