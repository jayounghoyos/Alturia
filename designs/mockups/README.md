# Mockups Funcionales — Asistente virtual Asis Altura

Entregable del **Sprint 0**: mockups funcionales que muestran las pantallas a desarrollar y el
flujo de información entre ellas.

- **Archivo fuente:** [`../Alturia-Mockups.pen`](../Alturia-Mockups.pen) (editor [pen.dev](https://pen.dev))
- **Presentación:** [`Alturia-Mockups-Funcionales.pdf`](./Alturia-Mockups-Funcionales.pdf) — 14 páginas, una por pantalla
- **Vista completa:** [`Alturia-Mockups-Completo.png`](./Alturia-Mockups-Completo.png) — todas las pantallas en una sola imagen (4188 × 7553), agrupadas por flujo
- **Imágenes individuales:** los 14 `.png` de esta carpeta (exportados a 2×)

> Para presentar usa el PDF (una pantalla por diapositiva); para la wiki o para ver el conjunto
> de un vistazo, usa la imagen completa.

Cada pantalla incluye al pie una nota **«Flujo de información»** que documenta la entrada del
usuario, la llamada al backend y la salida que devuelve el sistema.

---

## Alcance

Cubre el MVP definido en el Sprint 1: widget web de chat. **No** incluye pasarela de pagos,
integración con la API de WhatsApp ni panel administrativo — todo ello queda explícitamente
fuera del alcance inicial según la Visión del proyecto.

---

## Índice de pantallas

### Contexto

| # | Pantalla | Propósito |
|---|---|---|
| 00 | `00-portada.png` | Portada: equipo, alcance y contenido de la presentación |
| 01 | `01-mapa-de-flujo.png` | Mapa de flujo de información: recorrido completo + capa técnica (widget → controlador/NLP → API → BD) |

### Entrada

| # | Pantalla | Flujo de información |
|---|---|---|
| 02 | `02-landing-widget.png` | El widget vive embebido en `asisaltura.com`, colapsado en la esquina inferior derecha |
| 03 | `03-menu-principal.png` | El controlador carga el menú sin consultar la BD → 4 intenciones disponibles |

### Flujo A — Consulta de certificado (HU-01)

| # | Pantalla | Flujo de información |
|---|---|---|
| A1 | `A1-solicitud-cedula.png` | Entrada: cédula (8–10 dígitos), validada en el cliente → `GET /api/certificados/{cedula}` |
| A2 | `A2-certificado-vigente.png` | Salida: `{ estado: "VIGENTE", fechaVencimiento }`. **Sin datos personales** (RNF de seguridad) |
| A3 | `A3-certificado-vencido.png` | Salida: `{ estado: "VENCIDO", fechaVencimiento }` → enlaza con el flujo de agendamiento (B1) |
| A4 | `A4-documento-no-encontrado.png` | Salida: `404` → mensaje amigable; rutas alternas: reintento (A1) o asesor (D1) |

### Flujo B — Agendamiento de curso

| # | Pantalla | Flujo de información |
|---|---|---|
| B1 | `B1-seleccion-de-curso.png` | `GET /api/cursos` → programas activos; guarda `cursoId` en el contexto |
| B2 | `B2-fecha-y-hora.png` | `GET /api/disponibilidad` → `{ fecha, hora, cuposDisponibles }`; sin cupo = deshabilitado |
| B3 | `B3-datos-de-contacto.png` | `POST /api/usuarios` + `POST /api/citas` — cubre «registrar nuevos usuarios» |
| B4 | `B4-confirmacion.png` | Salida: `{ codigoReserva, cursoId, fecha, hora, sede }`; cita en estado `CONFIRMADA` |

### Flujos C y D

| # | Pantalla | Flujo de información |
|---|---|---|
| C1 | `C1-preguntas-frecuentes.png` | El motor NLP clasifica la intención; si la confianza es baja, ofrece escalar a D1 |
| D1 | `D1-escalamiento-asesor.png` | `POST /api/escalamientos` → ticket con el historial de la conversación |

---

## Trazabilidad con los requisitos del Sprint 0

| Requisito funcional | Pantallas |
|---|---|
| Consultar la vigencia de un certificado por cédula (HU-01) | A1, A2, A3, A4 |
| Agendar citas mostrando fechas y horas disponibles | B1, B2, B4 |
| Registrar nuevos usuarios capturando información básica | B3 |
| Escalar la conversación a un asesor humano | D1 (y rutas de salida desde A4 y C1) |
| Responder preguntas frecuentes de forma automática | C1 |

### Requisitos no funcionales reflejados en el diseño

- **Seguridad:** A2 y A3 muestran únicamente estado binario + fecha de vencimiento; nunca datos
  personales del trabajador.
- **Tiempo de respuesta (< 2 s):** documentado en la nota de flujo de A1.
- **Disponibilidad 24/7:** comunicada en el saludo (03) y en el manejo de horario fuera de
  jornada (D1).
- **Tratamiento de datos:** B3 incluye la autorización explícita (Ley 1581 de 2012).

---

## Sistema de diseño

Definido como variables dentro del `.pen`, de modo que un cambio de token se propaga a todas las
pantallas.

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#16233A` | Burbujas del usuario, botones oscuros, cabeceras |
| `accent` | `#FF6B2C` | Acción principal y códigos de pantalla |
| `bubble` | `#F4F5F7` | Burbujas del bot |
| `ok` / `warn` / `danger` | `#16A34A` / `#B45309` / `#DC2626` | Estados de certificación |
| `ink` / `muted` / `faint` | `#0B0F14` / `#6B7280` / `#9AA1AC` | Jerarquía tipográfica |
| `font` | Plus Jakarta Sans | Tipografía única |

Componentes reutilizables en el archivo: `C/ Widget Chrome`, `C/ Mensaje Bot`,
`C/ Mensaje Usuario`, `C/ Opción`, `C/ Badge Estado`, `C/ Botón Primario`, `C/ Nota de flujo`.
