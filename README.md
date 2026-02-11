# WebBot VS Code Extension

Chat with your WebBot AI directly inside VS Code!

## 🚀 Features

- **Chat Interface** - Full-featured chat sidebar in VS Code
- **Code Context** - Right-click code to ask WebBot about it
- **Streaming Responses** - Real-time AI responses
- **Session Management** - Keep your conversation history
- **Customizable** - Configure API URL and model

## 📦 Installation

### Option 1: Development Mode (For Testing)

1. **Navigate to extension folder:**
   ```bash
   cd vscode-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

4. **Open in VS Code:**
   ```bash
   code .
   ```

5. **Press F5** to launch Extension Development Host

### Option 2: Package and Install

1. **Install vsce (VS Code Extension Manager):**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Package the extension:**
   ```bash
   vsce package
   ```

3. **Install the .vsix file:**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Click `...` menu → Install from VSIX
   - Select the generated `.vsix` file

## ⚙️ Configuration

Open VS Code settings (Ctrl+,) and search for "WebBot":

- **WebBot: API URL** - Your WebBot backend URL (default: `http://localhost:3001/api/chat`)
- **WebBot: Model** - AI model to use (default: `gpt-4o-mini`)

## 🎯 Usage

### Open Chat Sidebar

1. Click the robot icon (🤖) in the activity bar
2. Or run command: `WebBot: Open Chat` (Ctrl+Shift+P)

### Send Messages

- Type in the input box
- Press Enter to send (Shift+Enter for new line)
- Click Send button

### Ask About Code

1. Select code in editor
2. Right-click → "WebBot: Open Chat"
3. The code will be sent to WebBot

### Commands

- **WebBot: Open Chat** - Open the chat sidebar
- **WebBot: New Chat** - Start a new conversation
- **WebBot: Clear History** - Clear chat history

## 🔧 Requirements

- VS Code 1.85.0 or higher
- WebBot backend running (default: localhost:3001)

## 📝 Backend Setup

Make sure your WebBot backend is running:

```bash
# In your main project
npm run dev:server
```

The extension expects an SSE endpoint at `/api/chat` that accepts:

```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi!" }
  ]
}
```

## 🎨 Customization

### Change Icon

Replace `icon.png` with your own 128x128 PNG icon.

### Modify Chat UI

Edit `src/ChatViewProvider.ts` - the HTML is in `_getHtmlForWebview()` method.

### Add Commands

Edit `package.json` → `contributes.commands` section.

## 🐛 Troubleshooting

### Extension not loading
- Check Output panel (View → Output → Select "Extension Host")
- Make sure backend is running

### API connection errors
- Verify `webbot.apiUrl` in settings
- Check backend is accessible
- Check CORS is enabled on backend

### Build errors
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Run `npm run compile`

## 📖 Development

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts           # Main extension file
│   └── ChatViewProvider.ts    # Chat webview logic
├── package.json               # Extension manifest
├── tsconfig.json             # TypeScript config
├── webpack.config.js         # Build config
└── README.md                 # This file
```

### Build Commands

```bash
npm run compile        # Compile TypeScript
npm run watch         # Watch mode
npm run package       # Production build
vsce package          # Create .vsix package
```

### Debug

1. Open extension folder in VS Code
2. Press F5 to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Test in the new VS Code window

## 🚀 Publishing (Optional)

To publish to VS Code Marketplace:

1. Create publisher account at https://marketplace.visualstudio.com
2. Get Personal Access Token
3. Login: `vsce login <publisher-name>`
4. Publish: `vsce publish`

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to open issues or PRs.

## 🎉 Enjoy!

Happy coding with WebBot! 🤖✨
