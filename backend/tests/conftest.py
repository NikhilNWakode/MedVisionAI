import asyncio
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.auth.jwt import create_access_token, hash_password
from app.db.models import Base, User
from app.db.session import engine
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers():
    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id, "email": "test@test.com"})
    return {"Authorization": f"Bearer {token}"}
