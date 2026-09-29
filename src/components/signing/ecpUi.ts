/** Общие стили кнопок и подписи способов получения кода для ЭЦП-форм (в цветах системы). */
export const ECP_PRIMARY_BTN =
    "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white " +
    "font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] transition-[filter] " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

export const ECP_SECONDARY_BTN =
    "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white " +
    "text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] transition-colors " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

/** Ключ перевода подписи способа получения кода (sms/email); неизвестный способ показываем как есть. */
export const ecpMethodLabel = (t: (key: string) => string, method: string) => {
    const key = {sms: "ecp.identity.methodSms", email: "ecp.identity.methodEmail"}[method.toLowerCase()];
    return key ? t(key) : method;
};
