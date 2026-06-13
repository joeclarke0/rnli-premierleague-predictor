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
