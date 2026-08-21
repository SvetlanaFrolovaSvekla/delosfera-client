import {useEffect, useState} from "react";
import {UserCheck} from "lucide-react";
import {apiClient} from "@/service/apiClient.ts";

/**
 * Учётные записи для обкатки бизнес-подразделениями.
 *
 * Систему нельзя проверить из-под одной роли: записка, поданная инициатором,
 * встанет на регистрации, если некому регистрировать, а заседание не проведёт тот,
 * у кого нет прав секретаря. Тестировщик из подразделения не должен упираться в
 * «доступ запрещён» там, где на самом деле нужен просто другой человек.
 *
 * Список приходит с сервера и пуст, когда режим обкатки выключен. Учётные данные
 * намеренно не лежат в коде страницы: выключенная настройка должна означать, что
 * их нет нигде, включая файл, который браузер уже скачал.
 */

interface DemoAccount {
    email: string;
    password: string;
    fullName: string;
    role: string;
    purpose: string;
}

interface Props {
    /** Подставить учётные данные в форму входа. */
    onPick: (email: string, password: string) => void;
}

export function DemoAccountsPanel({onPick}: Props) {
    const [accounts, setAccounts] = useState<DemoAccount[]>([]);

    useEffect(() => {
        let cancelled = false;

        apiClient
            .get<DemoAccount[]>("/auth/demo-accounts")
            .then(({data}) => {
                if (!cancelled) setAccounts(data);
            })
            .catch(() => {
                // Нет ответа — значит режима обкатки нет. Молчим: на странице входа
                // сообщение об ошибке невидимой служебной ручки только пугает.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (accounts.length === 0) return null;

    return (
        <div className="mt-6 rounded-[12px] border border-dashed border-[#c9b48a] bg-[#fdf8ee] p-4">
            <div className="mb-3 flex items-start gap-2">
                <UserCheck size={17} className="mt-0.5 shrink-0 text-[#b3730a]"/>
                <div>
                    <p className="text-[13px] font-semibold text-[#7a5407]">
                        Обкатка: вход под разными ролями
                    </p>
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-[#8a7350]">
                        Нажмите на роль — логин и пароль подставятся в форму. Чтобы пройти
                        записку целиком, нужны разные роли: инициатор подаёт, делопроизводитель
                        регистрирует, руководитель согласовывает.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                {accounts.map((account) => (
                    <button
                        key={account.email}
                        type="button"
                        onClick={() => onPick(account.email, account.password)}
                        title={account.purpose}
                        className="group flex items-baseline justify-between gap-3 rounded-[9px]
                                   border border-[#e7dcc4] bg-white px-3 py-2 text-left
                                   transition hover:border-[#b3730a] focus:outline-none
                                   focus-visible:ring-2 focus-visible:ring-[#b3730a]"
                    >
                        <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-[#101a2c]">
                                {account.role}
                            </span>
                            <span className="block truncate text-[11.5px] leading-[1.45] text-[#8593a8]">
                                {account.purpose}
                            </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[#a8976f] group-hover:text-[#b3730a]">
                            {account.email.split("@")[0]}
                        </span>
                    </button>
                ))}
            </div>

            <p className="mt-3 text-[11.5px] leading-[1.5] text-[#a08a5e]">
                Этот блок виден только на стенде обкатки. На рабочем контуре настройка
                выключена, и учётных данных здесь нет.
            </p>
        </div>
    );
}
