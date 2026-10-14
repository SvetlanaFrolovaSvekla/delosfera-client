/* Страница "Доступ запрещен" (если ВНД секретный) */
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Lock} from "lucide-react";

export function VndAccessDenied() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-10 pb-16">
            <div className="mx-auto max-w-[560px] rounded-2xl border border-[#e5e9f0] bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgba(28,39,64,0.06)]">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#fdf1f1] text-[#c0392b]">
                    <Lock size={30} strokeWidth={1.8}/>
                </div>
                <h1 className="m-0 mb-2 text-[20px] font-bold text-[#1c2740]">{t("openVndPage.accessDenied.title")}</h1>
                <p className="m-0 mb-1 text-[14px] leading-relaxed text-[#3a4560]">{t("openVndPage.accessDenied.description")}</p>
                <p className="m-0 mb-6 text-[12.5px] leading-relaxed text-[#8b97ab]">{t("openVndPage.accessDenied.hint")}</p>
                <button
                    type="button"
                    onClick={() => navigate("/base-vnd")}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] border-none bg-[#4e57d6] px-5 text-[13px] font-semibold text-white transition-[filter] hover:brightness-[1.06]"
                >
                    {t("openVndPage.accessDenied.back")}
                </button>
            </div>
        </div>
    );
}
