-- ============================================
-- SIGMA QA Framework - Base de Datos de Pruebas
-- PostgreSQL - Datos Seed Enmascarados
-- ============================================

-- ============================================
-- SCHEMA: Usuarios y Autenticacion
-- ============================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    rol_id INTEGER REFERENCES roles(id),
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    modulo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE rol_permisos (
    rol_id INTEGER REFERENCES roles(id),
    permiso_id INTEGER REFERENCES permisos(id),
    PRIMARY KEY (rol_id, permiso_id)
);

-- ============================================
-- SCHEMA: Datos de Negocio (Ejemplo)
-- ============================================
CREATE TABLE estados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#000000'
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT true
);

CREATE TABLE registros (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES categorias(id),
    estado_id INTEGER REFERENCES estados(id),
    usuario_creador_id INTEGER REFERENCES usuarios(id),
    usuario_asignado_id INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP
);

CREATE TABLE comentarios (
    id SERIAL PRIMARY KEY,
    registro_id INTEGER REFERENCES registros(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE archivos_adjuntos (
    id SERIAL PRIMARY KEY,
    registro_id INTEGER REFERENCES registros(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(50),
    tamanio INTEGER,
    ruta VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DATOS SEED - Roles y Permisos
-- ============================================
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin', 'Administrador del sistema'),
    ('supervisor', 'Supervisor de area'),
    ('analista', 'Analista de datos'),
    ('operador', 'Operador basico'),
    ('auditor', 'Auditor solo lectura');

INSERT INTO permisos (nombre, modulo, descripcion) VALUES
    ('crear_registro', 'registros', 'Crear nuevos registros'),
    ('editar_registro', 'registros', 'Editar registros existentes'),
    ('eliminar_registro', 'registros', 'Eliminar registros'),
    ('ver_registro', 'registros', 'Ver registros'),
    ('aprobar_registro', 'registros', 'Aprobar registros'),
    ('gestionar_usuarios', 'usuarios', 'Administrar usuarios'),
    ('ver_reportes', 'reportes', 'Ver reportes'),
    ('exportar_datos', 'reportes', 'Exportar datos'),
    ('configurar_sistema', 'config', 'Configurar sistema');

-- Admin tiene todos los permisos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 1, id FROM permisos;

-- Supervisor
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
    (2, 1), (2, 2), (2, 4), (2, 5), (2, 7), (2, 8);

-- Analista
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
    (3, 1), (3, 2), (3, 4), (3, 7), (3, 8);

-- Operador
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
    (4, 1), (4, 4);

-- Auditor
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
    (5, 4), (5, 7);

-- ============================================
-- DATOS SEED - Usuarios de Prueba (Enmascarados)
-- Password: Test123! (hash bcrypt)
-- ============================================
INSERT INTO usuarios (username, email, password_hash, nombre, apellido, rol_id) VALUES
    ('admin_test', 'admin@test.local', '$2a$10$X7UrE2JvPK5pBnGnQnHJxOKZGDYXLGCNZ1234567890abcdefghij', 'Admin', 'Sistema', 1),
    ('supervisor_test', 'supervisor@test.local', '$2a$10$X7UrE2JvPK5pBnGnQnHJxOKZGDYXLGCNZ1234567890abcdefghij', 'Maria', 'Garcia', 2),
    ('analista_test', 'analista@test.local', '$2a$10$X7UrE2JvPK5pBnGnQnHJxOKZGDYXLGCNZ1234567890abcdefghij', 'Carlos', 'Lopez', 3),
    ('operador_test', 'operador@test.local', '$2a$10$X7UrE2JvPK5pBnGnQnHJxOKZGDYXLGCNZ1234567890abcdefghij', 'Ana', 'Martinez', 4),
    ('auditor_test', 'auditor@test.local', '$2a$10$X7UrE2JvPK5pBnGnQnHJxOKZGDYXLGCNZ1234567890abcdefghij', 'Pedro', 'Sanchez', 5);

-- ============================================
-- DATOS SEED - Estados y Categorias
-- ============================================
INSERT INTO estados (nombre, color) VALUES
    ('Pendiente', '#FFA500'),
    ('En Proceso', '#0000FF'),
    ('En Revision', '#800080'),
    ('Aprobado', '#008000'),
    ('Rechazado', '#FF0000'),
    ('Cerrado', '#808080');

INSERT INTO categorias (nombre, descripcion) VALUES
    ('Incidencia', 'Reporte de incidencias'),
    ('Solicitud', 'Solicitudes de servicio'),
    ('Consulta', 'Consultas generales'),
    ('Mejora', 'Propuestas de mejora'),
    ('Error', 'Reportes de errores');

-- ============================================
-- DATOS SEED - Registros de Ejemplo
-- ============================================
INSERT INTO registros (codigo, titulo, descripcion, categoria_id, estado_id, usuario_creador_id, usuario_asignado_id) VALUES
    ('REG-001', 'Error en modulo de login', 'El usuario no puede iniciar sesion con credenciales validas', 5, 2, 4, 3),
    ('REG-002', 'Solicitud de nuevo reporte', 'Se requiere un reporte de ventas mensual', 2, 1, 4, 2),
    ('REG-003', 'Consulta sobre permisos', 'Como puedo solicitar acceso al modulo de reportes', 3, 4, 4, 2),
    ('REG-004', 'Mejora en interfaz', 'Sugerencia para mejorar la navegacion del menu', 4, 3, 3, 2),
    ('REG-005', 'Incidencia en exportacion', 'El boton de exportar PDF no funciona', 1, 2, 4, 3);

-- ============================================
-- DATOS SEED - Comentarios de Ejemplo
-- ============================================
INSERT INTO comentarios (registro_id, usuario_id, contenido) VALUES
    (1, 3, 'Estoy revisando el caso, parece ser un problema de sesion'),
    (1, 2, 'Por favor priorizar este caso'),
    (2, 2, 'Solicitud recibida, la evaluaremos en la proxima reunion'),
    (4, 2, 'Excelente sugerencia, la tomaremos en cuenta');

-- ============================================
-- INDICES para mejor rendimiento
-- ============================================
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);
CREATE INDEX idx_registros_estado ON registros(estado_id);
CREATE INDEX idx_registros_categoria ON registros(categoria_id);
CREATE INDEX idx_registros_usuario_creador ON registros(usuario_creador_id);
CREATE INDEX idx_registros_fecha ON registros(fecha_creacion);
CREATE INDEX idx_comentarios_registro ON comentarios(registro_id);

-- ============================================
-- VISTA util para tests
-- ============================================
CREATE VIEW v_registros_detalle AS
SELECT
    r.id,
    r.codigo,
    r.titulo,
    r.descripcion,
    c.nombre as categoria,
    e.nombre as estado,
    e.color as estado_color,
    uc.nombre || ' ' || uc.apellido as creador,
    ua.nombre || ' ' || ua.apellido as asignado,
    r.fecha_creacion,
    r.fecha_actualizacion
FROM registros r
LEFT JOIN categorias c ON r.categoria_id = c.id
LEFT JOIN estados e ON r.estado_id = e.id
LEFT JOIN usuarios uc ON r.usuario_creador_id = uc.id
LEFT JOIN usuarios ua ON r.usuario_asignado_id = ua.id;

-- ============================================
-- FIN
-- ============================================
