import {Link} from "react-router-dom";
import type {MatrixNote} from "@/service/procurementService/authorityMatrixService.ts";

/**
 * Примечания к решению Матрицы полномочий.
 *
 * Каждое правило опирается на пункт Положения о закупках. Пункт назван прямо в
 * примечании и ведёт на карточку документа: инициатор должен прочитать основание
 * сам, а не верить системе на слово. Пока Положение не загружено в базу ВНД,
 * остаётся только номер пункта — тоже полезнее, чем ничего.
 */

interface Props {
    notes: MatrixNote[];
    className?: string;
}

export const MatrixNotesList = ({notes, className}: Props) => {
    if (notes.length === 0) return null;

    return (
        <ul className={className ?? "m-0 pl-[18px] text-[12.5px] leading-[1.7] text-[#8a5a00]"}>
            {notes.map((n) => (
                <li key={n.text}>
                    {n.text}
                    {n.clause && (
                        <>
                            {" — "}
                            {n.documentId ? (
                                <Link
                                    to={`/base-vnd/${n.documentId}`}
                                    className="text-[#2f68f5] underline"
                                >
                                    {n.clause}
                                </Link>
                            ) : (
                                <span className="text-[#8b97ab]">{n.clause}</span>
                            )}
                        </>
                    )}
                </li>
            ))}
        </ul>
    );
};
