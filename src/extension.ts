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
                const language = editor.document.languageId;
                if (selection) {
                    vscode.commands.executeCommand('workbench.view.extension.webbot-sidebar');
                    provider.sendMessage(`Explain this ${language} code:\n\`\`\`${language}\n${selection}\n\`\`\``);
                } else {
                    vscode.window.showWarningMessage('Please select some code first');
                }
            }
        })
    );

    // Context menu command - explain entire file
    context.subscriptions.push(
        vscode.commands.registerCommand('webbot.explainFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const fullText = editor.document.getText();
                const fileName = editor.document.fileName.split('/').pop();
                const language = editor.document.languageId;

                if (fullText.length > 10000) {
                    vscode.window.showWarningMessage('File is too large. Please select a specific section.');
                    return;
                }

                vscode.commands.executeCommand('workbench.view.extension.webbot-sidebar');
                provider.sendMessage(`Explain this file (${fileName}):\n\`\`\`${language}\n${fullText}\n\`\`\``);
            }
        })
    );
}

export function deactivate() {
    console.log('WebBot extension is now deactivated');
}