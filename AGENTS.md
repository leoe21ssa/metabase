# AGENTS.md - metabase (fork leoe21ssa/metabase)

Contexto canónico para cualquier agente de código o LLM. `CLAUDE.md` empieza con
`@AGENTS.md`; el resto de ese archivo es la guía de desarrollo de Metabase, que sigue vigente.
El resto de herramientas leen este archivo directamente.

## Antes de nada: las specs están en `../metabase-fork-specs`

Este repo se trabaja dentro de un workspace (carpeta normal, sin git) con el repo de
specs como hermano. Si `../metabase-fork-specs` no existe, clónalo ahí antes de hacer nada:

```bash
cd .. && git clone https://github.com/leoe21ssa/metabase-fork-specs.git
```

Lee, en este orden: `../metabase-fork-specs/AGENTS.md`, `../metabase-fork-specs/docs/constitution.md`
y la spec activa.

## Qué es este repo

Fork de Metabase (edición de código abierto, licencia AGPL) de uso interno, con mejoras de
visualización inspiradas en los informes de Ontraport. Stack heredado de Metabase y fijado por
`ADR-0002` (`../metabase-fork-specs/docs/decisions/ADR-0002-stack.md`): los cambios del fork son
solo de frontend (TypeScript, React 18, Mantine 8 vía `metabase/ui`, ECharts 6, ttag; tests con
Jest 30, Testing Library y Cypress 15), sin dependencias nuevas, sin cambios de backend Clojure,
de API ni de esquema, y nada dentro de `enterprise/`. No posee datos propios: los ajustes nuevos
viven en los ajustes de visualización de las tarjetas de dashboard, que la base de datos de
aplicación de Metabase guarda como JSON opaco. Ramas según `ADR-0001`: `master` es espejo de
`upstream/master`, `develop` es el entorno de pruebas y `main` producción. Mapa del código y
puntos de inserción: `../metabase-fork-specs/docs/reference/metabase-fork.md`.

## Spec activa

Spec 001, selector de métrica en tarjetas de dashboard
(`../metabase-fork-specs/specs/001-selector-de-metrica/`): `plan.md` y `tasks.md` aprobados el
2026-09-25; implementación en curso en la rama `spec-001/T1-T33`.

## Comandos

```bash
bun install                                   # dependencias (npm y yarn bloqueados)
bun run build-hot                             # frontend en modo desarrollo (recarga en caliente)
clojure -M:run                                # backend en localhost:3000
bun run lint-eslint-pure                      # ESLint
bun run lint-format-pure                      # formato (oxfmt); `bun run format` corrige
bun run type-check-pure                       # tipos
TZ=UTC bun run test-unit <ruta-del-spec>      # tests unitarios (Jest); siempre con TZ=UTC
TZ=UTC bun run test-unit-keep-cljs <ruta>     # igual, sin recompilar ClojureScript
CYPRESS_GUI=false bun run test-cypress --spec <archivo.cy.spec.ts>   # extremo a extremo, con backend en marcha
```

El build de producción es el de Metabase; el fork no lo cambia.

## Skills

`.agents/skills/` contiene las skills SDD como enlaces simbólicos relativos por skill al repo de
specs (por ejemplo `sdd-plan -> ../../../metabase-fork-specs/.agents/skills/sdd-plan`).
`.claude/skills/` es la carpeta de skills de Metabase y no se modifica: solo se le añade un
enlace por skill SDD (`.claude/skills/sdd-plan -> ../../.agents/skills/sdd-plan`). Ponytail no se
copia a este repo; su texto está en
`../metabase-fork-specs/templates/code-repo/.agents/skills/ponytail/SKILL.md`.

## Documentación actualizada de librerías (Context7)

Usa el servidor MCP Context7 para consultar la documentación de la versión exacta de cada
librería antes de escribir código que la use. La configuración está versionada en `.mcp.json`
(añadido con `git add -f`, porque el `.gitignore` de Metabase lo ignora) y usa el servidor remoto
por HTTP (`https://mcp.context7.com/mcp`), así que no necesita Node ni `npx`. Toma la clave de la
variable de entorno `CONTEXT7_API_KEY`; cada persona usa su propia clave (cuenta gratuita en
context7.com) y nunca se escribe en el repo.

Cómo definir la variable según la máquina:
- macOS y Linux (incluido WSL): `export CONTEXT7_API_KEY="..."` en `~/.profile` del usuario que
  ejecuta el agente (no en `~/.bashrc`, que se omite en procesos no interactivos); abre una terminal nueva.
- Ejecuciones sin sesión interactiva (scripts): pásala en el entorno del proceso.

La primera vez que Claude Code abre el repo pide aprobar el servidor del proyecto; para no
preguntar en cada máquina puede fijarse `"enableAllProjectMcpServers": true` en la configuración
de usuario de Claude Code. Para otras herramientas, añade un servidor MCP llamado `context7` de
tipo HTTP con esa URL y la cabecera `Authorization: Bearer <clave>` (Codex: `~/.codex/config.toml`,
sección `[mcp_servers.context7]`; opencode: `opencode.json`, clave `mcp`).

## Versiones: las que fija Metabase

En este fork las versiones las fijan `mise.toml`, `package.json` y `bun.lock` de Metabase (JDK
Temurin 25, Clojure CLI 1.12, Node 22, Bun 1.3, TypeScript 6, React 18, Mantine 8.3). El fork no
añade ni actualiza dependencias (constitución, principio 5; `ADR-0002`): se consulta Context7
para la versión instalada, confirmada en `package.json`, y las versiones cambian solo al integrar
upstream.

## Reglas de autoría y estilo (para toda persona y agente, en cualquier herramienta)

- Los commits, pull requests y archivos van únicamente a nombre de la persona que los hace. **Nunca** se añaden trailers `Co-Authored-By`, `Claude-Session`, líneas "Generated with Claude Code" ni ninguna otra atribución a una herramienta o modelo. El CI rechaza los commits que las lleven.
- **Nunca el guion largo** (em dash, U+2014) en ningún texto. Se usa "-". El CI lo comprueba en todo texto propio; queda fuera el texto de terceros vendido tal cual (skills `ponytail` e `impeccable`, bloque que genera Next.js).
- Estas reglas viven en el repositorio (este archivo, `.claude/settings.json` y el CI) para que apliquen a cualquiera que lo clone, sin depender de configuración local.

## Reglas

00. **Ramas y pull requests, siempre**: `develop` es la rama por defecto (entorno de pruebas) y `main` es
   producción; nadie escribe directamente en ninguna. Ramas `spec-NNN/...` desde `develop`, pull request contra
   `develop` mezclado por el propietario; producción se libera con un PR de `develop` a `main`.
   Antes de cualquier cambio: `git status` limpio, `git checkout develop && git pull` y crear la rama desde ahí.
0. **Herramientas obligatorias**: Context7 antes de escribir código con cualquier librería, Ponytail en cada
   tarea, impeccable en toda interfaz (instálala con `npx impeccable install --project --no-hooks` y muévela a
   `.agents/skills/`; el binario `scripts/bin/` no se versiona).
1. Nada se implementa fuera de una tarea de `tasks.md` de la spec activa. Sin plan y tareas
   aprobados, este repo solo recibe infraestructura.
2. Cada test lleva en su nombre el id del RF que cubre; la suite roja bloquea el merge. CI corre
   en cada push y pull request.
3. Nunca datos personales reales en código, tests, fixtures ni logs.
4. Secretos solo en variables de entorno (`.env` ignorado; `.env.example` documenta las claves).
5. Commits en inglés que citan spec y RF: `spec 001 RF-12: ...`. Sin trailers de atribución.
6. Al terminar una tarea, marca la casilla en `tasks.md` del repo de specs solo si su
   "Hecho cuando" se cumple, y anota el commit de este repo.
7. Nada se modifica dentro de `enterprise/`; los archivos de Metabase que se tocan son solo los
   puntos de inserción listados en el `plan.md` de la spec.
