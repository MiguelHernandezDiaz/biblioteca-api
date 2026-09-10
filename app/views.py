import os
import requests
from datetime import date, timedelta
from django.http import HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from app.models import Libro, Usuario, Prestamo
from app.serializers import LibroSerializer, UsuarioSerializer, PrestamoSerializer


@api_view(['GET'])
def root(request):
    return Response({
        "mensaje": "API de biblioteca con Django y Django REST Framework funcionando.",
        "admin": "/admin/",
        "scanner": "/scanner",
        "endpoints": ["/libros/", "/usuarios/", "/prestamos/", "/open-library/<isbn>"]
    })


# ==================== LIBROS ====================

@api_view(['GET', 'POST'])
def libros_list(request):
    if request.method == 'GET':
        libros = Libro.objects.filter(activo=True)
        serializer = LibroSerializer(libros, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        isbn = request.data.get('isbn', '').strip()
        if Libro.objects.filter(isbn=isbn).exists():
            return Response(
                {"detail": "Ya existe un libro con ese ISBN"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LibroSerializer(data=request.data)
        if serializer.is_valid():
            libro = serializer.save()
            return Response(LibroSerializer(libro).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
def libro_detail(request, pk):
    try:
        libro = Libro.objects.get(pk=pk)
    except Libro.DoesNotExist:
        return Response({"detail": "Libro no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = LibroSerializer(libro)
        return Response(serializer.data)

    elif request.method == 'DELETE':
        if not libro.activo:
            return Response(
                {"detail": "Libro no encontrado o ya eliminado"},
                status=status.HTTP_404_NOT_FOUND
            )

        # REGLA 1: No dejar borrar si hay un préstamo activo (activo == True)
        prestamo_activo = Prestamo.objects.filter(libro=libro, activo=True).first()
        if prestamo_activo:
            return Response(
                {"detail": "No se puede eliminar el libro porque actualmente tiene un préstamo activo sin devolver."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si no tiene préstamos activos, hacemos borrado lógico
        libro.activo = False
        libro.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== USUARIOS ====================

@api_view(['GET', 'POST'])
def usuarios_list(request):
    if request.method == 'GET':
        usuarios = Usuario.objects.all()
        serializer = UsuarioSerializer(usuarios, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        email = request.data.get('email', '').strip().lower()
        if Usuario.objects.filter(email=email).exists():
            return Response(
                {"detail": "Ya existe un usuario con ese email"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = UsuarioSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== PRÉSTAMOS ====================

@api_view(['GET', 'POST'])
def prestamos_list(request):
    if request.method == 'GET':
        prestamos = Prestamo.objects.all()
        serializer = PrestamoSerializer(prestamos, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        libro_id = request.data.get('libro_id')
        usuario_id = request.data.get('usuario_id')
        dias_prestamo = int(request.data.get('dias_prestamo', 7))

        try:
            libro = Libro.objects.get(pk=libro_id)
        except Libro.DoesNotExist:
            return Response({"detail": "Libro no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if libro.copias_disponibles <= 0:
            return Response(
                {"detail": "No hay copias disponibles de este libro"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        hoy = date.today()
        nuevo_prestamo = Prestamo.objects.create(
            libro=libro,
            usuario=usuario,
            fecha_prestamo=hoy,
            fecha_limite=hoy + timedelta(days=dias_prestamo),
            activo=True
        )

        libro.copias_disponibles -= 1
        libro.save()

        serializer = PrestamoSerializer(nuevo_prestamo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
def devolver_prestamo(request, pk):
    try:
        prestamo = Prestamo.objects.get(pk=pk)
    except Prestamo.DoesNotExist:
        return Response({"detail": "Préstamo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if not prestamo.activo:
        return Response(
            {"detail": "Este préstamo ya fue devuelto e inactivado"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Registrar fecha de devolución
    prestamo.fecha_devolucion = date.today()
    # REGLA 2: El préstamo pasa a estar inactivo (ahora es historial)
    prestamo.activo = False
    prestamo.save()

    # Devolver copia al inventario del libro
    libro = prestamo.libro
    libro.copias_disponibles += 1
    libro.save()

    serializer = PrestamoSerializer(prestamo)
    return Response(serializer.data)


# ==================== OPEN LIBRARY ====================

@api_view(['GET'])
def buscar_en_open_library(request, isbn):
    """
    Consulta directamente la API pública de Open Library usando el ISBN.
    """
    isbn_limpio = isbn.replace("-", "").strip()
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn_limpio}&format=json&jscmd=data"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            return Response(
                {"detail": f"Error al conectar con Open Library (Código: {response.status_code})"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        data = response.json()
        key = f"ISBN:{isbn_limpio}"

        if key not in data:
            return Response(
                {"detail": "No se encontró ningún libro con este ISBN en Open Library."},
                status=status.HTTP_404_NOT_FOUND
            )

        libro_info = data[key]
        titulo = libro_info.get("title", "Título desconocido")
        autores_list = libro_info.get("authors", [])
        autor = ", ".join([a.get("name") for a in autores_list]) if autores_list else "Autor desconocido"

        portada_dict = libro_info.get("cover", {})
        portada_url = portada_dict.get("large", portada_dict.get("medium", portada_dict.get("small", None)))

        if portada_url and portada_url.startswith("http://"):
            portada_url = portada_url.replace("http://", "https://")

        return Response({
            "isbn": isbn_limpio,
            "titulo": titulo,
            "autor": autor,
            "portada_url": portada_url
        })
    except requests.exceptions.Timeout:
        return Response(
            {"detail": "Tiempo de espera agotado al conectar con Open Library."},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except requests.exceptions.RequestException as e:
        return Response(
            {"detail": f"Error de red o de comunicación: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== SCANNER HTML ====================

def scanner_view(request):
    scanner_path = os.path.join(os.path.dirname(__file__), "scanner.html")
    return FileResponse(open(scanner_path, "rb"), content_type="text/html")
