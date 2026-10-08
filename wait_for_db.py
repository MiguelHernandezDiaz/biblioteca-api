import os
import time
import sys
from urllib.parse import urlparse

db_url = os.getenv("DATABASE_URL", "")
if not db_url:
    print("Sin DATABASE_URL configurada, utilizando almacenamiento SQLite.")
    sys.exit(0)

url = urlparse(db_url)
host = url.hostname or "db"
port = url.port or 5432
user = url.username or "biblioteca_user"
password = url.password or "biblioteca_pass"
dbname = url.path.lstrip("/") or "biblioteca_db"

print(f"Esperando que PostgreSQL ({host}:{port}/{dbname}) esté listo...")
for i in range(30):
    try:
        import psycopg2
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            connect_timeout=3
        )
        conn.close()
        print("PostgreSQL está listo y aceptando conexiones.")
        sys.exit(0)
    except Exception as e:
        print(f"Intento {i+1}/30: Base de datos no disponible todavía ({e}). Reintentando en 1s...")
        time.sleep(1)

print("Aviso: Tiempo límite esperando PostgreSQL, continuando arranque de Django...")
sys.exit(0)
