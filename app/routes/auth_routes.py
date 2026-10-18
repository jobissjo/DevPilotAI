import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import create_token, get_hash_password, verify_password
from app.models import User
from app.schemas import Token, UserCreate, UserPublic

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


@router.post("/register", response_model=UserPublic)
async def register_user(
    user_in: UserCreate, session: AsyncSession = Depends(get_session)
):
    # Check if email exists
    result = await session.exec(select(User).where(User.email == user_in.email))
    if result.first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password and save
    hashed_password = get_hash_password(user_in.password)
    db_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        password=hashed_password,  # Store the hash in the DB model's password field
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    # OAuth2PasswordRequestForm uses 'username' field (we will map it to email)
    result = await session.exec(select(User).where(User.email == form_data.username))
    user = result.first()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")


# Dependency to get the current authenticated user
async def get_current_user(
    token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)
) -> User:

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    result = await session.exec(select(User).where(User.id == int(user_id)))
    user = result.first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Example of a protected route
@router.get("/users/me", response_model=UserPublic)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
