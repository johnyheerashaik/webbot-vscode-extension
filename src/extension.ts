import * as vscode from 'vscode';
import { ChatViewProvider } from './ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('WebBot extension is now active!');

  // Create the chat view provider
  const provider = new ChatViewProvider(context.extensionUri);

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'webbot.chatView',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('webbot.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.webbot-sidebar');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('webbot.newChat', () => {
      provider.newChat();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('webbot.clearHistory', () => {
      provider.clearHistory();
    })
  );

  // Context menu command - send selected code to chat
  context.subscriptions.push(
    vscode.commands.registerCommand('webbot.askAboutCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.document.getText(editor.selection);
        if (selection) {
          vscode.commands.executeCommand('workbench.view.extension.webbot-sidebar');
          provider.sendMessage(`Explain this code:\n\`\`\`\n${selection}\n\`\`\``);
        }
      }
    })
  );
}

export function deactivate() {
  console.log('WebBot extension is now deactivated');
}
