from django.urls import path, re_path
from app import views

urlpatterns = [
    path('', views.root, name='root'),
    
    # Libros
    re_path(r'^libros/?$', views.libros_list, name='libros_list'),
    re_path(r'^libros/(?P<pk>\d+)/?$', views.libro_detail, name='libro_detail'),

    # Usuarios
    re_path(r'^usuarios/?$', views.usuarios_list, name='usuarios_list'),

    # Prestamos
    re_path(r'^prestamos/?$', views.prestamos_list, name='prestamos_list'),
    re_path(r'^prestamos/(?P<pk>\d+)/devolver/?$', views.devolver_prestamo, name='devolver_prestamo'),

    # Open Library
    re_path(r'^open-library/(?P<isbn>[^/]+)/?$', views.buscar_en_open_library, name='open_library'),

    # Scanner HTML page
    re_path(r'^scanner/?$', views.scanner_view, name='scanner_view'),
]
