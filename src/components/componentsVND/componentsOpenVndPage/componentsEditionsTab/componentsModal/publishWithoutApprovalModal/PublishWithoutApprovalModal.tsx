// Подтверждение "Сделать редакцию действующей без согласования" + роли, которые дали это право
import {useTranslation} from "react-i18next";
import type {PublishWithoutApprovalFlow} from "@/hooks/vndHooks/usePublishWithoutApproval.ts";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

interface PublishWithoutApprovalModalProps {
    flow: PublishWithoutApprovalFlow;
    redactionId: number;
    roleNames: string[];
}

export function PublishWithoutApprovalModal({flow, redactionId, roleNames}: PublishWithoutApprovalModalProps) {
    const {t} = useTranslation();

    return (
        <ConfirmActionModal
            open={flow.open}
            onClose={flow.close}
            onConfirm={() => flow.run(redactionId)}
            title={t("openVndPage.editionsTab.publishWithoutApprovalConfirmTitle")}
            message={t("openVndPage.editionsTab.publishWithoutApprovalConfirmMessage")}
            confirmLabel={t("openVndPage.editionsTab.publishWithoutApprovalConfirmLabel")}
            loadingLabel={t("openVndPage.editionsTab.publishWithoutApprovalLoadingLabel")}
            loading={flow.busy}
            error={flow.error}
            variant="primary"
        >
            {roleNames.length > 0 && (
                <Clue>
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                        <span>
                            {roleNames.length === 1
                                ? t("openVndPage.editionsTab.roleGrantLabelSingular")
                                : t("openVndPage.editionsTab.roleGrantLabelPlural")}
                        </span>
                        {roleNames.map((name) => (
                            <span
                                key={name}
                                className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#ececfc] text-[11.5px] font-semibold text-[#4e57d6] whitespace-nowrap"
                            >
                                {name}
                            </span>
                        ))}
                    </span>
                </Clue>
            )}
        </ConfirmActionModal>
    );
}
