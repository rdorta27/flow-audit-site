# flow-audit site

Sitio estático de Flow-Audit: una landing y una vista previa del informe de auditoría.
Sin build, sin dependencias y sin JavaScript: todo lo publicable vive en este repo.

## Verlo

```
cd site
python3 -m http.server 8000
```

Abrir http://localhost:8000. También funciona abriendo `index.html` directo, salvo el
`report.json` del demo, que necesita el servidor.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | Landing: qué audita, qué entrega y en qué fase está |
| `demo/index.html` | Vista previa del informe: mapa de flujo, máquina de estados, línea de tiempo y hallazgos |
| `demo/data/report.json` | Mock con la forma exacta de la salida del motor (`AuditReport`) |
| `style.css` | Sistema de diseño compartido (claro/oscuro, tarjetas, tags) |
| `report.css` | Estilos del informe y de los SVG |
| `favicon.svg` | Marca |

## El mock

`demo/data/report.json` es el contrato: `generatedAt`, `runHash`, `config`, `findings[]` y
`journeys[]`, con los mismos campos que el puerto `ReportRenderer`. Los números salen del
dataset sintético de la fase 2 y de sus tasas de impacto.

El HTML repite esos números a mano. Cuando exista el renderer (fase 6) reemplaza la página
por el informe generado; el diseño no cambia.

## Estado

**Fase 3 de 6, completa.** El sitio está en construcción: el demo es un mock y no hay motor
detrás. Faltan ingesta (4), reglas e impacto (5) y el informe generado (6).

## Idiomas y publicación

Pendiente. La convención de la familia es una copia por idioma en carpetas (`es/`, `en/`)
sin generador, y publicar con GitHub Pages desde un workflow. Todavía no hay remoto.
