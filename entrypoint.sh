#!/bin/sh
set -e

echo "=========================================="
echo "Iniciando servicio Django - Biblioteca API"
echo "=========================================="

# 1. Esperar que la base de datos PostgreSQL acepte conexiones
python wait_for_db.py || true

# 2. Generar migraciones pendientes
python manage.py makemigrations app --noinput || true

# 3. Aplicar migraciones con --fake-initial para evitar errores si las tablas ya existían
echo "Aplicando migraciones a la base de datos..."
python manage.py migrate --fake-initial --noinput || python manage.py migrate --noinput || true

# 4. Crear superusuario por defecto si no existe
echo "Verificando superusuario administrador..."
python manage.py create_default_admin || true

# 5. Iniciar servidor Django
echo "Iniciando servidor de desarrollo Django en 0.0.0.0:8000..."
exec python manage.py runserver 0.0.0.0:8000
