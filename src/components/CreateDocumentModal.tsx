// Модалка «Создать документ» - выбор вида документа перед переходом к созданию
import {useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router-dom";
import {FilePlus2, X} from "lucide-react";

type DocumentType = "vnd" | "memo" | "procurement";

interface DocumentTypeOption {
    value: DocumentType;
    label: string;
    disabled?: boolean;
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
    {value: "vnd", label: "Внутренний нормативный документ (ВНД)"},
    {value: "memo", label: "Служебная записка (СЗ)", disabled: true},
    {value: "procurement", label: "Документ на закупку", disabled: true},
];

interface CreateDocumentModalProps {
    onClose: () => void;
}

export function CreateDocumentModal({onClose}: CreateDocumentModalProps) {
    const navigate = useNavigate();
    const [selected, setSelected] = useState<DocumentType | null>(null);

    const canConfirm = selected !== null;

    const handleConfirm = () => {
        if (selected === "vnd") {
            navigate("/base-vnd/new");
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[var(--app-soft,_#e9f0ff)] text-[var(--app-accent,_#2f68f5)]">
                            <FilePlus2 size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Создать документ
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                    Выберите вид документа, который необходимо создать.
                </p>

                <div className="flex flex-col gap-2">
                    {DOCUMENT_TYPES.map((opt) => (
                        <DocTypeRadioRow
                            key={opt.value}
                            label={opt.label}
                            checked={selected === opt.value}
                            disabled={opt.disabled}
                            onSelect={() => setSelected(opt.value)}
                        />
                    ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[var(--app-accent,_#2f68f5)] px-4 text-[13px] font-semibold text-white hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Далее
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function DocTypeRadioRow({
                             label,
                             checked,
                             disabled,
                             onSelect,
                         }: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onSelect}
            disabled={disabled}
            className={`flex items-center gap-[10px] rounded-[10px] border px-3 py-[10px] text-left text-[13px] transition-colors ${
                disabled
                    ? "cursor-not-allowed border-[#eef1f5] bg-[#fafbfc] text-[#c3ccd8]"
                    : checked
                        ? "cursor-pointer border-[var(--app-accent,_#2f68f5)] bg-[var(--app-soft,_#e9f0ff)] text-[#1c2740]"
                        : "cursor-pointer border-[#e5e9f0] text-[#3a4560] hover:bg-[#f6f8fb]"
            }`}
        >
            <span
                className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                    disabled
                        ? "border-[#dfe4ec]"
                        : checked
                            ? "border-[var(--app-accent,_#2f68f5)]"
                            : "border-[#c7cedb]"
                }`}
            >
                {checked && !disabled && (
                    <span className="h-[8px] w-[8px] rounded-full bg-[var(--app-accent,_#2f68f5)]"/>
                )}
            </span>
            <span className="flex-1">{label}</span>
            {disabled && (
                <span className="flex-none rounded-full bg-[#eef1f5] px-2 py-[2px] text-[10.5px] font-semibold text-[#a3adbd]">
                    Скоро
                </span>
            )}
        </button>
    );
}