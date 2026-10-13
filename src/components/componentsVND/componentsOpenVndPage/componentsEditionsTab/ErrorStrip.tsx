/** Красная полоска ошибки над текстом редакции */
export function ErrorStrip({message}: { message: string | null }) {
    if (!message) return null;
    return (
        <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
            {message}
        </div>
    );
}