import os
import requests
from datetime import date, timedelta
from django.http import HttpResponse, FileResponse, JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from app.models import Libro, Usuario, Prestamo
from app.serializers import LibroSerializer, UsuarioSerializer, PrestamoSerializer


def root(request):
    """
    Sirve el frontend interactivo de la biblioteca si se accede desde un navegador web.
    Si se solicita explícitamente application/json (p. ej. scripts o cURL), devuelve la info JSON.
    """
    accept = request.headers.get('Accept', '')
    if 'application/json' in accept and 'text/html' not in accept:
        return JsonResponse({
            "mensaje": "API de biblioteca con Django y Django REST Framework funcionando.",
            "admin": "/admin/",
            "scanner": "/scanner",
            "endpoints": ["/libros/", "/usuarios/", "/prestamos/", "/open-library/<isbn>"]
        })

    # 1. Servir app/index.html (incluido dentro del repositorio y Docker sin requerir npm build)
    app_index = os.path.join(os.path.dirname(__file__), 'index.html')
    if os.path.exists(app_index):
        return FileResponse(open(app_index, 'rb'), content_type='text/html')

    # 2. Servir dist/index.html si fue compilado con Vite
    dist_index = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dist', 'index.html')
    if os.path.exists(dist_index):
        return FileResponse(open(dist_index, 'rb'), content_type='text/html')

    return JsonResponse({
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
    Consulta la API pública de Open Library usando el ISBN.
    Utiliza el endpoint moderno de búsqueda y respaldo canónico para garantizar disponibilidad.
    """
    isbn_limpio = isbn.replace("-", "").replace(" ", "").strip()
    if not isbn_limpio:
        return Response(
            {"detail": "El código ISBN no puede estar vacío."},
            status=status.HTTP_400_BAD_REQUEST
        )

    headers = {'User-Agent': 'BibliotecaGestion/1.0 (admin@biblioteca.local)'}

    # 1. Búsqueda por search.json
    try:
        search_url = f"https://openlibrary.org/search.json?isbn={isbn_limpio}&limit=1"
        response = requests.get(search_url, headers=headers, timeout=6)
        if response.status_code == 200:
            data = response.json()
            docs = data.get("docs", [])
            if docs:
                doc = docs[0]
                titulo = doc.get("title", "Título desconocido")
                autores_list = doc.get("author_name", [])
                autor = ", ".join(autores_list) if autores_list else doc.get("by_statement", "Autor desconocido")
                cover_i = doc.get("cover_i")
                portada_url = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else f"https://covers.openlibrary.org/b/isbn/{isbn_limpio}-M.jpg"

                return Response({
                    "isbn": isbn_limpio,
                    "titulo": titulo,
                    "autor": autor,
                    "portada_url": portada_url
                })
    except requests.exceptions.Timeout:
        pass
    except requests.exceptions.RequestException:
        pass

    # 2. Respaldo por endpoint directo de ISBN
    try:
        direct_url = f"https://openlibrary.org/isbn/{isbn_limpio}.json"
        response = requests.get(direct_url, headers=headers, timeout=6, allow_redirects=True)
        if response.status_code == 200:
            book = response.json()
            titulo = book.get("title", "Título desconocido")
            autor = book.get("by_statement", "Autor desconocido")
            covers = book.get("covers", [])
            portada_url = f"https://covers.openlibrary.org/b/id/{covers[0]}-M.jpg" if covers else f"https://covers.openlibrary.org/b/isbn/{isbn_limpio}-M.jpg"

            return Response({
                "isbn": isbn_limpio,
                "titulo": titulo,
                "autor": autor,
                "portada_url": portada_url
            })
        elif response.status_code == 404:
            return Response(
                {"detail": f"No se encontró ningún libro con el ISBN {isbn_limpio} en Open Library."},
                status=status.HTTP_404_NOT_FOUND
            )
    except requests.exceptions.Timeout:
        return Response(
            {"detail": "Tiempo de espera agotado al conectar con Open Library."},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except requests.exceptions.RequestException as e:
        return Response(
            {"detail": f"Error de red o comunicación: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {"detail": f"No se encontró ningún libro con el ISBN {isbn_limpio} en Open Library."},
        status=status.HTTP_404_NOT_FOUND
    )


# ==================== SCANNER HTML ====================

def scanner_view(request):
    scanner_path = os.path.join(os.path.dirname(__file__), "scanner.html")
    return FileResponse(open(scanner_path, "rb"), content_type="text/html")
