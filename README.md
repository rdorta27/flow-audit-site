# flow-audit site

Sitio estático de Flow Audit: una landing y una vista previa del informe de auditoría.
Sin build ni dependencias. Todo lo publicable vive en `site/`.

## Verlo

```
cd site
python3 -m http.server 8000
```

Abrir http://localhost:8000. `site/lang.js` decide el idioma antes del primer pintado y redirige
con los enlaces del selector. La elección manual se conserva y manda sobre el navegador.

## Estructura

| Ruta | Qué es |
|---|---|
| `site/index.html` | Portada de entrada: selector de idioma; `lang.js` la envía a la landing |
| `site/lang.js` | Decide el idioma, guarda la elección y redirige usando los enlaces del selector |
| `site/{es,en,pt}/index.html` | Landing: cómo funciona, qué audita, qué entrega y en qué milestone está |
| `site/{es,en,pt}/architecture/index.html` | Arquitectura: el pipeline, los seis componentes con lo que existe hoy, la mecánica técnica y la fórmula de impacto |
| `site/{es,en,pt}/demo/index.html` | Vista previa del informe: mapa de flujo, máquina de estados, línea de tiempo y hallazgos |
| `site/data/report.json` | Mock con la forma exacta de la salida del motor (`AuditReport`), compartido por los tres idiomas |
| `site/style.css` | Sistema de diseño compartido (claro/oscuro, tarjetas, tags) |
| `site/report.css` | Estilos del informe y de los SVG |
| `site/favicon.svg` | Marca |
| `.github/workflows/pages.yml` | Publica `site/` en GitHub Pages en cada push a `main` |

## El mock

`site/data/report.json` es el contrato: `generatedAt`, `runHash`, `config`,
`findings[]` y `journeys[]`, con los mismos campos que el puerto `ReportRenderer`. Los
números salen del dataset sintético y de sus tasas de impacto.

El HTML repite esos números a mano. Cuando exista el renderer (M4-03) reemplaza la página
por el informe generado; el diseño no cambia.

## Estado

**Versión 0.1.0.** El sitio está en construcción: el demo es un mock y no hay motor detrás.
El plan del motor está en `../specs/flow-audit_BACKLOG.md` (milestones M0–M5). El sitio se
reemplaza por el informe generado en M5-04. Las tarjetas «Ahora» de las tres landings
resumen M0: bss-oss-rust se probó en local y su contrato no basta; la fuente de la demo
será un servicio TMF propio sobre el dataset sintético, marcado como simulado. Contrástalas
con el backlog antes de cambiarlas.

## Versiones

`core` fija los números (semver). Este repo lleva un tag solo cuando publica esa misma versión
de `core`, con el mismo número. Los arreglos que solo tocan el sitio no llevan tag: Pages
publica en cada push. Los dos repos empiezan alineados en `0.1.0`.

## Publicación

GitHub Pages publica `site/` como artefacto desde `.github/workflows/pages.yml` en cada
push a `main` que lo toque. URL: https://rdorta27.github.io/flow-audit-site/

## Idiomas

Español, inglés y portugués. El motor y su informe salen solo en inglés en esta versión; su versión multiidioma es L-01 del backlog. En el sitio: una copia por idioma en `es/`, `en/` y `pt/`, sin generador. Las tres
copias tienen la misma estructura y los mismos enlaces relativos; el selector de la cabecera apunta a la misma
página en cada idioma. Al editar un texto, cambia las tres. `report.json` sigue en español.

El idioma se decide en `site/lang.js`, que se carga en las seis páginas de idioma y en la portada de
entrada. La prioridad, de mayor a menor, es esta:

1. **Elección guardada.** Al pulsar ES, EN o PT, el idioma se guarda en `localStorage` bajo
   `flow-audit-lang`. Si existe, manda siempre.
2. **Idioma del navegador.** Solo se usa si no hay elección guardada y la página es inglesa (la
   portada de entrada lo es). Toma el primer idioma de `navigator.languages` que sea `en`, `es` o `pt`;
   `pt` va a `pt-BR`. Si ninguno coincide, inglés.
3. **Página donde se aterriza.** Sin elección guardada, `/es/` y `/pt/` se quedan en su idioma.

El script compara el idioma deseado con el de `<html lang>`. Si difieren, oculta la página un instante.
Cuando el HTML está listo, busca `a[hreflang=...]` en el selector y salta a esa URL con el mismo
`?query` y el mismo `#ancla`; si no encuentra el enlace, muestra la página. Los enlaces del selector
definen el destino, así que no hay tabla de rutas: funciona igual en la landing y en el demo. Las
etiquetas `<link rel="alternate" hreflang>` del `<head>` no intervienen; son para los buscadores.
La portada lleva `data-lang-entry`; por eso siempre salta a una landing, incluso si el navegador ya es inglés.

Sin JavaScript, o con `localStorage` bloqueado, los botones del selector siguen funcionando. Solo se
pierde la detección y la memoria. `pt-PT` va a la versión brasileña, la única que existe. La memoria es
por navegador y por dispositivo, no por cuenta.

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

## Licencia

El código del sitio es MIT: ver [`LICENSE`](LICENSE). La marca y el logo no entran en la
cesión ([`TRADEMARKS.md`](TRADEMARKS.md)).

Lo que el motor lee no es MIT y no se distribuye aquí: los sistemas de prueba se leen por
HTTP y conservan su licencia. [`THIRD-PARTY.md`](THIRD-PARTY.md) separa lo que viaja con
este repositorio (las dos fuentes) de lo que solo se usa para probar.

La página de arquitectura de cada idioma lleva un bloque con estos componentes. Si añades
un sistema, una fuente o un aviso, cámbialo en los tres idiomas.

## Componentes

La sección «Componentes» de las tres páginas de arquitectura describe `core/src/`: las seis
capas (`domain/`, `ports/`, `adapters/`, `app/`, `cli/`, `dataset/`) y qué existe hoy en
cada una. Si cambia el árbol de `core/src/`, cambian las tres páginas y este README. Las
cifras de «Qué se ejecuta hoy» salen de `deno task check`, `deno task test`, `deno task
audit` y `deno task dataset`; no se copian del README de `core` sin comprobarlas.
