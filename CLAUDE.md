# CLAUDE.md

This is not a hard-set of rules but guidance for the repo.

## Commands

Run from the repo root (npm workspaces):

```bash
npm install          # installs both workspaces
npm run dev          # runs BOTH apps concurrently — 3D on :5173, 2D on :5174
npm run dev:3d       # 3D host only
npm run dev:screen   # 2D guest only
npm run build        # builds both, then copies 2d dist/ into 3d dist/screen/
npm run preview      # previews the combined 3D build
```

The 2D app **must** be running for the laptop screen to render anything in dev; the 3D Vite server proxies `/screen` → `http://localhost:5174`.

Lint/format is per-workspace — run inside the app directory you're editing:

```bash
npm run lint         # eslint .
npm run lint:fix     # eslint --fix && prettier --write .
```

There is no test framework in this repo. Verify changes by running the app.

Deployment is manual only: both GitHub Actions workflows are `workflow_dispatch`, and `Deploy Portfolio to GitHub Pages` is the one that actually publishes (`gh workflow run "Deploy Portfolio to GitHub Pages" --ref main`). The other workflow just uploads a build artifact. Never trigger a deploy without the user explicitly asking.

## Architecture

The site is a Three.js scene of a hand-modeled Blender room, with a **live React app rendered onto the laptop screen inside that room**. Two independent Vite apps in one repo:

- `3d-personal-portfolio-website/` — the host. Vanilla JS + Three.js. `base: "/"`.
- `2d-personal-portfolio-website/` — the guest. React 19 + TypeScript. `base: "/screen/"`.

They are joined at build time, not by a router: the 2D `dist/` is copied into `3d/dist/screen/`, and `3d/src/main.js` points an iframe at `` `${import.meta.env.BASE_URL}screen/` ``. Same-origin by construction, which is the reason for the monorepo — it avoids CORS on the embedded iframe. The `VITE_IFRAME_URL` / `VITE_SCREEN_URL` env vars in `3d/.env.*` and the deploy workflow are **dead** — nothing reads them.

### 3D host

`src/main.js` is one async IIFE that wires together small single-purpose modules; keep new logic in a module rather than growing `main.js`.

- The scene uses **two stacked renderers**: a WebGL canvas and a `CSS3DRenderer` overlay (`three/context.js`). `three/screenOverlay.js` finds the `Macbook_screen` / `Macbook_screen_anchor` nodes in the GLB and parents a `CSS3DObject` (wrapping the iframe) to the anchor, scaling it so `meshWidth / iframeWidth` lines up. The X scale is negative to mirror it correctly.
- Whether the iframe accepts input is a deliberate state machine, not a CSS afterthought. `interactions/previewFocus.js` owns the `pointerEvents` / `touchAction` handoff between `cssRoot`, `wrapper`, and the iframe; `three/focusZoom.js` animates the camera to frame the screen first. Changing pointer-events by hand elsewhere will break click-through in one direction or the other.
- `three/viewport.js` forces **even** pixel dimensions on both renderers. This is a documented workaround for CSS3D misalignment on mobile Safari/Chrome — do not "simplify" it.
- Clickable objects (laptop, Marshall amp) use oversized invisible `Box3` hitboxes created in `main.js` so taps are forgiving; raycasts test both the hitbox and the real descendants.
- The GLB loads through KTX2 + meshopt (`three/loadRoom.js`); the basis transcoder is served from `public/basis/`, so `BASE_URL` must stay correct for the model to load.

### 2D guest

A miniature macOS. All window state lives in `src/system/Desktop.tsx` as a `Record<AppKey, WindowState>` plus a monotonically increasing z-counter — there is no state library, and new apps are registered by adding to the `apps` array there plus a key in `system/types.ts`.

- `system/` is the OS shell (`Window`, `Dock`, `MenuBar/`, `LockScreen`, `ShutdownOverlay`); `apps/` are the things that open in windows. Apps receive `WindowAppProps` (`close` / `minimize` / `focus` / `setSize`) and should not reach outside their window.
- `system/Window.tsx` implements touch scrolling manually (velocity + friction momentum) because native scrolling misbehaves inside the CSS3D-projected iframe. Treat that block as load-bearing.
- Layout is driven by CSS custom properties in `src/index.css`, and sizes are tuned for the iframe's fixed 1920×1200 logical viewport rather than a real browser window — that's why the type and icons look oversized standalone. Prefer editing the variables over hardcoding pixels.
- `window.innerWidth <= 1024` is the mobile branch throughout: opening an app minimizes all others (single-task mode), the window gets a taller portrait layout, and `screenOverlay.js` swaps the iframe to 1024×1600 when focused.

## Conventions

- ESLint 9 flat config + Prettier in both workspaces, mirrored rule sets (printWidth 90, double quotes, semicolons, trailing commas). `import/order` is enforced with alphabetized groups and blank lines between them.
- The 2D app is strict TypeScript; asset imports are typed in `src/types/assets.d.ts`.
- The EmailJS service/template/public keys in `apps/Portfolio/components/Contact/index.tsx` are meant to be client-side — they are not a leaked secret.
