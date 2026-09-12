import {Link} from "react-router-dom";

// Нередактируемое поле с лейблом. linkTo — необязательный переход (например, на профиль
// сотрудника: /users/{id}), делает значение кликабельной ссылкой вместо обычного текста.
export function ReadOnlyField(
    {label, value, highlighted, linkTo}: { label: string; value: string; highlighted?: boolean; linkTo?: string }
) {
    return (
        <div className="flex flex-col h-full">
            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">{label}</label>
            <div
                className={`w-full min-h-10 px-3 py-2 rounded-[9px] border text-[13px] text-[#1c2740] flex items-center box-border mt-auto ${
                    highlighted ? "border-[#e0a13e] bg-[#fdf3e3]" : "border-[#e5e9f0] bg-[#fafbfd]"
                }`}
            >
                {linkTo ? (
                    <Link to={linkTo} className="text-[#2f68f5] hover:underline underline-offset-2">
                        {value}
                    </Link>
                ) : (
                    value
                )}
            </div>
        </div>
    );
}