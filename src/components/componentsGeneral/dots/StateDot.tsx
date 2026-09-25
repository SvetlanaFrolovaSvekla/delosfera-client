// Кружки в меню "Системные настройки" ("Интеграции")
import type {IntegrationState} from "@/pages/ManagementPages/SystemSettings/SystemSettingsPage.tsx";

export function StateDot({state}: { state: IntegrationState }) {
    if (!state) return <span className="h-2 w-2 rounded-full bg-[#d6dded]"/>;

    const color = state.hasError ? "#c0392b" : state.enabled ? "#1f8a4c" : "#a6b0c2";
    const title = state.hasError ? "Есть ошибка" : state.enabled ? "Включена" : "Выключена";

    return <span className="h-2 w-2 rounded-full" style={{background: color}} title={title}/>;
}