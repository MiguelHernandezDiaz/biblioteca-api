import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Lee la URL de conexión desde la variable de entorno definida en docker-compose.yml
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://biblioteca_user:biblioteca_pass@localhost:5432/biblioteca_db",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependencia de FastAPI: entrega una sesión de BD y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
