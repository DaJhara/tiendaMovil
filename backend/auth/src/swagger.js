// Especificación OpenAPI 3 del servicio de autenticación (se sirve en /docs y /docs.json)
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Tienda · Autenticación',
    version: '1.0.0',
    description: 'Registro e inicio de sesión de usuarios. Emite JWT que los demás servicios validan con el mismo JWT_SECRET.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Auth' }, { name: 'Sistema' }],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar usuario',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
        },
        responses: {
          201: { description: 'Usuario creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { $ref: '#/components/responses/Error' },
          409: { description: 'El correo ya está registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión y obtener JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: { description: 'Sesión iniciada', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResult' } } } },
          401: { description: 'Credenciales incorrectas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Validar token y obtener el usuario actual',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Usuario del token', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/health': {
      get: { tags: ['Sistema'], summary: 'Estado del servicio y de la base de datos', responses: { 200: { description: 'OK' }, 503: { description: 'Sin base de datos' } } },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    responses: {
      Error: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string', example: 'Mensaje de error' } } },
      User: {
        type: 'object',
        properties: { id: { type: 'integer', example: 1 }, nombre: { type: 'string', example: 'Usuario Demo' }, email: { type: 'string', example: 'demo@tienda.com' } },
      },
      RegisterInput: {
        type: 'object',
        required: ['nombre', 'email', 'password'],
        properties: {
          nombre: { type: 'string', example: 'Ana Pérez' },
          email: { type: 'string', format: 'email', example: 'ana@correo.com' },
          password: { type: 'string', minLength: 6, example: '123456' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email', example: 'demo@tienda.com' }, password: { type: 'string', example: '123456' } },
      },
      LoginResult: {
        type: 'object',
        properties: { token: { type: 'string', description: 'JWT para el header Authorization: Bearer <token>' }, user: { $ref: '#/components/schemas/User' } },
      },
    },
  },
};
