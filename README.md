# flow-audit site

Sitio estático de Flow-Audit: una landing y una vista previa del informe de auditoría.
Sin build, sin dependencias y sin JavaScript. Todo lo publicable vive en `site/`.

## Verlo

```
cd site
python3 -m http.server 8000
```

Abrir http://localhost:8000. `site/index.html` elige el idioma según el navegador.

## Estructura

| Ruta | Qué es |
|---|---|
| `site/index.html` | Selector de idioma: redirige a `es/`, `en/` o `pt/` |
| `site/{es,en,pt}/index.html` | Landing: cómo funciona, qué audita, qué entrega y en qué fase está |
| `site/{es,en,pt}/demo/index.html` | Vista previa del informe: mapa de flujo, máquina de estados, línea de tiempo y hallazgos |
| `site/data/report.json` | Mock con la forma exacta de la salida del motor (`AuditReport`), compartido por los tres idiomas |
| `site/style.css` | Sistema de diseño compartido (claro/oscuro, tarjetas, tags) |
| `site/report.css` | Estilos del informe y de los SVG |
| `site/favicon.svg` | Marca |
| `.github/workflows/pages.yml` | Publica `site/` en GitHub Pages en cada push a `main` |

## El mock

`site/data/report.json` es el contrato: `generatedAt`, `runHash`, `config`,
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

Español, inglés y portugués: una copia por idioma en `es/`, `en/` y `pt/`, sin generador. Las tres
copias tienen la misma estructura y los mismos enlaces relativos; el selector de la cabecera apunta a la misma
página en cada idioma. Al editar un texto, cambia las tres. `report.json` sigue en español.

## Redacción

Los textos siguen ASD-STE100 e ISO 24495-1: voz activa, una idea por frase, máximo 20 palabras, un término por
concepto (pedido, sistema, hallazgo, reintento). La landing explica el producto en tres bloques: concepto core,
analogía física y mecánica técnica.

## Estilo y fuentes

Estilo Kanagawa: Wave en sistemas oscuros y Lotus en los claros; `data-theme="light"` o `"dark"`
en `<html>` lo fuerza. Esquinas de 2 px, márgenes amplios y ritmo vertical generoso.

| Uso | Fuente | Licencia |
|---|---|---|
| Títulos y cifras de los KPI | P052 (clon libre de Palatino), en `site/fonts/p052/` | AGPL-3.0 con excepción para incrustar la fuente en documentos |
| Texto, etiquetas y gráficos | Source Sans 3, en `site/fonts/source-sans-3/` | OFL 1.1 |
| `code` y `pre` | La monoespaciada del sistema | — |

Cada carpeta lleva su licencia y su `SOURCE.md`. El informe real será un solo archivo sin fuentes externas
(`core/AGENTS.md`): cuando exista el renderizador, tendrá que incrustar estas fuentes en el propio HTML.
