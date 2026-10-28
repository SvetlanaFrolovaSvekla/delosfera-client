// Подписание документов заявки на замещение: зафиксированные при отправке приказ и договор о
// матответственности, места подписей (директор, отсутствующий, замещающий) и подпись ЭЦП ГП «Инфоком» —
// тот же порядок, что у резолюций СЗ (useEcpHashSigning): сохранённая идентификация → ЭЦП-сессия → окно
// ПИН/кода. На согласовании подписывают участники маршрута на своём этапе (директор филиала сразу),
// остальные — на этапе «На подписании». Подпись под прежней версией (документ изменили после подписи)
// показывается неактуальной; пока новой нет — на листе ЭЦП автосогласование.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {
    substitutionService,
    type SubstitutionSigningDocument,
    type SubstitutionSigningState,
    type SubstitutionPrintForm,
} from "@/service/substitutionService/substitutionService.ts";
import {SzFormSection} from "@/components/componentsSz/componentsSzCard/form/SzFormSection.tsx";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {toast} from "@/service/toastService.ts";
import {AlertTriangle, CheckCircle2, Clock, Download, Eye, FileSignature, FlaskConical, Info, Route, ShieldCheck} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {SubstitutionDocumentsModal} from "./SubstitutionDocumentsModal.tsx";
import {signingErrorOf, signingKey, useSubstitutionSigning} from "./useSubstitutionSigning.tsx";

interface Props {
    requestId: number;
    /** null — документов ещё нет (черновик) или состояние не загрузилось. */
    state: SubstitutionSigningState | null;
    onChange: (state: SubstitutionSigningState) => void;
    /** Номер заявки — в заголовок модалки просмотра и имена файлов. */
    regNumber?: string | null;
}

export function SubstitutionSigningSection({requestId, state, onChange, regNumber}: Props) {
    const {t} = useTranslation();
    const {busyKey, quietSigning, sign, signTest, modal: ecpModal} = useSubstitutionSigning(requestId, onChange);
    const [showOld, setShowOld] = useState(false);

    // Просмотр документов (глазик) — модалка с табами документов и версий, как лист согласования у ВНД.
    const [preview, setPreview] = useState<SubstitutionPrintForm | null>(null);
    const current = (state?.documents ?? []).filter((d) => d.isCurrent);
    const old = (state?.documents ?? []).filter((d) => !d.isCurrent);
    const formOf = (doc: SubstitutionSigningDocument): SubstitutionPrintForm => doc.kind === "Order" ? "order" : "liability";

    const errorOf = signingErrorOf;

    async function download(doc: SubstitutionSigningDocument, signed: boolean) {
        const name = signed ? doc.fileName.replace(/\.docx$/i, " (с подписями ЭЦП).docx") : doc.fileName;
        const pending = toast.loading(t("substitutionCard.printPage.toast.preparing"), name);
        try {
            await substitutionService.downloadSigningDocument(requestId, doc.id, signed, name);
            toast.update(pending, {
                variant: "success", title: t("substitutionCard.printPage.toast.docxDownloaded"), description: name, duration: 4500,
            });
        } catch (e) {
            toast.update(pending, {
                variant: "error", title: t("substitutionSigning.downloadFailed"), description: errorOf(e).message, duration: 4500,
            });
        }
    }

    const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    return (
        <SzFormSection title={t("substitutionSigning.title")} hint={t("substitutionSigning.hint")}>
           {/* Сообщение "Идёт согласование — участники маршрута уже могут
           подписать на своём этапе" + Просмотр документов */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                {!state || current.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f3f7] px-2.5 py-1 font-semibold text-[#55617a]">
                        <Clock size={14}/> {t("substitutionSigning.notFrozen")}
                    </span>
                ) : state.isApprovalStage ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f0ff] px-2.5 py-1 font-semibold text-[#2f68f5]">
                        <Route size={14}/> {t("substitutionSigning.approvalStage")}
                    </span>
                ) : state.allSigned ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f6ee] px-2.5 py-1 font-semibold text-[#1c7a4d]">
                        <CheckCircle2 size={14}/> {t("substitutionSigning.allSigned")}
                    </span>
                ) : state.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e0] px-2.5 py-1 font-semibold text-[#b3730a]">
                        <Clock size={14}/> {t("substitutionSigning.waiting")}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f3f7] px-2.5 py-1 font-semibold text-[#55617a]">
                        {t("substitutionSigning.closed")}
                    </span>
                )}
                <SzButton size="xs" variant="brandSoft" icon={<Eye size={14}/>} onClick={() => setPreview("order")}>
                    {t("substitutionSigning.viewDocuments")}
                </SzButton>
            </div>

            {/* Подписание ЭЦП — не обязательный шаг: документы можно подписать от руки, а УЧР может
                отметить заявку «Исполнено» и без подписей ЭЦП. */}
            <div className="mb-3 flex items-start gap-2 rounded-[10px] border border-[#dbe5f7] bg-[#f5f8ff] px-3 py-2 text-[12px] leading-[1.5] text-[#55617a]">
                <Info size={15} className="mt-[1px] flex-none text-[#2f68f5]"/>
                <span>{t("substitutionSigning.optionalHint")}</span>
            </div>

            {/* Панель с двумя карточками документов */}
            <div className="flex flex-col gap-3">
                {current.map((doc) => (
                    <div key={doc.id} className="rounded-[12px] border border-[#e5e9f0] bg-[#f8f9fd] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            {/* Заголовок и версия документа */}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1c2740]">
                                    <FileSignature size={16} className="text-[#2f68f5]"/> {doc.title}
                                </div>
                                <div className="mt-0.5 text-[11.5px] text-[#8b97ab]">
                                    {t("substitutionSigning.version", {n: doc.version, date: fmt(doc.createdAt)})}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Tooltip content={t("substitutionSigning.view")} side="top">
                                    <button type="button" onClick={() => setPreview(formOf(doc))}
                                            aria-label={t("substitutionSigning.view")}
                                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-[8px] border border-[#cbddff] bg-[#f5f8ff] text-[#2f68f5] hover:bg-[#eaf1ff]">
                                        <Eye size={15}/>
                                    </button>
                                </Tooltip>

                            </div>
                        </div>

                        <div className="mt-3 flex flex-col divide-y divide-[#eef1f5]">
                            {doc.slots.map((slot) => {
                                const key = signingKey(doc.id, slot.role, slot.userId);
                                const s = slot.signature;
                                const stale = !s ? slot.staleSignature : null;
                                return (
                                    <div key={`${slot.role}-${slot.userId ?? ""}`} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                                        <span className="min-w-[230px] font-semibold text-[#3a4560]">{slot.roleTitle}</span>
                                        <span className="flex-1 min-w-[160px] text-[#55617a]">
                                            {slot.userName ?? <span className="text-[#c27c0e]">{t("substitutionSigning.noSigner")}</span>}
                                            {/* Подпись под прежней версией — неактуальная, как у СЗ/ВНД */}
                                            {stale && (
                                                <span className="mt-1 flex flex-col gap-0.5 text-[12px]">
                                                    <span className="inline-flex flex-wrap items-center gap-1 text-[#b3730a]">
                                                        <AlertTriangle size={13}/>
                                                        <span className="line-through decoration-[#d9a54a]">
                                                            {t("substitutionSigning.staleSignature", {v: stale.documentVersion, date: fmt(stale.signedAt)})}
                                                        </span>
                                                        <span className="rounded-full bg-[#fdf3e0] px-1.5 py-[1px] text-[10.5px] font-semibold">
                                                            {t("substitutionSigning.outdated")}
                                                        </span>
                                                    </span>
                                                    {slot.autoApproved && (
                                                        <span className="text-[#8b97ab]">{t("substitutionSigning.autoApproved")}</span>
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        {s ? (
                                            <span className={`flex flex-col text-right text-[12px] ${s.isTest ? "text-[#b3730a]" : "text-[#1c7a4d]"}`}>
                                                <span className="inline-flex items-center justify-end gap-1 font-semibold">
                                                    {s.isTest ? <FlaskConical size={13}/> : <CheckCircle2 size={13}/>}
                                                    {s.isTest ? t("substitutionSigning.slotSignedTest") : t("substitutionSigning.slotSigned")}
                                                    {" "}{fmt(s.signedAt)}
                                                </span>
                                                {(s.onBehalfOfName || (s.userName && s.userName !== slot.userName)) && (
                                                    <span className="text-[#8b97ab]">
                                                        {t("substitutionSigning.signedBy", {name: s.userName ?? s.personFio ?? "—"})}
                                                    </span>
                                                )}
                                                {s.certIssuerCommonName && (
                                                    <span className="text-[#8b97ab]">{s.certIssuerCommonName}</span>
                                                )}
                                            </span>
                                        ) : slot.canSign ? (
                                            <span className="flex gap-2">
                                                <SzButton size="xs" variant="primary" icon={<FileSignature size={14}/>}
                                                          disabled={busyKey !== null || quietSigning}
                                                          onClick={() => void sign(doc, slot.role, slot.userId)}>
                                                    {busyKey === key ? t("substitutionSigning.signing")
                                                        : stale ? t("substitutionSigning.signAgain") : t("substitutionSigning.sign")}
                                                </SzButton>
                                                {state?.allowTestEcp && (
                                                    <SzButton size="xs" variant="warning" icon={<FlaskConical size={14}/>}
                                                              disabled={busyKey !== null}
                                                              onClick={() => void signTest(doc, slot.role, slot.userId)}>
                                                        {t("substitutionSigning.signTest")}
                                                    </SzButton>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-[12px] text-[#8b97ab]">
                                                {state?.isApprovalStage && slot.userId != null
                                                    ? t("substitutionSigning.afterApproval")
                                                    : t("substitutionSigning.notSigned")}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {old.length > 0 && (
                <div className="mt-3">
                    <button type="button" onClick={() => setShowOld((v) => !v)}
                            className="cursor-pointer border-none bg-transparent p-0 text-[12.5px] font-semibold text-[#2f68f5] hover:underline">
                        {showOld ? t("substitutionSigning.hideOld") : t("substitutionSigning.showOld", {n: old.length})}
                    </button>
                    {showOld && (
                        <div className="mt-2 flex flex-col gap-1.5">
                            {old.map((doc) => (
                                <div key={doc.id} className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#55617a]">
                                    <span className="flex-1">
                                        <span className="mr-1.5 rounded-full bg-[#f1f3f7] px-1.5 py-[1px] text-[10.5px] font-semibold text-[#8b97ab]">
                                            {t("substitutionSigning.outdatedVersion")}
                                        </span>
                                        <span className="line-through decoration-[#c3cbdb]">{doc.title}</span> · {t("substitutionSigning.version", {n: doc.version, date: fmt(doc.createdAt)})}
                                        {" · "}{t("substitutionSigning.signaturesCount", {n: doc.slots.filter((x) => x.signature).length, total: doc.slots.length})}
                                    </span>
                                    <SzButton size="xs" icon={<Download size={13}/>} onClick={() => void download(doc, false)}>
                                        {t("substitutionSigning.downloadPlain")}
                                    </SzButton>
                                    <SzButton size="xs" icon={<ShieldCheck size={13}/>} onClick={() => void download(doc, true)}>
                                        {t("substitutionSigning.downloadSigned")}
                                    </SzButton>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {preview && (
                <SubstitutionDocumentsModal requestId={requestId} regNumber={regNumber} initialForm={preview}
                                            onClose={() => setPreview(null)}/>
            )}

            {ecpModal}
        </SzFormSection>
    );
}
