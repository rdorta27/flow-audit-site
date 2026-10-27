# flow-audit site

Sitio estático de Flow-Audit: una landing y una vista previa del informe de auditoría.
Sin build, sin dependencias y sin JavaScript. Todo lo publicable vive en `site/`.

## Verlo

```
cd site
python3 -m http.server 8000
```

Abrir http://localhost:8000. También funciona abriendo `site/index.html` directo, salvo
`report.json`, que el demo enlaza y necesita el servidor.

## Estructura

| Ruta | Qué es |
|---|---|
| `site/index.html` | Landing: qué audita, qué entrega y en qué fase está |
| `site/demo/index.html` | Vista previa del informe: mapa de flujo, máquina de estados, línea de tiempo y hallazgos |
| `site/demo/data/report.json` | Mock con la forma exacta de la salida del motor (`AuditReport`) |
| `site/style.css` | Sistema de diseño compartido (claro/oscuro, tarjetas, tags) |
| `site/report.css` | Estilos del informe y de los SVG |
| `site/favicon.svg` | Marca |
| `.github/workflows/pages.yml` | Publica `site/` en GitHub Pages en cada push a `main` |

## El mock

`site/demo/data/report.json` es el contrato: `generatedAt`, `runHash`, `config`,
`findings[]` y `journeys[]`, con los mismos campos que el puerto `ReportRenderer`. Los
números salen del dataset sintético de la fase 2 y de sus tasas de impacto.

El HTML repite esos números a mano. Cuando exista el renderer (fase 6) reemplaza la página
por el informe generado; el diseño no cambia.

## Estado

**Fase 3 de 6, completa.** El sitio está en construcción: el demo es un mock y no hay motor
detrás. Faltan ingesta (4), reglas e impacto (5) y el informe generado (6).

## Publicación

GitHub Pages publica `site/` como artefacto desde `.github/workflows/pages.yml` en cada
push a `main` que lo toque. URL: https://rdorta27.github.io/flow-audit-site/

## Idiomas

Por ahora solo español. La convención de la familia es una copia por idioma en carpetas
(`es/`, `en/`) sin generador; el espejo en inglés queda para la fase 6.
