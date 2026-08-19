// Кнопка перехода к странице профиля с выпадающим меню
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {User, LogOut, ChevronRight} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {transliterate} from "@/utils/transliterate.ts";

function getInitials(fullName: string): string {
    return fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function ProfileMenu() {
    const {t, i18n} = useTranslation();
    const {user, logout} = useAuth();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    if (!user) return null;

    // ФИО, должность и роли — оргданные банка, не словарные термины,
    // поэтому на английской локали транслитерируем, а не переводим
    const isLatin = i18n.language === "en";
    const displayName = isLatin ? transliterate(user.fullName) : user.fullName;
    const roleLabelRaw = user.position?.name ?? user.roles[0]?.name ?? "";
    const roleLabel = isLatin ? transliterate(roleLabelRaw) : roleLabelRaw;
    const abbr = getInitials(displayName);

    const handleLogout = async () => {
        setOpen(false);
        await logout();
        navigate("/auth");
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-[42px] items-center gap-2.5 rounded-[11px] border border-[#e5e9f0] bg-white py-0 pl-1.5 pr-3 hover:bg-[#f6f8fb] cursor-pointer"
            >
                <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-[var(--app-soft,_#ececfc)] text-[12px] font-bold text-[var(--app-accent,_#4e57d6)]">
                    {abbr}
                </span>
                <span className="text-left leading-[1.25]">
                    <span className="block text-[14.5px] font-semibold text-[#0f1b2d]">{displayName}</span>
                    <span className="block text-[11.5px] text-[#8b97ab]">{roleLabel}</span>
                </span>
            </button>

            {open && (
                <div className="absolute top-[50px] right-0 w-[288px] bg-white border border-[#e5e9f0] rounded-[13px] shadow-[0_18px_46px_-14px_rgba(15,27,45,0.28)] z-40 overflow-hidden">
                    {/* Краткая информация о пользователе */}
                    <div className="flex items-center gap-2.5 px-[15px] py-3">
                        <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-lg bg-[var(--app-soft,_#ececfc)] text-[14px] font-bold text-[var(--app-accent,_#4e57d6)]">
                            {abbr}
                        </span>
                        <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-[#0f1b2d] truncate">
                                {displayName}
                            </div>
                            <div className="text-[11.5px] text-[#8b97ab] truncate">
                                {user.email}
                            </div>
                        </div>
                    </div>

                    {/* Роли пользователя */}
                    {user.roles.length > 0 && (
                        <div className="px-[15px] pb-3 flex flex-wrap gap-1.5">
                            <span
                                className="px-2 py-1 text-[11px] font-semibold"
                            >
                                    {t("header.myRoles")}
                                </span>
                            {user.roles.map((role) => (
                                <span
                                    key={role.id}
                                    className="px-2 py-1 rounded-[7px] bg-[#f2f5f9] text-[11px] font-semibold text-[#55617a]"
                                >
                                    {isLatin ? transliterate(role.name) : role.name}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-[#eef2f7] p-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                navigate("/profile");
                            }}
                            className="w-full flex items-center gap-[11px] px-[11px] py-[9px] rounded-[9px] bg-transparent hover:bg-[#f6f8fb] text-left cursor-pointer"
                        >
                            <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-[#eef1f5] text-[#55617a]">
                                <User className="w-4 h-4" strokeWidth={1.9} />
                            </span>
                            <span className="flex-1 font-semibold text-[13px] text-[#0f1b2d]">
                                {t("header.myProfile")}
                            </span>
                            <ChevronRight className="w-4 h-4 text-[#c3ccd8]" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            onClick={() => void handleLogout()}
                            className="w-full flex items-center gap-[11px] px-[11px] py-[9px] rounded-[9px] bg-transparent hover:bg-[#fdecec] text-left cursor-pointer group"
                        >
                            <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-[#fdecec] text-[#e5484d]">
                                <LogOut className="w-4 h-4" strokeWidth={1.9} />
                            </span>
                            <span className="flex-1 font-semibold text-[13px] text-[#e5484d]">
                                {t("header.logout")}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}