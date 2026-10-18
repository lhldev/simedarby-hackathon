import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.engine import create_tables

if __name__ == "__main__":
    create_tables()
    print("Database schema created.")
