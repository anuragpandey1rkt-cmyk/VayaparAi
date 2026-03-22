"""Pytest configuration for VyaparAI tests."""
import pytest
import asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Create an asyncio event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


# Marks all async tests with asyncio
def pytest_collection_modifyitems(items):
    for item in items:
        if item.get_closest_marker("asyncio") is None and asyncio.iscoroutinefunction(getattr(item, "function", None)):
            item.add_marker(pytest.mark.asyncio)
