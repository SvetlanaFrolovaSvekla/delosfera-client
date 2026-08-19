// Страница авторизации: логин/пароль + доменный (LDAP) вход.
import React, {useState} from "react";
import {Navigate, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {AuthHero} from "@/components/componentsAuth/AuthHero.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

const REMEMBER_KEY = "delosfera.rememberedLogin";

type Tab = "password" | "domain";

export function AuthorizationPage() {
    const {t} = useTranslation();
    const {login, loginDomain, user, loading} = useAuth();
    const navigate = useNavigate();

    // Доменная учётная запись — основной способ входа: пароль СЭД остаётся у
    // администраторов и у тех, кого нет в каталоге.
    const [tab, setTab] = useState<Tab>("domain");
    const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
    const [password, setPassword] = useState("");
    const [pwdVisible, setPwdVisible] = useState(false);
    const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [domainLoading, setDomainLoading] = useState(false);
    const [domainLogin, setDomainLogin] = useState("");
    const [domainPassword, setDomainPassword] = useState("");

    // Смена вкладки сбрасывает ошибку предыдущего способа входа
    const switchTab = (next: Tab) => {
        setTab(next);
        setError(null);
    };

    if (loading) return <Loader label={t("general.loading")}/>;
    if (user) return <Navigate to="/" replace/>;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
            await login(email.trim(), password);
            if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
            else localStorage.removeItem(REMEMBER_KEY);
            navigate("/", {replace: true});
        } catch {
            setError(t("auth.errorCredentials"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDomainLogin = async () => {
        if (domainLoading) return;
        setError(null);
        setDomainLoading(true);
        try {
            await loginDomain(domainLogin.trim(), domainPassword);
            navigate("/", {replace: true});
        } catch (e) {
            // Причину отказа знает только каталог: нет учётной записи, неверный пароль
            // или сотрудник ещё не заведён в системе. Показываем ответ сервера, иначе
            // «доменный вход не удался» не подсказывает, к кому идти.
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? t("auth.errorDomain"));
        } finally {
            setDomainLoading(false);
        }
    };

    const tabClass = (active: boolean) =>
        `h-[38px] flex-1 cursor-pointer rounded-[8px] text-[13.5px] font-semibold transition-[background,color] duration-150 ${
            active ? "bg-white text-[#0f1b2d] shadow-[0_1px_3px_rgba(15,27,45,.08)]" : "bg-transparent text-[#7b849a]"
        }`;

    const inputClass =
        "h-11 rounded-[10px] border border-[#dde2ec] px-[13px] text-[14px] text-[#0f1b2d] outline-none " +
        "focus:border-[var(--brand,#24a36b)] focus:shadow-[0_0_0_3px_var(--brand-soft,#e4f5ec)]";

    return (
        <div className="flex min-h-screen w-full bg-[#edecf5]">
            <AuthHero/>

            {/* Панель формы */}
            <div className="flex flex-1 items-center justify-center p-8 lg:min-w-[420px]">
                <div className="w-full max-w-[400px]">
                    <div className="mb-[22px]">
                        <div className="text-[20px] font-bold tracking-[-0.01em]">{t("auth.title")}</div>
                        <div className="mt-[5px] text-[13.5px] text-[#6b7690]">{t("auth.subtitle")}</div>
                    </div>

                    {/* Переключатель способа входа */}
                    <div className="mb-[22px] flex gap-1 rounded-[11px] bg-[#f2f3f9] p-1" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === "domain"}
                            onClick={() => switchTab("domain")}
                            className={tabClass(tab === "domain")}
                        >
                            {t("auth.tabDomain")}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === "password"}
                            onClick={() => switchTab("password")}
                            className={tabClass(tab === "password")}
                        >
                            {t("auth.tabPassword")}
                        </button>
                    </div>

                    {tab === "password" && (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-[12.5px] font-semibold text-[#3c4658]">{t("auth.loginLabel")}</span>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("auth.loginPlaceholder")}
                                    autoComplete="username"
                                    autoFocus
                                    className={inputClass}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[12.5px] font-semibold text-[#3c4658]">{t("auth.passwordLabel")}</span>
                                <div className="relative flex items-center">
                                    <input
                                        type={pwdVisible ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className={`${inputClass} w-full pr-[42px]`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPwdVisible((v) => !v)}
                                        aria-label={pwdVisible ? t("auth.hidePassword") : t("auth.showPassword")}
                                        className="absolute right-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-[8px] border-none bg-transparent text-[#8b97ab] hover:bg-[#f2f3f9] hover:text-[#55617a]"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                                             strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                            {pwdVisible ? (
                                                <>
                                                    <path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.1 1.4M22 12s-1 2-3 3.8M4.2 4.2 19.8 19.8"/>
                                                    <path d="M9.5 9.7a3 3 0 0 0 4.2 4.2"/>
                                                </>
                                            ) : (
                                                <>
                                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </label>

                            <div className="-mt-1 flex items-center justify-between">
                                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#3c4658]">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] border-[1.5px]"
                                        style={{
                                            borderColor: remember ? "var(--brand, #24a36b)" : "#c7cedb",
                                            background: remember ? "var(--brand, #24a36b)" : "#fff",
                                        }}
                                    >
                                        {remember && (
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff"
                                                 strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m5 12 5 5L20 6"/>
                                            </svg>
                                        )}
                                    </span>
                                    {t("auth.remember")}
                                </label>
                                <a href="#" className="text-[13px] font-medium no-underline">{t("auth.forgotPassword")}</a>
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-center gap-2 rounded-[9px] border border-[#f6cfcb] bg-[#fdeceb] px-3 py-2.5 text-[13px] text-[#b03a30]"
                                >
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-1 flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border-none bg-[var(--brand,#24a36b)] text-[14.5px] font-semibold text-white hover:bg-[#1e8e5c] disabled:cursor-default disabled:opacity-70"
                            >
                                {submitting ? (
                                    <>
                                        <span
                                            className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
                                            style={{animation: "dsSpin .7s linear infinite"}}
                                        />
                                        {t("auth.signingIn")}
                                    </>
                                ) : (
                                    <>
                                        {t("auth.signIn")}
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                                             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M13 6l6 6-6 6"/>
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {tab === "domain" && (
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-3 rounded-[12px] border border-[#edeff5] bg-[#f7f8fb] p-3.5">
                                <div
                                    className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] bg-[var(--brand-soft,#e4f5ec)]">
                                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="var(--brand, #24a36b)"
                                         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="13" rx="2"/>
                                        <path d="M8 20h8M12 17v3"/>
                                    </svg>
                                </div>
                                <div className="text-[13px] leading-[1.5] text-[#5b6478]">{t("auth.domainHint")}</div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="text-[13px] font-medium text-[#5b6478]">Доменный логин</div>
                                <input
                                    value={domainLogin}
                                    onChange={e => setDomainLogin(e.target.value)}
                                    placeholder="ivanov.ii"
                                    autoComplete="username"
                                    className={inputClass}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="text-[13px] font-medium text-[#5b6478]">Доменный пароль</div>
                                <input
                                    type="password"
                                    value={domainPassword}
                                    onChange={e => setDomainPassword(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleDomainLogin()}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className={inputClass}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleDomainLogin}
                                disabled={domainLoading || !domainLogin.trim() || !domainPassword}
                                className="flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border-none bg-[#0f1b2d] text-[14.5px] font-semibold text-white hover:bg-[#1a2a44] disabled:cursor-default disabled:opacity-70"
                            >
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                                     strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6z"/>
                                    <path d="m9 12 2 2 4-4"/>
                                </svg>
                                {t("auth.domainSignIn")}
                            </button>

                            {domainLoading && (
                                <div className="flex items-center gap-2 text-[13px] text-[#8b97ab]">
                                    <div
                                        className="h-3.5 w-3.5 rounded-full border-2 border-[#dde2ec] border-t-[var(--brand,#24a36b)]"
                                        style={{animation: "dsSpin .7s linear infinite"}}
                                    />
                                    {t("auth.domainChecking")}
                                </div>
                            )}

                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-center gap-2 rounded-[9px] border border-[#f6cfcb] bg-[#fdeceb] px-3 py-2.5 text-[13px] text-[#b03a30]"
                                >
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    <div
                        className="mt-[26px] flex items-center justify-between border-t border-[#eef0f5] pt-[18px] text-[12px] text-[#a3aec2]">
                        <span>{t("auth.footerVersion")}</span>
                        <a href="#" className="text-[12px] text-[#a3aec2]">{t("auth.support")}</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
