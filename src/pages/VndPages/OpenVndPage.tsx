import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";
import {ArrowLeft} from "lucide-react";
import {useVndById} from "@/hooks/vndHooks/useVndById.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {getVndTabs, type VndTabId} from "@/constants/vndTabs.ts";
import {VndStatusBanner} from "@/components/componentsGeneral/knowledgeBaseComponents/VndStatusBanner.tsx";
import {VndTabPlaceholder} from "@/components/componentsGeneral/VndTabPlaceholder.tsx";
import {formatDate} from "@/utils/dateUtils.ts";
import {VndPassportTab} from "@/components/componentsVND/componentsOpenVndPage/VndPassportTab.tsx";
import {VndEditionsTab} from "@/components/componentsVND/componentsOpenVndPage/VndEditionsTab.tsx";
import {VndCoordinationTab} from "@/components/componentsVND/componentsOpenVndPage/VndCoordinationTab.tsx";
import {
    TYPE_VND,
    ORGANS_APPROVAL,
    ORG_UNITS,
    KEYWORDS,
    RUBRICS,
    SECURITY_LEVELS,
    USER_GROUPS,
} from "@/service/mockData/DictionaryData.tsx";
import {USERS} from "@/service/mockData/UserData.tsx";

export function OpenVndPage() {
    const {id} = useParams<{ id: string }>();
    const {data: vnd, loading, error, refetch} = useVndById(id ? Number(id) : undefined);
    const navigate = useNavigate();
    const [tab, setTab] = useState<VndTabId>("passport");

    if (loading) {
        return <div className="py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</div>;
    }

    if (error) {
        return (
            <div className="my-4 mx-auto max-w-[1000px] rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[13px] text-[#c0392b]">
                Не удалось загрузить документ: {error}
            </div>
        );
    }

    if (!vnd) return null;

    const meta = STATUS_META[vnd.status];
    const tabs = getVndTabs(vnd.status);
    // Если сменился статус и текущий выбранный таб для него больше не доступен — откатываемся на «Реквизиты»
    const activeTab = tabs.some((t) => t.id === tab) ? tab : "passport";

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/basevnd")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                База ВНД
            </button>

            <div className="flex items-center gap-[9px] mb-1 flex-wrap mt-3">
                <span className="font-mono text-[13px] font-semibold text-[#4e57d6] bg-[#ececfc] px-[10px] py-[3px] rounded-[7px]">
                    {vnd.code}
                </span>
                <span className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono text-[12px] text-[#8b97ab]">
                    Дата создания: {formatDate(vnd.createdAt)}
                </span>
                <span
                    className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono rounded-full"
                    style={{color: meta.color, background: meta.bg}}
                >
                    {meta.label}
                </span>
            </div>

            <h1 className="m-0 mb-1 text-[23px] font-bold tracking-[-0.02em]">
                {vnd.name}
            </h1>

            <VndStatusBanner status={vnd.status}/>

            {/* Табы - состав зависит от статуса, «Реквизиты» есть всегда */}
            <div className="flex items-center gap-6 border-b border-[#e9edf3] mb-5 overflow-x-auto">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`whitespace-nowrap pb-3 border-b-2 text-[13px] font-semibold cursor-pointer bg-transparent ${
                            activeTab === t.id
                                ? "border-[#4e57d6] text-[#4e57d6]"
                                : "border-transparent text-[#8b97ab] hover:text-[#3a4560]"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === "passport" && (
                <VndPassportTab
                    vnd={vnd}
                    onVndChanged={refetch}
                    typeOptions={TYPE_VND.map((x) => ({key: String(x.id), label: x.name}))}
                    organOptions={ORGANS_APPROVAL.map((x) => ({key: String(x.id), label: x.name}))}
                    developerOptions={ORG_UNITS.map((x) => ({key: String(x.id), label: x.name}))}
                    curatorOptions={USERS.map((x) => ({key: String(x.id), label: x.fullName}))}
                    executorOptions={ORG_UNITS.map((x) => ({key: String(x.id), label: x.name}))}
                    keywordOptions={KEYWORDS.map((k) => ({key: k.id, label: k.name, parentId: k.parentId}))}
                    rubricOptions={RUBRICS.map((r) => ({key: r.id, label: r.name, parentId: r.parentId}))}
                    secrecyOptions={SECURITY_LEVELS.map((x) => ({key: String(x.id), label: x.name}))}
                    userGroupOptions={USER_GROUPS.map((g) => ({key: g.id, label: g.name}))}
                />
            )}
            {activeTab === "editions" && <VndEditionsTab vnd={vnd} onVndChanged={refetch}/>}
            {activeTab === "approval" && <VndCoordinationTab vnd={vnd}/>}
            {activeTab === "actual" && <VndTabPlaceholder/>}
            {activeTab === "links" && <VndTabPlaceholder/>}
        </div>
    );
}