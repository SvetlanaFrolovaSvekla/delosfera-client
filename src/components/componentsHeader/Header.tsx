import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useVndQuickSearch} from "@/hooks/vndHooks/useVndQuickSearch.ts";
import {useTranslation} from "react-i18next";

import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {LanguageSwitcher} from "@/components/componentsHeader/LanguageSwitcher.tsx";
import {NotificationsDropdown} from "@/components/componentsHeader/NotificationsDropdown.tsx";
import {ProfileMenu} from "@/components/componentsHeader/ProfileButton.tsx";
import {HeaderSearchResults} from "@/components/componentsHeader/HeaderSearchResults.tsx";

export function Header() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const {results, loading} = useVndQuickSearch(search);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <header className="flex h-[60px] flex-none items-center gap-4 border-b border-[#e5e9f0] bg-white px-[22px]">
            <div ref={containerRef} className="relative flex-1 min-w-[280px]">
                <SearchBar
                    placeholder={t("header.search")}
                    value={search}
                    onChange={(v) => {
                        setSearch(v);
                        setIsOpen(v.trim().length >= 2);
                    }}
                    // Подсказки показывают только ВНД; Enter уводит на страницу поиска,
                    // где ищется по всем контурам. Без него найти записку или закупку
                    // из шапки было бы нельзя.
                    onSubmit={(value) => {
                        const query = value.trim();
                        if (!query) return;

                        setIsOpen(false);
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                    }}
                />
                {isOpen && search.trim().length >= 2 && (
                    <HeaderSearchResults
                        results={results}
                        loading={loading}
                        query={search}
                        onSelect={() => {
                            setIsOpen(false);
                            setSearch("");
                        }}
                    />
                )}
            </div>
            <LanguageSwitcher/>
            <NotificationsDropdown/>
            <ProfileMenu/>
        </header>
    );
}