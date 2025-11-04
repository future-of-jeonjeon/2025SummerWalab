from typing import Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_organizations_order_by_rank_acm(
    limit: int,
    offset: int,
    db: AsyncSession,
) -> Dict[str, object]:
    order = "total_accepted DESC, total_submission ASC, organization_id ASC"

    sql = text(
        f"""
        SELECT
            o.id AS organization_id,
            o.name AS organization_name,
            o.description AS organization_description,
            COUNT(DISTINCT u.id) AS total_members,
            COALESCE(SUM(up.accepted_number), 0) AS total_accepted,
            COALESCE(SUM(up.submission_number), 0) AS total_submission,
            COALESCE(SUM(up.accepted_number), 0)::double precision
              / NULLIF(COALESCE(SUM(up.submission_number), 0), 0)::double precision AS accuracy,
            COUNT(*) OVER () AS total_count
        FROM public.micro_organization AS o
        LEFT JOIN public.micro_organization_member AS om ON om.organization_id = o.id
        LEFT JOIN public."user" AS u ON u.id = om.member_id
          AND u.admin_type = 'Regular User'
          AND (u.is_disabled IS FALSE OR u.is_disabled IS NULL)
        LEFT JOIN public.user_profile AS up ON up.user_id = u.id AND up.submission_number > 0
        GROUP BY o.id, o.name, o.description
        ORDER BY {order}
        LIMIT :limit OFFSET :offset
        """
    )

    rows = (await db.execute(sql, {"limit": limit, "offset": offset})).fetchall()
    total = int(rows[0][-1]) if rows else 0

    items = [
        {
            "rank": i,
            "organization_id": r[0],
            "name": r[1],
            "description": r[2],
            "total_members": int(r[3] or 0),
            "total_solved": int(r[4] or 0),
            "total_submission": int(r[5] or 0),
            "accuracy": float(r[6] or 0.0),
        }
        for i, r in enumerate(rows, start=offset + 1)
    ]

    return {"total": total, "limit": limit, "offset": offset, "items": items}


# Backward-compatible alias (keep existing import sites working)
get_organizations_order_by_rank_ACM = get_organizations_order_by_rank_acm
