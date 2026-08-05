import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {X} from "lucide-react";

export interface CreateRoleData {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

interface CreateRoleModalProps {
    open: boolean;
    onClose: () => void;
    onCreate: (data: CreateRoleData) => Promise<void>;
}

export function CreateRoleModal({open, onClose, onCreate}: CreateRoleModalProps) {
    const {t} = useTranslation();
    const [titleRu, setTitleRu] = useState("");
    const [titleEn, setTitleEn] = useState("");
    const [titleKg, setTitleKg] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prevOpen, setPrevOpen] = useState(open);
    const panelRef = useRef<HTMLDivElement>(null);

    // Сброс формы при каждом открытии модалки — обновление state во время рендера
    // (тот же паттерн, что и в MultiSelectModal, вместо useEffect + setState)
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setTitleRu("");
            setTitleEn("");
            setTitleKg("");
            setError(null);
            setSaving(false);
        }
    }

    if (!open) return null;

    const canSubmit = titleRu.trim().length > 0 && !saving;

    const handleBackdropClick = () => {
        panelRef.current?.animate(
            [
                {transform: "translateX(0)"},
                {transform: "translateX(-3px)"},
                {transform: "translateX(3px)"},
                {transform: "translateX(-2px)"},
                {transform: "translateX(2px)"},
                {transform: "translateX(0)"},
            ],
            {duration: 220, easing: "ease-in-out"}
        );
    };

    async function handleSubmit() {
        if (!titleRu.trim() || saving) return;
        setSaving(true);
        setError(null);
        try {
            await onCreate({
                titleRu: titleRu.trim(),
                titleEn: titleEn.trim() || undefined,
                titleKg: titleKg.trim() || undefined,
            });
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось создать роль");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden flex flex-col"
            >
                {/* Заголовок */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7] flex-none">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">Новая роль</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                {/* Форма */}
                <div className="px-5 py-4 flex flex-col gap-[14px]">
                    <p className="m-0 text-[12.5px] text-[#8b97ab] leading-[1.5]">
                        Права можно будет включить сразу после создания — на странице роли справа.
                    </p>

                    <label className="flex flex-col gap-[6px]">
                        <span className="text-[12px] font-semibold text-[#55617a]">
                            Название (RU) <span className="text-[#e05252]">*</span>
                        </span>
                        <input
                            autoFocus
                            value={titleRu}
                            onChange={(e) => setTitleRu(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleSubmit();
                            }}
                            placeholder="Например: Согласующий"
                            className="h-10 px-[13px] rounded-[10px] border border-[#e5e9f0] text-[13.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] transition-colors"
                        />
                    </label>

                    <label className="flex flex-col gap-[6px]">
                        <span className="text-[12px] font-semibold text-[#55617a]">Название (EN)</span>
                        <input
                            value={titleEn}
                            onChange={(e) => setTitleEn(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleSubmit();
                            }}
                            placeholder="Например: Approver"
                            className="h-10 px-[13px] rounded-[10px] border border-[#e5e9f0] text-[13.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] transition-colors"
                        />
                    </label>

                    <label className="flex flex-col gap-[6px]">
                        <span className="text-[12px] font-semibold text-[#55617a]">Название (KG)</span>
                        <input
                            value={titleKg}
                            onChange={(e) => setTitleKg(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleSubmit();
                            }}
                            placeholder="Название на кыргызском"
                            className="h-10 px-[13px] rounded-[10px] border border-[#e5e9f0] text-[13.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] transition-colors"
                        />
                    </label>

                    {error && (
                        <p className="m-0 text-[12.5px] text-[#a12b2b] bg-[#fbe3e3] rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                {/* Кнопки */}
                <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#eef2f7] flex-none">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {t("general.cancel")}
                    </button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={!canSubmit}
                        className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Создание…" : "Создать роль"}
                    </button>
                </div>
            </div>
        </div>
    );
}