# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Build Android APK on GitHub

The `Build Android APK` GitHub Action runs after pushes to `main` and can also be started manually from the Actions tab.

Each run builds the `home` and `hu-chi-tieu` debug APK variants, copies them into `apk/` with fixed file names, uploads them as artifacts, then commits the download files back to `main`:

- `apk/lucky-home.apk`
- `apk/hu-chi-tieu.apk`
- `apk/update.json`

The app reads `apk/update.json` through the stable GitHub raw URL, compares the current APK build number with the latest server build, and downloads the matching variant from the Profile or Settings update panel. Open a successful workflow run in GitHub Actions when an artifact download is needed instead.
