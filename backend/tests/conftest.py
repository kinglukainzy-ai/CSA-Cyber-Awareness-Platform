import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import MagicMock, patch

from app.main import app
from app.database import Base, get_db
from app.config import settings

# Setup test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(test_engine):
    connection = await test_engine.connect()
    transaction = await connection.begin()
    
    SessionLocal = async_sessionmaker(
        connection, 
        expire_on_commit=False, 
        class_=AsyncSession
    )
    session = SessionLocal()
    
    yield session
    
    await session.close()
    await transaction.rollback()
    await connection.close()

@pytest_asyncio.fixture(scope="session")
async def client():
    # We use a session-scoped client for general tests
    # Individual tests can override get_db if needed, but here we set it globally for the client
    async with AsyncClient(
        transport=ASGITransport(app=app), 
        base_url="http://testserver"
    ) as ac:
        yield ac

@pytest.fixture(autouse=True)
def settings_override():
    with patch("app.config.settings.serial_secret", "test_secret_do_not_use_in_prod"), \
         patch("app.config.settings.jwt_secret", "test_jwt_secret"), \
         patch("app.config.settings.breach_pepper", "test_pepper"), \
         patch("app.config.settings.redis_url", "redis://localhost:6379/0"):
        yield

@pytest.fixture(autouse=True)
def mock_redis():
    with patch("app.services.redis_service._client", new_callable=MagicMock) as mocked:
        yield mocked

@pytest.fixture(autouse=True)
def override_get_db(db_session):
    async def _get_db_override():
        yield db_session
    
    app.dependency_overrides[get_db] = _get_db_override
    yield
    app.dependency_overrides.pop(get_db, None)
