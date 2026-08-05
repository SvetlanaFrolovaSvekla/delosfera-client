// Модалка «Начать актуализацию» — для пользователей с правом брать любую ВНД
// в актуализацию напрямую (ActualizeAnyVndWithApproval / ActualizeAnyVndWithoutApproval).
import {useState} from "react";
import {createPortal} from "react-dom";
import {Loader2, RefreshCw, X} from "lucide-react";
import {useInitiatorOptions} from "@/hooks/useInitiatorOptions.ts";

interface StartActualizationModalProps {
    canWithoutApproval: boolean;
    canWithApproval: boolean;
    submitting: boolean;
    error: string | null;
    currentUserId: number;
    onClose: () => void;
    onConfirm: (data: {
        requiresApproval: boolean;
        shiftNextPeriod: boolean;
        responsibleUserId: number;
    }) => void;
}

export function StartActualizationModal({
                                            canWithoutApproval, canWithApproval, submitting, error, currentUserId, onClose, onConfirm,
                                        }: StartActualizationModalProps) {
    const [requiresApproval, setRequiresApproval] = useState<boolean>(!canWithoutApproval);
    const [shiftNextPeriod, setShiftNextPeriod] = useState(true);
    const [responsibleUserId, setResponsibleUserId] = useState<number>(currentUserId);

    const {options: userOptions, loading: usersLoading} = useInitiatorOptions();
    const canChoose = canWithoutApproval && canWithApproval;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <RefreshCw size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">Начать актуализацию</h2>
                    </div>
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50">
                        <X size={20}/>
                    </button>
                </div>

                {/* --- Ответственный за актуализацию --- */}
                <div className="mb-4">
                    <div className="mb-2 text-[12.5px] font-semibold text-[#26324a]">
                        Ответственный за актуализацию
                    </div>
                    <select
                        value={responsibleUserId}
                        onChange={(e) => setResponsibleUserId(Number(e.target.value))}
                        disabled={usersLoading}
                        className="w-full h-9 rounded-[10px] border border-[#e5e9f0] px-3 text-[13px] text-[#3a4560] disabled:opacity-50"
                    >
                        {userOptions.map((u) => (
                            <option key={u.key} value={u.key}>
                                {Number(u.key) === currentUserId ? `${u.label} (я)` : u.label}
                            </option>
                        ))}
                    </select>
                </div>

                {canChoose && (
                    <div className="mb-4">
                        <div className="mb-2 text-[12.5px] font-semibold text-[#26324a]">Порядок актуализации</div>
                        <div className="flex flex-col gap-2">
                            <RadioRow label="С согласованием" checked={requiresApproval}
                                      onSelect={() => setRequiresApproval(true)}/>
                            <RadioRow label="Без согласования" checked={!requiresApproval}
                                      onSelect={() => setRequiresApproval(false)}/>
                        </div>
                    </div>
                )}

                <label className="flex cursor-pointer items-center gap-[10px] rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-[13px] text-[#3a4560] hover:bg-[#f6f8fb]">
                    <input type="checkbox" checked={shiftNextPeriod}
                           onChange={(e) => setShiftNextPeriod(e.target.checked)}
                           className="h-4 w-4 accent-[#4e57d6]"/>
                    Сдвинуть срок следующей актуализации после публикации
                </label>

                {error && (
                    <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50">
                        Отмена
                    </button>
                    <button
                        onClick={() => onConfirm({requiresApproval, shiftNextPeriod, responsibleUserId})}
                        disabled={submitting}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin"/>}
                        Начать актуализацию
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function RadioRow({label, checked, onSelect}: {label: string; checked: boolean; onSelect: () => void}) {
    return (
        <button type="button" onClick={onSelect}
                className={`flex cursor-pointer items-center gap-[10px] rounded-[10px] border px-3 py-[10px] text-left text-[13px] transition-colors ${
                    checked ? "border-[#4e57d6] bg-[#ececfc] text-[#1c2740]" : "border-[#e5e9f0] text-[#3a4560] hover:bg-[#f6f8fb]"
                }`}>
            <span className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                checked ? "border-[#4e57d6]" : "border-[#c7cedb]"
            }`}>
                {checked && <span className="h-[8px] w-[8px] rounded-full bg-[#4e57d6]"/>}
            </span>
            {label}
        </button>
    );
}