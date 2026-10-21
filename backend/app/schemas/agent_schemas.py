from typing import Literal
from pydantic import BaseModel, Field



class FindingSchema(BaseModel):
    line: int = Field(ge=1)
    severity: Literal["low", "medium", "high"]
    title: str
    explanation: str
    evidence: str

class ReviewResultSchema(BaseModel):
    findings:list[FindingSchema]



class TestSuggestionSchema(BaseModel):
    line: int = Field(ge=1)
    name: str
    test_code: str



class TestPlanSchema(BaseModel):
    tests: list[TestSuggestionSchema]