// Открытые замечания согласующих: их устраняет инициатор, после чего маршрут идёт с того же этапа.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

export interface SzOpenRemark {
    id: number;
    text: string;
    userId: number | null;
}

interface SzRemarksPanelProps {
    remarks: SzOpenRemark[];
    users: Record<number, string>;
    saving: boolean;
    onConfirm: (remarkId: number) => Promise<unknown> | void;
}

export function SzRemarksPanel({remarks, users, saving, onConfirm}: SzRemarksPanelProps) {
    const {t} = useTranslation();
    // Замечание, устранение которого ждёт подтверждения в модалке.
    const [pending, setPending] = useState<SzOpenRemark | null>(null);

    const confirm = async () => {
        if (!pending) return;
        const id = pending.id;
        await onConfirm(id);
        setPending(null);
    };

    return (
        <div className="mt-4 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] p-4">
            <div className="text-[13px] font-semibold text-[#b3730a]">{t("szCard.remarks.title")}</div>
            <div className="mt-2 flex flex-col gap-2">
                {remarks.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3">
                        <div className="text-[13px] text-[#55617a]">
                            {r.text}
                            <span className="ml-2 text-[12px] text-[#a3adbd]">
                                — {r.userId ? users[r.userId] ?? `#${r.userId}` : t("szCard.approval.approverFallback")}
                            </span>
                        </div>
                        <SzButton variant="successOutline" size="xs" onClick={() => setPending(r)} disabled={saving}>
                            {t("szCard.remarks.resolved")}
                        </SzButton>
                    </div>
                ))}
            </div>

            <ConfirmActionModal
                open={pending !== null}
                onClose={() => setPending(null)}
                onConfirm={() => void confirm()}
                title={t("szCard.remarks.confirmTitle")}
                message={t("szCard.remarks.confirmMessage")}
                confirmLabel={t("szCard.remarks.confirmButton")}
                loading={saving}
                variant="success"
            >
                {pending && (
                    <div className="mt-3 rounded-[9px] border border-[#f0dcae] bg-[#fdf3e0] px-3 py-2 text-left text-[13px] text-[#55617a]">
                        {pending.text}
                    </div>
                )}
            </ConfirmActionModal>
        </div>
    );
}
