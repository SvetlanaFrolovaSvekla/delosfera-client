// ФИО сотрудника, ведущее в его профиль (/users/{id}), с тултипом «Открыть профиль» над именем.
// Без userId — обычный текст. Используется в карточках документов: адресат, автор,
// подписант, согласующие, исполнители.
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

interface PersonNameLinkProps {
    name: string;
    userId?: number | null;
    className?: string;
}

export function PersonNameLink({name, userId, className = ""}: PersonNameLinkProps) {
    const {t} = useTranslation();

    if (userId == null) return <span className={`truncate ${className}`}>{name}</span>;

    return (
        /* Открыть профиль */
        <Tooltip content={t("usersTable.openProfile")} side="top" className="min-w-0 max-w-full">
            <Link
                to={`/users/${userId}`}
                onClick={(e) => e.stopPropagation()}
                // «!» — перебить глобальное a { color } из index.css: имя тёмное, синее только при наведении
                className={`truncate !text-[#1c2740] no-underline underline-offset-2 transition-colors hover:!text-[#2f68f5] hover:underline ${className}`}
            >
                {name}
            </Link>
        </Tooltip>
    );
}
