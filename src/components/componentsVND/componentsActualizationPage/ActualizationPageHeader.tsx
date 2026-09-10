import {ChartLine, Download, Settings} from "lucide-react";

export function ActualizationPageHeader() {
    return (
        <div className="flex items-end justify-between gap-5 flex-wrap mb-[18px]">
            <div>
                <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">
                    Планирование актуализации
                </h1>
                <p className="mt-[7px] mb-0 text-[#8b97ab] text-[13px]">
                    Контроль сроков актуализации ВНД и планирование предстоящих пересмотров
                </p>
            </div>
            <div className="flex gap-2.5">
                {/*TODO: кнопку настроить, чтоб её видел только админ, главный методолог*/}
                <button
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <Settings className="w-[18px] h-[18px]" strokeWidth={2}/>
                    Настройки рассылок плана
                </button>

                <button
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <Download className="w-[18px] h-[18px]" strokeWidth={2}/>
                    Экспорт плана в Excel
                </button>

                <button
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <ChartLine className="w-[18px] h-[18px]" strokeWidth={2}/>
                    Отчеты по актуализации
                </button>
            </div>
        </div>
    )
}