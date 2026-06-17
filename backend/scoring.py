from collections import defaultdict


def calculate_points(pred_home: int, pred_away: int, act_home: int, act_away: int) -> int:
    if pred_home == act_home and pred_away == act_away:
        return 5
    if (
        (pred_home > pred_away and act_home > act_away)
        or (pred_home < pred_away and act_home < act_away)
        or (pred_home == pred_away and act_home == act_away)
    ):
        return 2
    return 0


def wildcard_multiplier(has_wildcard: bool) -> int:
    """Points multiplier applied to a wildcarded gameweek. Single source of truth."""
    return 2 if has_wildcard else 1


def compute_gameweek_points(
    predictions,
    result_lookup,
    postponed_fixture_ids,
    wildcard_lookup,
):
    """
    Shared per-(user, gameweek) scoring used by the leaderboard, the admin users
    list, and the admin predictions viewer so totals can never diverge.

    Computes the RAW (pre-doubling) points per (user_id, gameweek) from the given
    predictions, then applies the wildcard x2 multiplier to any gameweek the user
    has activated a wildcard for. Postponed fixtures are excluded entirely, and
    that exclusion still holds under doubling (a postponed fixture contributes 0
    before doubling, so x2 leaves it at 0).

    Args:
        predictions: iterable of Prediction rows (each needs .user_id, .gameweek,
            .fixture_id, .predicted_home, .predicted_away).
        result_lookup: {fixture_id: Result} for fixtures that have a result.
        postponed_fixture_ids: set of fixture ids whose status is "postponed".
        wildcard_lookup: set of (user_id, gameweek) tuples that are wildcarded.

    Returns:
        dict {user_id: {gameweek: doubled_points}} — values already reflect any
        wildcard doubling, so callers just sum them.
    """
    # {user_id: {gameweek: raw_points}}
    raw = defaultdict(lambda: defaultdict(int))

    for pred in predictions:
        fixture_id = pred.fixture_id
        # Postponed fixtures never contribute, even if a stale result lingers.
        if fixture_id in postponed_fixture_ids:
            continue
        result = result_lookup.get(fixture_id)
        if result is None:
            continue
        raw[pred.user_id][pred.gameweek] += calculate_points(
            pred.predicted_home, pred.predicted_away,
            result.actual_home, result.actual_away,
        )

    # Apply wildcard doubling per (user, gameweek).
    scored = defaultdict(lambda: defaultdict(int))
    for user_id, weeks in raw.items():
        for gameweek, points in weeks.items():
            multiplier = wildcard_multiplier((user_id, gameweek) in wildcard_lookup)
            scored[user_id][gameweek] = points * multiplier

    return scored
