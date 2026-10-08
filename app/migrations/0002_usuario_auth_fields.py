from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('app', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='libro',
            options={'verbose_name': 'Libro', 'verbose_name_plural': 'Libros'},
        ),
        migrations.AddField(
            model_name='usuario',
            name='password',
            field=models.CharField(blank=True, default='123456', max_length=128),
        ),
        migrations.AddField(
            model_name='usuario',
            name='rol',
            field=models.CharField(choices=[('usuario', 'Lector / Socio'), ('admin', 'Administrador')], default='usuario', max_length=20),
        ),
    ]
