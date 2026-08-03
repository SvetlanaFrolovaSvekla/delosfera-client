// src/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/VndApproverResolutionPanel.tsx

import {useState} from "react";
import {Check, AlertCircle} from "lucide-react";

export type ResolutionChoice = "approve" | "approveWithComment" | "reject";

interface VndApproverResolutionPanelProps {
    onSubmit: (choice: ResolutionChoice, comment: string) => Promise<void> | void;
    submitting?: boolean;
    error?: string | null;
}

const OPTIONS: Array<{
    id: ResolutionChoice;
    title: string;
    subtitle: string;
}> = [
    {
        id: "approve",
        title: "Согласовать",
        subtitle: "Выбирая данный вариант Вы подтверждаете согласование данной редакции.",
    },
    {
        id: "approveWithComment",
        title: "Согласовать с замечаниями",
        subtitle: "Текст замечания/комментариев является обязательным.",
    },
    {
        id: "reject",
        title: "Отклонить",
        subtitle: "Причина отклонения данной редакции ВНД является обязательной для указания. В случае выбора этого варианта - ВНД с данной редакцией вернется инициатору, он должен будет создать новую редакцию и заново её согласовывать. ",
    },
];

const SUBMIT_LABEL: Record<ResolutionChoice, string> = {
    approve: "Согласовать и подписать (ЭП)",
    approveWithComment: "Согласовать с замечаниями (ЭП)",
    reject: "Отклонить редакцию (ЭП)",
};

const COMMENT_PLACEHOLDER: Record<ResolutionChoice, string> = {
    approve: "Комментарий…",
    approveWithComment: "Комментарий / текст замечаний…",
    reject: "Причина отклонения…",
};

export function VndApproverResolutionPanel({onSubmit, submitting, error}: VndApproverResolutionPanelProps) {
    const [choice, setChoice] = useState<ResolutionChoice>("approve");
    const [comment, setComment] = useState("");

    const commentRequired = choice !== "approve";
    const commentMissing = commentRequired && comment.trim().length === 0;
    const canSubmit = !commentMissing;

    const handleSubmit = () => {
        if (!canSubmit || submitting) return;
        void onSubmit(choice, comment.trim());
    };

    return (
        <div className="rounded-[16px] border border-[#e9edf3] bg-white p-5">
            <div className="text-[15px] font-bold text-[#1c2740]">Ваша резолюция</div>
            {/*     <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                Резолюция фиксируется ЕСИА с отметкой времени и хешем версии.
            </div>*/}

            <div className="mt-4 flex flex-col gap-2.5">
                {OPTIONS.map((opt) => {
                    const selected = choice === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setChoice(opt.id)}
                            className={`cursor-pointer flex items-start gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors ${
                                selected
                                    ? "border-[#7fd4a3] bg-[#eef9f2]"
                                    : "border-[#e9edf3] bg-white hover:border-[#d7dee8]"
                            }`}
                        >
                            <span
                                className={`mt-[3px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-2 ${
                                    selected ? "border-[#2f9e5c]" : "border-[#c7cede]"
                                }`}
                            >
                                {selected && <span className="h-[8px] w-[8px] rounded-full bg-[#2f9e5c]"/>}
                            </span>
                            <span>
                                <div className="text-[13.5px] font-semibold text-[#1c2740]">{opt.title}</div>
                                <div className="text-[12px] text-[#8b97ab]">{opt.subtitle}</div>
                            </span>
                        </button>
                    );
                })}
            </div>

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={COMMENT_PLACEHOLDER[choice]}
                rows={3}
                className={`mt-3 w-full resize-none rounded-[10px] border bg-[#fbfcfe] px-3.5 py-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] ${
                    commentMissing ? "border-[#e8b4b4]" : "border-[#e9edf3]"
                }`}
            />

            {error && (
                <div className="mt-3 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3.5 py-2 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="cursor-pointer mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#1f7a4c] px-4 py-3 text-[13.5px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#1a6b42]"
            >
                <Check className="h-4 w-4" strokeWidth={2.5}/>
                {submitting ? "Отправка…" : SUBMIT_LABEL[choice]}
            </button>

            {commentMissing && (
                <div className="mt-3 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                    <span>
                        Поле "{choice === "reject" ? "Причина отклонения" : "Комментарий / текст замечаний"}" является обязательным при данном выборе
                    </span>
                </div>
            )}
        </div>
    );
}