"""Test script for NotebookLM integration."""
import asyncio
from notebooklm.client import NotebookLMClient

async def test():
    client = await NotebookLMClient.from_storage()
    async with client:
        # List notebooks and show IDs
        nbs = await client.notebooks.list()
        print(f"Found {len(nbs)} notebooks:\n")
        for nb in nbs:
            print(f"  ID: {nb.id}")
            print(f"  Title: {getattr(nb, 'title', '?')}")
            print(f"  Type: {type(nb.id)}")
            print()

        # Try to ask the first notebook a simple question
        if nbs:
            first_nb = nbs[0]
            print(f"--- Testing chat.ask on: {getattr(first_nb, 'title', first_nb.id)} ---")
            try:
                result = await client.chat.ask(first_nb.id, "What is this notebook about?")
                print(f"Result type: {type(result)}")
                print(f"Text: {getattr(result, 'text', str(result))[:300]}")
            except Exception as e:
                print(f"ERROR: {type(e).__name__}: {e}")

asyncio.run(test())
