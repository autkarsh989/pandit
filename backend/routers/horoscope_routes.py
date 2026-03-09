from fastapi import APIRouter

router = APIRouter()

@router.get("/predict")
def first():
    return "hello"