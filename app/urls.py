import os
from django.conf import settings
from django.urls import path, re_path
from django.views.static import serve
from app import views

urlpatterns = [
    path('', views.root, name='root'),

    # Static assets for frontend
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'dist', 'assets')
    }),

    # Autenticación
    re_path(r'^(?:api/)?auth/login/?$', views.auth_login, name='auth_login'),
    re_path(r'^(?:api/)?auth/register/?$', views.auth_register, name='auth_register'),

    # Libros
    re_path(r'^(?:api/)?libros/?$', views.libros_list, name='libros_list'),
    re_path(r'^(?:api/)?libros/(?P<pk>\d+)/?$', views.libro_detail, name='libro_detail'),

    # Usuarios
    re_path(r'^(?:api/)?usuarios/?$', views.usuarios_list, name='usuarios_list'),
    re_path(r'^(?:api/)?usuarios/(?P<pk>\d+)/?$', views.usuario_detail, name='usuario_detail'),

    # Préstamos
    re_path(r'^(?:api/)?prestamos/?$', views.prestamos_list, name='prestamos_list'),
    re_path(r'^(?:api/)?prestamos/(?P<pk>\d+)/?$', views.devolver_prestamo, name='prestamo_detail_action'),
    re_path(r'^(?:api/)?prestamos/(?P<pk>\d+)/devolver/?$', views.devolver_prestamo, name='devolver_prestamo'),

    # Sistema / PostgreSQL & Dependencias / Pruebas
    re_path(r'^(?:api/)?sistema/db-inspector/?$', views.sistema_db_inspector, name='sistema_db_inspector'),
    re_path(r'^(?:api/)?sistema/run-tests/?$', views.sistema_run_tests, name='sistema_run_tests'),

    # Open Library
    re_path(r'^(?:api/)?open-library/(?P<isbn>[^/]+)/?$', views.buscar_en_open_library, name='open_library'),

    # Scanner HTML page
    re_path(r'^scanner/?$', views.scanner_view, name='scanner_view'),
]
