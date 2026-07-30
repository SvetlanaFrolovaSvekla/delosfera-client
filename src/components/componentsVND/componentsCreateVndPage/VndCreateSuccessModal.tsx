import {useEffect, useState} from "react";
import {Check} from "lucide-react";

interface VndCreateSuccessModalProps {
    open: boolean;
    code: string;
    title: string;
    durationMs?: number;
    onDone: () => void;
}

export function VndCreateSuccessModal({
                                          open,
                                          code,
                                          title,
                                          durationMs = 2200,
                                          onDone,
                                      }: VndCreateSuccessModalProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!open) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgress(0);

        const start = Date.now();
        const frame = () => {
            const elapsed = Date.now() - start;
            const pct = Math.min(100, (elapsed / durationMs) * 100);
            setProgress(pct);
            if (pct < 100) requestAnimationFrame(frame);
        };
        const raf = requestAnimationFrame(frame);

        const timeout = setTimeout(onDone, durationMs);

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timeout);
        };
    }, [open, durationMs, onDone]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="relative w-[380px] max-w-[90vw] bg-white rounded-2xl px-7 pt-8 pb-6 shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#e3f6ec] grid place-items-center">
                    <div className="w-10 h-10 rounded-full bg-[#1c9c5c] grid place-items-center animate-in zoom-in duration-500 delay-100">
                        <Check className="w-5 h-5 text-white" strokeWidth={3}/>
                    </div>
                </div>

                <h3 className="text-center text-[16px] font-bold text-[#1c2740] mb-1">
                    Черновик-карточка была успешно создана!
                </h3>
                <p className="text-center text-[13px] text-[#8b97ab] mb-1">
                    <span className="font-semibold text-[#3a4560]">ВНД-{code}</span>
                </p>
                <p className="text-center text-[12.5px] text-[#a3adbd] mb-5 line-clamp-2">
                    {title}
                </p>

                <div className="h-[3px] w-full bg-[#eef1f6] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#1c9c5c] rounded-full transition-[width] duration-100 ease-linear"
                        style={{width: `${progress}%`}}
                    />
                </div>
                <p className="text-center text-[11px] text-[#a3adbd] mt-2">
                    Переход к карточке ВНД…
                </p>
            </div>
        </div>
    );
}