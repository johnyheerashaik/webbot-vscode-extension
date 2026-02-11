# 🚀 WebBot VS Code Extension - Quick Setup

## 📦 Installation Steps

### 1. Navigate to Extension Folder
```bash
cd vscode-extension
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Compile the Extension
```bash
npm run compile
```

### 4. Test in Development Mode

**Option A: Press F5**
1. Open the extension folder in VS Code
2. Press `F5` key
3. A new VS Code window opens with the extension loaded

**Option B: Command Line**
```bash
code .
# Then press F5 in VS Code
```

### 5. Use the Extension

In the Extension Development Host window:
1. Click the 🤖 robot icon in the sidebar
2. Type a message and press Enter
3. Chat with your WebBot!

---

## 🎯 Testing Commands

Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and try:

- `WebBot: Open Chat` - Opens the chat sidebar
- `WebBot: New Chat` - Starts fresh conversation
- `WebBot: Clear History` - Clears all messages

---

## ⚙️ Configure API URL

1. Open Settings (`Ctrl+,`)
2. Search for "WebBot"
3. Set **WebBot: API URL** to your backend URL
   - Default: `http://localhost:3001/api/chat`

---

## 🔧 Make Sure Backend is Running

Before using the extension, start your WebBot backend:

```bash
# In your main project folder
npm run dev:server
```

The extension will connect to `http://localhost:3001/api/chat`

---

## 📦 Package for Distribution (Optional)

To create a `.vsix` file you can share:

```bash
# Install packaging tool
npm install -g @vscode/vsce

# Package the extension
vsce package
```

This creates `webbot-vscode-0.0.1.vsix`

To install:
1. Open VS Code
2. Extensions → `...` menu → Install from VSIX
3. Select the `.vsix` file

---

## 🐛 Troubleshooting

### Extension not showing up?
- Make sure you compiled: `npm run compile`
- Check for errors in Output panel (View → Output → Extension Host)

### Can't connect to backend?
- Verify backend is running on `localhost:3001`
- Check the API URL in settings
- Enable CORS on your backend

### Build errors?
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run compile
```

---

## 🎨 Customize

### Change the Icon
- Replace `icon.png` with your 128x128 PNG

### Modify Chat UI
- Edit `src/ChatViewProvider.ts`
- Find `_getHtmlForWebview()` method
- Customize HTML/CSS

### Add Features
- Edit `src/extension.ts` for new commands
- Update `package.json` to register them

---

## 📁 Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts         # Main entry point
│   └── ChatViewProvider.ts  # Chat UI logic
├── dist/                    # Compiled output
├── package.json            # Extension config
├── tsconfig.json          # TypeScript config
├── webpack.config.js      # Build config
└── README.md             # Full documentation
```

---

## ✅ Checklist

- [ ] Installed dependencies (`npm install`)
- [ ] Compiled extension (`npm run compile`)
- [ ] Backend is running (`npm run dev:server`)
- [ ] Pressed F5 in VS Code
- [ ] Extension Development Host opened
- [ ] Clicked robot icon in sidebar
- [ ] Sent a test message
- [ ] Got a response from WebBot

---

## 🎉 You're Done!

Your VS Code extension is ready to use! 🚀

Press F5 anytime to test changes. The extension auto-reloads when you make edits.

Happy coding! 🤖✨
