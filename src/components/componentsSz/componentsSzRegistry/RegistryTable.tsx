import type {ReactNode} from "react";

export interface RegistryColumn {
    /** Полный набор классов <th> (ширина задаётся здесь же). */
    className: string;
    content?: ReactNode;
}

/** Общая «рамка» таблиц реестра: контейнер, шапка, тело. */
export function RegistryTable({columns, children}: { columns: RegistryColumn[]; children: ReactNode }) {
    return (
        <div className="mt-3 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
            <table className="w-full border-collapse text-[13px]">
                <thead>
                <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {columns.map((c, i) => (
                        <th key={i} className={c.className}>{c.content}</th>
                    ))}
                </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

/** Строка-заглушка на всю ширину: «загрузка» / «пусто». */
export function RegistryStateRow({colSpan, children}: { colSpan: number; children: ReactNode }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">{children}</td>
        </tr>
    );
}
