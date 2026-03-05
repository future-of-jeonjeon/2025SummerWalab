from fastapi import APIRouter


from app.monitoring.routes import router as monitoring_router
from app.auth.routes import router as auth_router
from app.problem.routes import router as problem_router
from app.workbook.routes import router as workbook_router
from app.execution.routes import router as execution_router
from app.code_autosave.routes import router as auto_save_router
from app.organization.routes import router as organization_router
from app.organization_apply.routes import router as organization_apply_router
from app.notification.routes import router as notification_router
from app.contest.routes import router as contest_router
from app.export_result.routes import router as export_result_router
from app.submission.routes import router as submission_router
from app.common.routes import router as common_router
from app.user.routes import router as user_router
from app.rank.routes import router as rank_router
from app.todo.routes import router as todo_router
from app.contribute.routes import router as contribute_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(auto_save_router)
api_router.include_router(contest_router)
api_router.include_router(export_result_router)
api_router.include_router(problem_router)
api_router.include_router(workbook_router)
api_router.include_router(execution_router)
api_router.include_router(organization_router)
api_router.include_router(organization_apply_router)
api_router.include_router(monitoring_router)
api_router.include_router(submission_router)
api_router.include_router(common_router)
api_router.include_router(user_router)
api_router.include_router(rank_router)
api_router.include_router(todo_router)
api_router.include_router(contribute_router)
api_router.include_router(notification_router)
