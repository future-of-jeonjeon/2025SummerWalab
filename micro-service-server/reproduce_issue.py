import sys
import os
from sqlalchemy import create_mock_engine

# Add the project root directory to the Python path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), 'app')))
sys.path.insert(0, os.path.realpath(os.path.dirname(__file__)))

from app.config.database import Base
import app.user.models

def dump(sql, *multiparams, **params):
    print(sql.compile(dialect=engine.dialect))

engine = create_mock_engine("postgresql://", dump)

print("Tables in metadata:")
for table_name in Base.metadata.tables:
    print(f"- {table_name}")

try:
    # This triggers the resolution of ForeignKeys
    Base.metadata.create_all(engine, checkfirst=False)
    print("Metadata creation successful (mock).")
except Exception as e:
    print(f"Error during metadata creation: {e}")
