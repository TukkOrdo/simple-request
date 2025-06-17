# Simple Request

A lightweight alternative to Postman built with Tauri and TypeScript. Fast and keeps your data local.

## Why Another API Client?

I got tired of Postman's bloat and wanted something simple that doesn't require accounts or cloud sync. This tool does one thing well: test APIs quickly without the overhead.

## Features

- HTTP methods (GET, POST, PUT, DELETE, etc.)
- Request collections stored as local JSON files
- Authentication (Bearer, Basic, API Key)
- No telemetry or cloud requirements
- Portable single executable

## Requirements

- Node.js 18+
- Rust (latest stable)
- Platform-specific build tools:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: `libwebkit2gtk-4.0-dev` and build essentials

## Setup

```bash
# Clone and install
git clone <repo-url>
cd simple-request
npm install

# Development
npm run tauri:dev

# Build executable
npm run tauri:build
```

## Usage

1. Create a collection
2. Add requests with URL, headers, body, auth
3. Send requests and view responses
4. Collections save automatically as JSON files

## Storage

Collections are stored in your system's app data directory as JSON files. No credentials are saved - you'll need to re-enter auth tokens each session for security.

## Building

The built executable will be in `src-tauri/target/release/`:
- Windows: `simple-request.exe`
- macOS: `bundle/macos/Simple Request.app` 
- Linux: `simple-request`

## Why Use This?

Unlike Postman, this tool:
- Doesn't require accounts or cloud sync
- Stores everything locally
- Has a smaller footprint than Electron-based alternatives
- Focuses on core API testing without bloat

## Contributing

Feel free to open issues or submit PRs. The codebase is straightforward - React frontend talking to a Rust backend via Tauri.

## License

GNU GPLv3