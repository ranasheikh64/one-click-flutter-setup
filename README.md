<div align="center">

# 🦋 DevTool CLI — One-Click Flutter Setup

[![npm](https://img.shields.io/npm/v/devtool-cli?color=cyan&style=flat-square)](https://www.npmjs.com/package/devtool-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](#)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](#)

**Automatically installs and configures your entire Flutter development environment in one command.**
No manual downloads. No PATH headaches. Works on Windows, macOS, and Linux.

</div>

---

## ⚡ Quick Start — For Anyone on a New Device

> **Prerequisite:** You only need **Node.js** (v18+) installed first.
> Download Node.js → https://nodejs.org

### Option 1 — Run directly without installing (recommended)
```bash
npx devtool-cli flutter-setup
```

### Option 2 — Install globally, then run anytime
```bash
npm install -g devtool-cli
devtool flutter-setup
```

### Option 3 — Clone this repo and link locally
```bash
git clone https://github.com/YOUR_USERNAME/devtool-cli.git
cd devtool-cli
npm install
npm link
devtool flutter-setup
```

---

## 🚀 What Gets Installed

When you run `devtool flutter-setup`, you'll see a detection table of what's already on your system and a checkbox menu to choose exactly what to install:

| Tool | Purpose | Windows | macOS | Linux |
|------|---------|---------|-------|-------|
| **Git** | Required by Flutter | winget / installer | brew / Xcode CLT | apt / dnf / pacman |
| **Java JDK 17** | Android toolchain | winget / MSI | brew / PKG | apt / dnf |
| **Node.js LTS** | FlutterFire CLI | winget / MSI | brew | nvm / apt |
| **Flutter SDK** | Core framework | ZIP download | brew / tar | tar download |
| **Android SDK** | Android builds | cmdline-tools | cmdline-tools | cmdline-tools |
| **FlutterFire CLI** | Firebase for Flutter | dart pub global | dart pub global | dart pub global |

---

## 🖥️ Demo Flow

```
┌──────────────────────────────────────────────────────────────────┐
│    🦋  Flutter One-Click Setup CLI                                │
│  Auto-installs everything you need for Flutter                   │
│  Git  •  Java JDK 17  •  Node.js  •  Flutter SDK               │
│  Android SDK  •  FlutterFire CLI                                │
└──────────────────────────────────────────────────────────────────┘

  Detected OS: 🪟 Windows (x64)

  📋 Current System Status
  ┌──────────────────────┬──────────────────────────────┬──────────────────────────┐
  │  Tool                │ Status                       │ Description              │
  ├──────────────────────┼──────────────────────────────┼──────────────────────────┤
  │  Git                 │ ✔  Installed (2.44.0)         │ Version control          │
  │  Java JDK 17         │ ✖  Missing                   │ Android build toolchain  │
  │  Node.js LTS         │ ✔  Installed (20.11.0)        │ Required for FlutterFire │
  │  Flutter SDK         │ ✖  Missing                   │ Core Flutter framework   │
  │  Android SDK         │ ✖  Missing                   │ Android builds           │
  │  FlutterFire CLI     │ ✖  Missing                   │ Firebase for Flutter     │
  └──────────────────────┴──────────────────────────────┴──────────────────────────┘

  ⚡ 4 tool(s) need to be installed
  ✔ Select which ones to install (Space = toggle, Enter = confirm):

  ▶ Choose tools to install:
   ◉  Java JDK 17             Android build toolchain
   ◉  Flutter SDK             Core Flutter framework
   ◉  Android SDK             Android Command-line Tools + SDK
   ◉  FlutterFire CLI         Firebase for Flutter

  ... downloads with progress bars ...

  🔍 Installation Verification
  ┌──────────────────────┬──────────────┬──────────────────────────┐
  │  Tool                │ Status       │ Version / Action         │
  ├──────────────────────┼──────────────┼──────────────────────────┤
  │  Git                 │ ✔  OK        │ 2.44.0                   │
  │  Java JDK            │ ✔  OK        │ 17.0.10                  │
  │  Node.js             │ ✔  OK        │ 20.11.0                  │
  │  Dart SDK            │ ✔  OK        │ 3.3.0                    │
  │  Flutter SDK         │ ✔  OK        │ 3.19.5                   │
  │  Android SDK         │ ✔  OK        │ installed                │
  │  ADB                 │ ✔  OK        │ 34.0.5                   │
  │  FlutterFire CLI     │ ✔  OK        │ 0.3.0                    │
  └──────────────────────┴──────────────┴──────────────────────────┘

  🎉 All checks passed! Your Flutter environment is ready.
```

---

## 📋 All CLI Commands

```bash
# Flutter one-click setup
devtool flutter-setup

# Interactive menu (all features)
devtool

# Other commands
devtool build        # Build/bundle project
devtool deploy       # Deploy to server
devtool scan         # Audit & scan project
devtool info         # System information
devtool --version    # Show version
devtool --help       # Show help
```

---

## 🔑 Key Features

- ✅ **Skip anything** — checkbox lets you pick exactly what to install
- ✅ **Custom install paths** — choose where Flutter SDK and Android SDK go  
- ✅ **Auto PATH config** — permanently sets PATH, ANDROID_HOME, JAVA_HOME
- ✅ **Live progress bars** — real-time download progress with MB counters
- ✅ **IDE detection** — tells you if VS Code / Android Studio is missing with download links
- ✅ **Verification summary** — flutter-doctor-style table at the end
- ✅ **Graceful fallbacks** — tries winget → choco → direct download on Windows
- ✅ **Self-installing** — automatically installs its own npm dependencies on first run

---

## 🔧 After Setup

1. **Restart your terminal** (for PATH changes to take effect)
2. Run `flutter doctor` to verify everything
3. Run `flutter create my_app` to create your first app
4. Run `cd my_app && flutter run` to launch it!

> **Windows tip:** If Android licenses warning appears, run:
> ```bash
> flutter doctor --android-licenses
> ```

---

## 📦 Requirements

- **Node.js v18+** (the only manual prerequisite)
- Internet connection during setup
- Admin/sudo access on your machine (for installing system tools)

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT © [YOUR_NAME]
