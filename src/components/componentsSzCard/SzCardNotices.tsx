// Сообщения над формой: результат действия, ошибка и пометка об отзыве записки.
export function SzCardNotices({notice, error}: { notice: string | null; error: string | null }) {
    return (
        <>
            {notice && (
                <div className="mt-4 rounded-[10px] border border-[#c3e6d1] bg-[#e9f6ee] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    {notice}
                </div>
            )}
            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}
        </>
    );
}

export function SzWithdrawnBanner({text}: { text: string }) {
    return (
        <div className="mt-4 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-2.5 text-[13px] text-[#b3730a]">
            {text}
        </div>
    );
}
