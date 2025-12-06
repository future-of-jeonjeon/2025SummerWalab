import asyncio
import os
import sys

# Add the current directory to sys.path to ensure app modules can be imported
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config.database import DATABASE_URL

async def reset_db():
    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        # 1. Drop alembic_version table
        print("Dropping alembic_version table...")
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version;"))
        
        # 2. Find all tables starting with micro_
        print("Finding micro_ tables...")
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'micro_%';"))
        tables = result.fetchall()
        
        # 3. Drop each table
        for table in tables:
            table_name = table[0]
            print(f"Dropping table {table_name}...")
            await conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE;"))
            
    print("Database reset complete. You can now restart the container to run migrations from scratch.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_db())
