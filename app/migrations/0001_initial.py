import datetime
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Libro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=255)),
                ('autor', models.CharField(max_length=255)),
                ('isbn', models.CharField(db_index=True, max_length=50, unique=True)),
                ('copias_totales', models.PositiveIntegerField(default=1)),
                ('copias_disponibles', models.PositiveIntegerField(default=1)),
                ('portada_url', models.TextField(blank=True, null=True)),
                ('activo', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Libros',
                'db_table': 'libros',
            },
        ),
        migrations.CreateModel(
            name='Usuario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=255)),
                ('email', models.EmailField(db_index=True, max_length=254, unique=True)),
                ('activo', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Usuario',
                'verbose_name_plural': 'Usuarios',
                'db_table': 'usuarios',
            },
        ),
        migrations.CreateModel(
            name='Prestamo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_prestamo', models.DateField(default=datetime.date.today)),
                ('fecha_limite', models.DateField()),
                ('fecha_devolucion', models.DateField(blank=True, null=True)),
                ('activo', models.BooleanField(default=True)),
                ('libro', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prestamos', to='app.libro')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prestamos', to='app.usuario')),
            ],
            options={
                'verbose_name': 'Préstamo',
                'verbose_name_plural': 'Préstamos',
                'db_table': 'prestamos',
            },
        ),
    ]
