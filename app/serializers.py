from rest_framework import serializers
from app.models import Libro, Usuario, Prestamo

class LibroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Libro
        fields = [
            'id',
            'titulo',
            'autor',
            'isbn',
            'copias_totales',
            'copias_disponibles',
            'portada_url',
            'activo',
        ]
        read_only_fields = ['id', 'copias_disponibles', 'activo']

    def create(self, validated_data):
        copias_totales = validated_data.get('copias_totales', 1)
        validated_data['copias_disponibles'] = copias_totales
        validated_data['activo'] = True
        return super().create(validated_data)


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'activo']
        read_only_fields = ['id', 'activo']


class PrestamoSerializer(serializers.ModelSerializer):
    libro_id = serializers.PrimaryKeyRelatedField(
        queryset=Libro.objects.all(),
        source='libro',
        write_only=True
    )
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='usuario',
        write_only=True
    )

    # Output fields matching previous FastAPI schema
    libro_id_out = serializers.IntegerField(source='libro.id', read_only=True)
    usuario_id_out = serializers.IntegerField(source='usuario.id', read_only=True)

    class Meta:
        model = Prestamo
        fields = [
            'id',
            'libro_id',
            'usuario_id',
            'libro_id_out',
            'usuario_id_out',
            'fecha_prestamo',
            'fecha_limite',
            'fecha_devolucion',
            'activo',
        ]
        read_only_fields = ['id', 'fecha_prestamo', 'fecha_devolucion', 'activo']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure flat libro_id and usuario_id match FastAPI schema
        data['libro_id'] = instance.libro_id
        data['usuario_id'] = instance.usuario_id
        data.pop('libro_id_out', None)
        data.pop('usuario_id_out', None)
        return data
