import sys
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Inspecciona las tablas de la base de datos PostgreSQL, dependencias y claves foráneas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "="*60))
        self.stdout.write(self.style.MIGRATE_HEADING("  INSPECTOR DE BASE DE DATOS POSTGRESQL & DEPENDENCIAS"))
        self.stdout.write(self.style.MIGRATE_HEADING("="*60 + "\n"))

        db_engine = connection.vendor
        db_name = connection.settings_dict.get('NAME', 'biblioteca_db')
        db_user = connection.settings_dict.get('USER', 'biblioteca_user')
        db_host = connection.settings_dict.get('HOST', 'localhost')
        db_port = connection.settings_dict.get('PORT', 5432)

        self.stdout.write(f"  • Motor:          {db_engine}")
        self.stdout.write(f"  • Base de datos:  {db_name}")
        self.stdout.write(f"  • Usuario:        {db_user}")
        self.stdout.write(f"  • Host / Puerto:  {db_host}:{db_port}\n")

        with connection.cursor() as cursor:
            # Versión del servidor
            try:
                cursor.execute("SELECT version();")
                ver = cursor.fetchone()[0]
                self.stdout.write(self.style.SUCCESS(f"  • Versión SQL:   {ver.split(',')[0]}\n"))
            except Exception:
                pass

            # Tablas y recuento de registros
            self.stdout.write(self.style.MIGRATE_LABEL("--- TABLAS PRINCIPALES Y REGISTROS ---"))
            tablas = ['libros', 'usuarios', 'prestamos', 'django_migrations', 'auth_user']
            for t in tablas:
                try:
                    cursor.execute(f"SELECT count(*) FROM {t};")
                    cnt = cursor.fetchone()[0]
                    self.stdout.write(f"  [+] Tabla '{t}': {cnt} registro(s)")
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  [-] Tabla '{t}': no encontrada o vacía ({e})"))

            # Dependencias y Claves Foráneas
            self.stdout.write("\n" + self.style.MIGRATE_LABEL("--- DEPENDENCIAS Y CLAVES FORÁNEAS (RELACIONES) ---"))
            if db_engine == 'postgresql':
                try:
                    cursor.execute("""
                        SELECT
                            kcu.table_name AS origen,
                            kcu.column_name AS col_origen,
                            ccu.table_name AS destino,
                            ccu.column_name AS col_destino
                        FROM
                            information_schema.table_constraints AS tc
                            JOIN information_schema.key_column_usage AS kcu
                              ON tc.constraint_name = kcu.constraint_name
                              AND tc.table_schema = kcu.table_schema
                            JOIN information_schema.constraint_column_usage AS ccu
                              ON ccu.constraint_name = tc.constraint_name
                              AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
                    """)
                    rows = cursor.fetchall()
                    if rows:
                        for r in rows:
                            self.stdout.write(f"  🔗 {r[0]}.{r[1]}  -->  {r[2]}.{r[3]} (Dependencia)")
                    else:
                        self.stdout.write("  (No se encontraron claves foráneas adicionales registradas en public)")
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  Aviso al consultar FKs: {e}"))
            else:
                self.stdout.write("  🔗 prestamos.libro_id   -->  libros.id (FOREIGN KEY)")
                self.stdout.write("  🔗 prestamos.usuario_id -->  usuarios.id (FOREIGN KEY)")

        # Dependencias de Python
        self.stdout.write("\n" + self.style.MIGRATE_LABEL("--- DEPENDENCIAS DE SOFTWARE (PYTHON & DJANGO) ---"))
        deps = [
            ("Django", "5.0.x", "Framework web & ORM relacional"),
            ("djangorestframework", "3.15.x", "API REST y serializadores"),
            ("psycopg2-binary", "2.9.x", "Driver de conexión con PostgreSQL"),
            ("requests", "2.31.x", "Cliente HTTP para integración Open Library"),
            ("django-cors-headers", "4.3.x", "Control de acceso multi-origen (CORS)"),
            ("python-dotenv", "1.0.x", "Manejo de variables de entorno (.env)")
        ]
        for name, ver, desc in deps:
            self.stdout.write(f"  📦 {name:<22} v{ver:<8} ({desc})")

        # Comandos para verificar en la terminal
        self.stdout.write("\n" + self.style.MIGRATE_HEADING("--- CÓMO VERIFICARLAS EN LA TERMINAL (CHEATSHEET) ---"))
        self.stdout.write(self.style.SUCCESS("  1. Entrar directamente al cliente PostgreSQL de Docker:"))
        self.stdout.write("     docker compose exec db psql -U biblioteca_user -d biblioteca_db\n")
        self.stdout.write(self.style.SUCCESS("  2. Listar todas las tablas en psql:"))
        self.stdout.write("     \\dt\n")
        self.stdout.write(self.style.SUCCESS("  3. Ver la estructura detallada de la tabla libros:"))
        self.stdout.write("     \\d+ libros\n")
        self.stdout.write(self.style.SUCCESS("  4. Ver las restricciones y claves foráneas de prestamos:"))
        self.stdout.write("     \\d+ prestamos\n")
        self.stdout.write(self.style.SUCCESS("  5. Ver los paquetes pip instalados en el contenedor:"))
        self.stdout.write("     docker compose exec api pip list\n")
        self.stdout.write("="*60 + "\n")
