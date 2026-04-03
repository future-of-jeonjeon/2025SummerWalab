import app.problem.service as problem_service


def test_choose_daily_problem_avoids_yesterday_when_possible():
    chosen = problem_service.choose_daily_problem_id([1, 2, 3], yesterday_problem_id=2, seed=7)
    assert chosen in {1, 3}


def test_choose_daily_problem_allows_yesterday_when_only_one_problem():
    chosen = problem_service.choose_daily_problem_id([10], yesterday_problem_id=10, seed=1)
    assert chosen == 10


def test_choose_daily_problem_is_seed_deterministic():
    a = problem_service.choose_daily_problem_id([11, 22, 33, 44], yesterday_problem_id=None, seed=2026)
    b = problem_service.choose_daily_problem_id([11, 22, 33, 44], yesterday_problem_id=None, seed=2026)
    assert a == b
