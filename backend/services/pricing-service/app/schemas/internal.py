from pydantic import BaseModel


class WorkflowStatusCallback(BaseModel):
    document_type: str
    document_id: str
    workflow_status: str
