// Нередактируемое поле «сотрудник»: аватар с инициалами + ФИО (+ должность второй строкой).
// Если известен userId — ФИО кликабельно и ведёт в профиль (/users/{id}), над ним тултип.
// Ссылка только на имени, а не на всём поле: так не уводит в профиль случайный клик,
// и тултип стоит над именем, а не посреди широкого поля.
// Выглядит как ReadOnlyField, чтобы стоять в одной сетке с остальными полями карточки.
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {PersonNameLink} from "@/components/componentsGeneral/PersonNameLink.tsx";

interface ReadOnlyPersonFieldProps {
    label: string;
    /** ФИО. Пусто — показываем прочерк без аватара. */
    name: string | null | undefined;
    /** id сотрудника — нужен для перехода в профиль. Без него ФИО не кликабельно. */
    userId?: number | null;
    /** Вторая строка под ФИО (должность, подразделение). */
    subtitle?: string | null;
}

export function ReadOnlyPersonField({label, name, userId, subtitle}: ReadOnlyPersonFieldProps) {
    const fullName = name?.trim();

    return (
        <div className="flex flex-col h-full">
            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">{label}</label>
            <div className="w-full min-h-10 px-3 py-1.5 rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] text-[13px] text-[#1c2740] flex items-center gap-2.5 box-border mt-auto">
                {fullName ? (
                    <>
                        <Avatar name={fullName} size={28}/>
                        <span className="min-w-0 flex flex-col">
                            <span className="flex min-w-0 text-[13px] font-medium text-[#1c2740]">
                                <PersonNameLink name={fullName} userId={userId}/>
                            </span>
                            {subtitle && <span className="truncate text-[11.5px] text-[#8b97ab]">{subtitle}</span>}
                        </span>
                    </>
                ) : "—"}
            </div>
        </div>
    );
}
