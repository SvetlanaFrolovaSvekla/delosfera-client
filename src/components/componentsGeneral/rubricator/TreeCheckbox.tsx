// Компонент чекбокса рубрикатора
import {Check, Minus} from "lucide-react";

interface TreeCheckboxProps {
    checked: boolean;
    indeterminate: boolean;
    size?: number;
}

export function TreeCheckbox({checked, indeterminate, size = 20}: TreeCheckboxProps) {
    return (
        <span
            role="checkbox"
            aria-checked={checked ? true : indeterminate ? "mixed" : false}
            className="rounded-md grid place-items-center border-[1.5px]"
            style={{
                width: size,
                height: size,
                ...(checked
                    ? {borderColor: "#1c9c5c", background: "#1c9c5c"}
                    : indeterminate
                        ? {borderColor: "#1c9c5c", background: "white"}
                        : {borderColor: "#cbd3df", background: "white"}),
            }}
        >
            {checked && <Check className="w-[13px] h-[13px] text-white" strokeWidth={3}/>}
            {!checked && indeterminate && (
                <Minus className="w-[13px] h-[13px]" style={{color: "#1c9c5c"}} strokeWidth={3}/>
            )}
        </span>
    );
}