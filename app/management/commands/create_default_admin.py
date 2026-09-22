import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Crea un superusuario por defecto si no existe'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@biblioteca.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin1234')

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f'Superusuario "{username}" creado exitosamente.'))
        else:
            self.stdout.write(self.style.WARNING(f'El superusuario "{username}" ya existe.'))
