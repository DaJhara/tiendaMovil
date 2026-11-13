// Especificación OpenAPI 3 del servicio de productos (se sirve en /docs y /docs.json)
const json = (schema) => ({ 'application/json': { schema } });
const idParam = { in: 'path', name: 'id', required: true, schema: { type: 'integer', minimum: 1 } };
const secured = [{ bearerAuth: [] }];
const err = (description) => ({ description, content: json({ $ref: '#/components/schemas/Error' }) });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Tienda · Productos',
    version: '1.0.0',
    description:
      'CRUD de productos e inventario. La lectura es pública; crear, editar, borrar y ajustar stock requieren JWT (obtenido en el servicio auth). Las imágenes se sirven en /images/<archivo>.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Productos' }, { name: 'Inventario' }, { name: 'Sistema' }],
  paths: {
    '/api/productos': {
      get: {
        tags: ['Productos'],
        summary: 'Listar productos',
        parameters: [{ in: 'query', name: 'q', schema: { type: 'string' }, description: 'Filtra por nombre (contiene)' }],
        responses: { 200: { description: 'Lista de productos', content: json({ type: 'array', items: { $ref: '#/components/schemas/Producto' } }) } },
      },
      post: {
        tags: ['Productos'],
        summary: 'Crear producto',
        security: secured,
        requestBody: { required: true, content: json({ $ref: '#/components/schemas/ProductoInput' }) },
        responses: { 201: { description: 'Creado', content: json({ $ref: '#/components/schemas/Producto' }) }, 400: err('Datos inválidos'), 401: err('Sin autenticación') },
      },
    },
    '/api/productos/{id}': {
      get: {
        tags: ['Productos'],
        summary: 'Consultar producto',
        parameters: [idParam],
        responses: { 200: { description: 'Producto', content: json({ $ref: '#/components/schemas/Producto' }) }, 404: err('No existe') },
      },
      put: {
        tags: ['Productos'],
        summary: 'Actualizar producto',
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, content: json({ $ref: '#/components/schemas/ProductoInput' }) },
        responses: { 200: { description: 'Actualizado', content: json({ $ref: '#/components/schemas/Producto' }) }, 400: err('Datos inválidos'), 401: err('Sin autenticación'), 404: err('No existe') },
      },
      delete: {
        tags: ['Productos'],
        summary: 'Eliminar producto',
        security: secured,
        parameters: [idParam],
        responses: { 204: { description: 'Eliminado' }, 401: err('Sin autenticación'), 404: err('No existe') },
      },
    },
    '/api/productos/{id}/stock': {
      patch: {
        tags: ['Inventario'],
        summary: 'Actualizar inventario (valor absoluto o ajuste relativo)',
        security: secured,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StockInput' },
              examples: { absoluto: { value: { stock: 50 } }, relativo: { value: { delta: -3 } } },
            },
          },
        },
        responses: { 200: { description: 'Producto con el stock actualizado', content: json({ $ref: '#/components/schemas/Producto' }) }, 400: err('Datos inválidos'), 404: err('No existe'), 409: err('El stock quedaría negativo') },
      },
    },
    '/health': { get: { tags: ['Sistema'], summary: 'Estado del servicio y de la base de datos', responses: { 200: { description: 'OK' }, 503: { description: 'Sin base de datos' } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Producto: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Audífonos Bluetooth' },
          descripcion: { type: 'string', example: 'Audífonos inalámbricos con micrófono' },
          precio: { type: 'number', example: 79900 },
          imagen: { type: 'string', example: '/images/audifonos.png' },
          stock: { type: 'integer', example: 25 },
        },
      },
      ProductoInput: {
        type: 'object',
        required: ['nombre', 'precio'],
        properties: {
          nombre: { type: 'string', example: 'Webcam HD' },
          descripcion: { type: 'string', example: 'Cámara 1080p' },
          precio: { type: 'number', minimum: 0, example: 99900 },
          stock: { type: 'integer', minimum: 0, example: 20 },
          imagen: { type: 'string', description: 'URL http(s) o /images/archivo.png (opcional)', example: '' },
        },
      },
      StockInput: {
        type: 'object',
        description: 'Envía "stock" (valor absoluto) o "delta" (suma/resta)',
        properties: { stock: { type: 'integer', minimum: 0 }, delta: { type: 'integer' } },
      },
    },
  },
};
