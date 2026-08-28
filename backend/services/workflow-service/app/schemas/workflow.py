from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkflowStartRequest(BaseModel):
    document_type: str
    document_id: str
    submitted_by: str


class WorkflowActionRequest(BaseModel):
    comment: str | None = None


class WorkflowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_type: str
    document_id: str
    definition_name: str
    status: str
    current_step_num: int
    current_assignee_role: str | None
    submitted_by: str
    version: int = 1


class WorkflowProgress(BaseModel):
    workflow: WorkflowOut
    completed_steps: list[int] = Field(default_factory=list)
    remaining_steps: list[dict]
    current_step: dict | None = None
