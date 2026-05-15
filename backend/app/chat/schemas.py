from pydantic import BaseModel


class ChatInput(BaseModel):
    content: str


class ChatOutput(BaseModel):
    type: str
    token: str | None = None
    content: str | None = None
    citations: list[dict] | None = None
