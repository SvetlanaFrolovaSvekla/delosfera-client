import type {ReactNode} from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
}

export function PageHeader({title, description, actions}: PageHeaderProps) {
    return (
        <div className="flex items-end justify-between gap-5 flex-wrap mb-[18px]">
            <div>
                <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">
                    {title}
                </h1>
                {description && (
                    <p className="mt-[7px] mb-0 text-[#8b97ab] text-[13px]">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex gap-2.5">
                    {actions}
                </div>
            )}
        </div>
    );
}