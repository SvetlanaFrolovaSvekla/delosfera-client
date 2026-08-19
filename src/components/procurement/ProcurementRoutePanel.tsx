import {useCallback, useEffect, useState} from "react";
import {
    PARTICIPANT_STATE_LABEL,
    RESOLUTION_LABEL,
    ROUTE_STATUS_LABEL,
    workflowService,
    type RouteInstance,
} from "@/service/workflowService/workflowService.ts";
import {useAuth} from "@/context/AuthContext";
import {dashboardService} from "@/service/dashboardService/dashboardService.ts";

/**
 * Маршрут согласования заявки на закупку (PRC-08) на карточке.
 * Показывает этапы с участниками и их резолюциями; активному участнику
 * даёт согласовать или отклонить прямо здесь — без перехода в реестр задач.
 */

interface Props {
    routeInstanceId: number;
    onResolved?: () => void;
}

export const ProcurementRoutePanel = ({routeInstanceId, onResolved}: Props) => {
    const {user} = useAuth();
    const [route, setRoute] = useState<RouteInstance | null>(null);
    /** Id сотрудников, которых пользователь сейчас замещает: за них он тоже решает (GEN-14). */
    const [actingForIds, setActingForIds] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setRoute(await workflowService.instance(routeInstanceId));
        } catch {
            setError("Не удалось загрузить маршрут согласования");
        }
    }, [routeInstanceId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        dashboardService.summary()
            .then(d => setActingForIds(d.actingFor.map(a => a.userId)))
            .catch(() => undefined);
    }, []);

    const decide = async (participantId: number, approve: boolean) => {
        // Отклонение прерывает маршрут, поэтому причина обязательна — она уходит
        // инициатору вместе с возвратом заявки.
        const comment = approve
            ? undefined
            : window.prompt("Причина отклонения заявки:")?.trim();

        if (!approve && !comment) return;

        try {
            setBusy(true);
            setError(null);
            await workflowService.resolve(participantId, approve ? "Approved" : "Rejected", comment);
            await load();
            onResolved?.();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось вынести резолюцию");
        } finally {
            setBusy(false);
        }
    };

    if (!route) return null;

    return (
        <section style={card}>
            <div style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 12}}>
                <div style={cardTitle}>Маршрут согласования</div>
                <div style={{flex: 1}}/>
                <span style={{fontSize: 12, fontWeight: 600, color: "#55617a"}}>
                    {ROUTE_STATUS_LABEL[route.status] ?? route.status}
                </span>
            </div>

            {error && <div style={{marginBottom: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}

            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                {route.steps.map(step => {
                    const isCurrent = step.order === route.currentStepOrder;
                    return (
                        <div
                            key={step.id}
                            style={{
                                display: "flex", gap: 12, padding: "10px 12px", borderRadius: 10,
                                background: isCurrent ? "#f7faff" : "#f6f8fb",
                                border: `1px solid ${isCurrent ? "#cbddff" : "transparent"}`,
                            }}
                        >
                            <span style={{
                                width: 24, height: 24, flex: "none", display: "grid", placeItems: "center",
                                borderRadius: 7, fontSize: 12, fontWeight: 700,
                                background: isCurrent ? "#2f68f5" : "#e5e9f0",
                                color: isCurrent ? "#fff" : "#8b97ab",
                            }}>
                                {step.order}
                            </span>

                            <div style={{flex: 1, minWidth: 0}}>
                                {step.participants.map(p => (
                                    <div key={p.id} style={{display: "flex", alignItems: "center", gap: 10}}>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{fontSize: 13, fontWeight: 600, color: "#26324a"}}>
                                                {p.userFullName ?? "участник не назначен"}
                                                {step.kind === "Board" && (
                                                    <span style={{marginLeft: 6, fontSize: 11, color: "#c77700"}}>
                                                        вынесение на коллегиальный орган
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{fontSize: 11.5, color: "#8b97ab"}}>
                                                {PARTICIPANT_STATE_LABEL[p.state] ?? p.state}
                                                {p.resolution && ` · ${RESOLUTION_LABEL[p.resolution.type] ?? p.resolution.type}`}
                                                {p.resolution?.comment && ` — ${p.resolution.comment}`}
                                            </div>
                                        </div>

                                        {p.state === "Active" && p.userId !== null
                                            && (p.userId === user?.id || actingForIds.includes(p.userId)) && (
                                            <div style={{display: "flex", gap: 6}}>
                                                <button onClick={() => decide(p.id, true)} disabled={busy} style={primaryButton}>
                                                    Согласовать
                                                </button>
                                                <button onClick={() => decide(p.id, false)} disabled={busy} style={secondaryButton}>
                                                    Отклонить
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: 13,
    padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".06em",
    color: "#8b97ab",
    textTransform: "uppercase",
};

const primaryButton: React.CSSProperties = {
    height: 30, padding: "0 12px", border: "none", borderRadius: 8,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 30, padding: "0 12px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
