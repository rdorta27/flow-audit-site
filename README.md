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
| `site/{es,en,pt}/{systems,status,help}/index.html` | Sistemas (vista completa y qué pedir al cliente), Estado (qué se construye; real / simulado / falta) y Ayuda (preguntas frecuentes y glosario `#g-…`) |
| `site/legacy.js` | Redirige los anclajes viejos de la landing (`#que`, `#estado`, `#faq`, `#glosario`, `#g-…`) a su página nueva |
| `site/{es,en,pt}/architecture/index.html` | Arquitectura: el pipeline, los seis componentes con lo que existe hoy, la mecánica técnica y la fórmula de impacto |
| `site/{es,en,pt}/demo/index.html` | Ejemplo de auditoría: tarjetas y supuestos leídos de `engine/findings.json` |
| `site/{es,en,pt}/present/index.html` | Presentación de cinco minutos: ocho diapositivas, teclado e impresión de una por página |
| `site/engine/findings.json` | Corrida del motor sobre los datos de demo. La página de ejemplo y el gráfico leen este archivo |
| `site/journey.js`, `site/journey.css` | El viaje en la landing. La lista estática cuenta el pedido de ejemplo; el dibujo interactivo sale de `engine/findings.json` (`journeys[].story`), con el texto de cada tipo de paso en los tres idiomas |
| `site/status.js`, `site/data/status.json` | Qué funciona hoy y qué llega después: marcas por componente y el selector Hoy / Final del plan |
| `site/style.css` | Sistema de diseño compartido (claro/oscuro, tarjetas, tags) |
| `site/report.css` | Estilos del informe y de los SVG |
| `site/favicon.svg` | Marca |
| `.github/workflows/pages.yml` | Publica `site/` en GitHub Pages en cada push a `main` |

## Cifras

La fuente de las cifras es una sola:

| Archivo | Qué es |
|---|---|
| `site/engine/findings.json` y `site/engine/report.html` | La corrida real del motor sobre los datos de demo. La página de ejemplo, el gráfico de la portada y las horas de los pasos finales del viaje leen el JSON. |

Ningún número se escribe a mano en el HTML. `python3 tools/check_figures.py` lee `engine/findings.json` y falla si una cifra de las landings o del ejemplo no coincide, o si reaparece una cifra vieja. El mock hecho a mano ya no es la fuente.

## Verificar las cifras

`python3 tools/check_figures.py`, `python3 tools/check_commands.py` (cada flag y comando que imprime el sitio existe en la ayuda del motor, copiada en `tools/audit_help.txt`) y `python3 tools/check_pages.py` (desde esta carpeta). El segundo
abre cada página en Chromium, en claro y oscuro, a 1280 y 500 px. Los dos corren en
`.github/workflows/pages.yml` antes de publicar. Solo usan la biblioteca estándar y no se publican.

## Estado

**Versión 0.5.1.** El sitio está en construcción, camino a Order-to-cash (0.6.0).
Demo 1 (0.4.0) está cerrado. El informe real del motor está en `site/engine/`. La página de
ejemplo se arma desde `engine/findings.json`: pedidos medidos, causa, prueba y horas como
estimación. Las landings explican el producto con un pedido de ejemplo (ORD-1005) y los cinco
problemas R01–R05. Lo que falta está en `../specs/backlog.md`; lo cerrado, en `../specs/done/`.
Contrasta las cifras con `site/engine/findings.json` antes de cambiarlas.

## Versiones

Los números marcan el avance hacia cada hito, no siguen semver: `0.4.0` es Demo 1, `0.5.0`
Client-ready y `0.6.0` Order-to-cash; una `0.3.x` es un paso hacia la `0.4.0` y puede traer
funciones. `core` y este repo comparten el número de cada versión y se etiquetan juntos.
Pages publica en cada push a `main`.

## Publicación

GitHub Pages publica `site/` como artefacto desde `.github/workflows/pages.yml` en cada
push a `main` que lo toque. URL: https://rdorta27.github.io/flow-audit-site/

## Idiomas

Español, inglés y portugués. El motor y su informe salen solo en inglés en esta versión; su versión multiidioma es L-01 del backlog. En el sitio: una copia por idioma en `es/`, `en/` y `pt/`, sin generador. Las tres
copias tienen la misma estructura y los mismos enlaces relativos; el selector de la cabecera apunta a la misma
página en cada idioma. Al editar un texto, cambia las tres. El informe del motor sigue en inglés.

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

Cada carpeta lleva su licencia y su `SOURCE.md`. El informe del motor ya existe y es un solo archivo
sin fuentes externas (`core/AGENTS.md`): usa la sans y la mono del sistema, no estas dos fuentes.

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
