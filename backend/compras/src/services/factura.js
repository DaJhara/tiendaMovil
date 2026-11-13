const PDFDocument = require('pdfkit');

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => cop.format(Number(n)).replace(/\u00a0/g, ' ');

const INK = '#0f172a';
const MUTED = '#64748b';
const BRAND = '#4f46e5';

// Dibuja la factura en `stream` (por ejemplo, la respuesta HTTP).
function generarFactura(compra, items, stream) {
  const numero = `FAC-${String(compra.id).padStart(6, '0')}`;
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Factura ${numero}`, Author: process.env.EMPRESA_NOMBRE || 'Tienda Móvil' } });
  doc.pipe(stream);

  // Encabezado
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(22).text(process.env.EMPRESA_NOMBRE || 'Tienda Móvil', 50, 50);
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(`NIT ${process.env.EMPRESA_NIT || '900.000.000-0'}`, 50, 78);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text('FACTURA', 350, 50, { width: 195, align: 'right' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(11).text(numero, 350, 76, { width: 195, align: 'right' });
  doc.moveTo(50, 105).lineTo(545, 105).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // Datos de la compra
  const fecha = new Date(compra.created_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' });
  doc.fillColor(MUTED).fontSize(9).text('CLIENTE', 50, 120).text('FECHA', 260, 120).text('REFERENCIA', 420, 120);
  doc.fillColor(INK).fontSize(11).text(compra.cliente, 50, 134, { width: 200 }).text(fecha, 260, 134, { width: 150 }).text(String(compra.client_id).slice(0, 8).toUpperCase(), 420, 134);

  // Tabla
  let y = 185;
  const header = () => {
    doc.rect(50, y, 495, 24).fill('#f1f5f9');
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(9);
    doc.text('PRODUCTO', 58, y + 8, { width: 270 }).text('CANT.', 330, y + 8, { width: 40, align: 'right' });
    doc.text('PRECIO', 380, y + 8, { width: 75, align: 'right' }).text('SUBTOTAL', 460, y + 8, { width: 78, align: 'right' });
    y += 30;
  };
  header();
  doc.font('Helvetica').fontSize(10.5);
  for (const it of items) {
    if (y > 700) {
      doc.addPage();
      y = 50;
      header();
      doc.font('Helvetica').fontSize(10.5);
    }
    const precio = Number(it.precio);
    doc.fillColor(INK).text(it.nombre, 58, y, { width: 265, height: 16, ellipsis: true });
    doc.text(String(it.cantidad), 330, y, { width: 40, align: 'right' });
    doc.text(money(precio), 380, y, { width: 75, align: 'right' });
    doc.text(money(precio * it.cantidad), 460, y, { width: 78, align: 'right' });
    y += 24;
    doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#f1f5f9').stroke();
  }

  // Total
  if (y > 690) {
    doc.addPage();
    y = 50;
  }
  y += 10;
  doc.rect(330, y, 215, 40).fill(BRAND);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('TOTAL', 342, y + 14);
  doc.fontSize(15).text(money(compra.total), 380, y + 11, { width: 156, align: 'right' });

  // Pie (sin margen inferior para que pdfkit no cree una página en blanco)
  doc.page.margins.bottom = 0;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(
    'Documento generado automáticamente. Esta versión no procesa pagos (sin pasarela de pagos) y no tiene validez fiscal.',
    50, 790, { width: 495, align: 'center' }
  );
  doc.end();
}

module.exports = { generarFactura };
