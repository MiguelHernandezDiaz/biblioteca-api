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
        read_only_fields = ['id', 'activo']

    def create(self, validated_data):
        copias_totales = validated_data.get('copias_totales', 1)
        validated_data['copias_disponibles'] = copias_totales
        validated_data['activo'] = True
        return super().create(validated_data)


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, default='123456')

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'rol', 'activo', 'password']
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

    libro_id_out = serializers.IntegerField(source='libro.id', read_only=True)
    usuario_id_out = serializers.IntegerField(source='usuario.id', read_only=True)

    libro_titulo = serializers.CharField(source='libro.titulo', read_only=True)
    libro_autor = serializers.CharField(source='libro.autor', read_only=True)
    libro_portada = serializers.CharField(source='libro.portada_url', read_only=True)
    libro_isbn = serializers.CharField(source='libro.isbn', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)
    estado_plazo = serializers.CharField(read_only=True)

    class Meta:
        model = Prestamo
        fields = [
            'id',
            'libro_id',
            'usuario_id',
            'libro_id_out',
            'usuario_id_out',
            'libro_titulo',
            'libro_autor',
            'libro_portada',
            'libro_isbn',
            'usuario_nombre',
            'usuario_email',
            'fecha_prestamo',
            'fecha_limite',
            'fecha_devolucion',
            'dias_restantes',
            'estado_plazo',
            'activo',
        ]
        read_only_fields = ['id', 'fecha_prestamo', 'fecha_devolucion', 'activo', 'dias_restantes', 'estado_plazo']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['libro_id'] = instance.libro_id
        data['usuario_id'] = instance.usuario_id
        data.pop('libro_id_out', None)
        data.pop('usuario_id_out', None)
        return data
