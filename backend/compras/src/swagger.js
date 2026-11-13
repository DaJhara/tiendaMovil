// Especificación OpenAPI 3 del servicio de compras y facturación (se sirve en /docs y /docs.json)
const json = (schema) => ({ 'application/json': { schema } });
const idParam = { in: 'path', name: 'id', required: true, schema: { type: 'integer', minimum: 1 } };
const secured = [{ bearerAuth: [] }];
const err = (description) => ({ description, content: json({ $ref: '#/components/schemas/Error' }) });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Tienda · Compras y facturación',
    version: '1.0.0',
    description:
      'Registro de compras (idempotente por clientId, con descuento atómico de inventario) y generación de facturas en PDF. Todas las rutas requieren JWT. No incluye pasarela de pagos.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Compras' }, { name: 'Facturas' }, { name: 'Sistema' }],
  paths: {
    '/api/compras': {
      post: {
        tags: ['Compras'],
        summary: 'Registrar compra (idempotente)',
        description:
          'El celular genera un UUID (clientId) por compra. Si la misma compra se reenvía (reintento tras perder conexión) se devuelve la ya registrada con 200 y `repetida: true`, sin duplicar ni volver a descontar stock.',
        security: secured,
        requestBody: { required: true, content: json({ $ref: '#/components/schemas/CompraInput' }) },
        responses: {
          201: { description: 'Compra creada', content: json({ $ref: '#/components/schemas/CompraResultado' }) },
          200: { description: 'Compra ya registrada anteriormente', content: json({ $ref: '#/components/schemas/CompraResultado' }) },
          400: err('Datos inválidos'),
          401: err('Sin autenticación'),
          404: err('Producto inexistente'),
          409: err('Stock insuficiente'),
        },
      },
      get: {
        tags: ['Compras'],
        summary: 'Historial de compras del usuario (con detalle)',
        security: secured,
        responses: { 200: { description: 'Compras', content: json({ type: 'array', items: { $ref: '#/components/schemas/CompraConItems' } }) }, 401: err('Sin autenticación') },
      },
    },
    '/api/compras/{id}': {
      get: {
        tags: ['Compras'],
        summary: 'Consultar una compra',
        security: secured,
        parameters: [idParam],
        responses: { 200: { description: 'Compra', content: json({ $ref: '#/components/schemas/CompraResultado' }) }, 404: err('No existe') },
      },
    },
    '/api/compras/{id}/factura': {
      get: {
        tags: ['Facturas'],
        summary: 'Descargar factura en PDF',
        security: secured,
        parameters: [idParam],
        responses: { 200: { description: 'PDF', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } }, 401: err('Sin autenticación'), 404: err('No existe') },
      },
    },
    '/health': { get: { tags: ['Sistema'], summary: 'Estado del servicio y de la base de datos', responses: { 200: { description: 'OK' }, 503: { description: 'Sin base de datos' } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      CompraInput: {
        type: 'object',
        required: ['clientId', 'items'],
        properties: {
          clientId: { type: 'string', format: 'uuid', example: '3f2b8c1e-6a0e-4d3b-9d57-1f0c2a7e9b11' },
          cliente: { type: 'string', example: 'Usuario Demo' },
          items: {
            type: 'array',
            items: { type: 'object', required: ['productoId', 'cantidad'], properties: { productoId: { type: 'integer', example: 1 }, cantidad: { type: 'integer', minimum: 1, maximum: 99, example: 2 } } },
          },
        },
      },
      Compra: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          client_id: { type: 'string', format: 'uuid' },
          cliente: { type: 'string' },
          total: { type: 'number', example: 125800 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Item: {
        type: 'object',
        properties: { productoId: { type: 'integer' }, nombre: { type: 'string' }, precio: { type: 'number' }, cantidad: { type: 'integer' } },
      },
      CompraResultado: {
        type: 'object',
        properties: { compra: { $ref: '#/components/schemas/Compra' }, items: { type: 'array', items: { $ref: '#/components/schemas/Item' } }, repetida: { type: 'boolean' } },
      },
      CompraConItems: {
        allOf: [{ $ref: '#/components/schemas/Compra' }, { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Item' } } } }],
      },
    },
  },
};
