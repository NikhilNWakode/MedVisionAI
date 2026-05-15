import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_upload_no_auth(client: AsyncClient):
    response = await client.post("/images/upload")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_images_no_auth(client: AsyncClient):
    response = await client.get("/images")
    assert response.status_code == 403
