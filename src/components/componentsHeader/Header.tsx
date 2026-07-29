import {useState} from "react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {LanguageSwitcher} from "@/components/componentsHeader/LanguageSwitcher.tsx";
import {NotificationsDropdown} from "@/components/componentsHeader/NotificationsDropdown.tsx";
import {ProfileMenu} from "@/components/componentsHeader/ProfileButton.tsx";
import {useTranslation} from "react-i18next";

export function Header() {
    const {t} = useTranslation();
    const [search, setSearch] = useState("");

    return (
        <header className="flex h-[60px] flex-none items-center gap-4 border-b border-[#e5e9f0] bg-white px-[22px]">
            <SearchBar
                placeholder={t("header.search")}
                value={search}
                onChange={setSearch}
            />
            <LanguageSwitcher/>
            <NotificationsDropdown/>
            <ProfileMenu/>
        </header>
    );
}