import * as vscode from 'vscode';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'webbot.chatView';
  private _view?: vscode.WebviewView;
  private messages: Message[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data: any) => {
      switch (data.type) {
        case 'sendMessage':
          await this.handleSendMessage(data.message);
          break;
        case 'attachActiveEditor':
          await this.handleAttachActiveEditor();
          break;
        case 'attachSelection':
          await this.handleAttachSelection();
          break;
        case 'newChat':
          this.newChat();
          break;
        case 'clearHistory':
          this.clearHistory();
          break;
      }
    });

    // Load chat history
    this.loadChatHistory();
  }

  public newChat(): void {
    this.messages = [];
    this._view?.webview.postMessage({ type: 'clearChat' });
    vscode.window.showInformationMessage('Started new chat');
  }

  public clearHistory(): void {
    this.messages = [];
    this._view?.webview.postMessage({ type: 'clearChat' });
    vscode.window.showInformationMessage('Chat history cleared');
  }

  public sendMessage(message: string): void {
    this._view?.webview.postMessage({
      type: 'prefillMessage',
      message
    });
  }

  private async handleSendMessage(userMessage: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('webbot');
    const apiUrl = config.get<string>('apiUrl') || 'http://localhost:8787/api/chat/stream';

    // Add user message
    const userMsg: Message = {
      id: this.makeId(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    this.messages.push(userMsg);

    // Send to webview
    this._view?.webview.postMessage({
      type: 'addMessage',
      message: userMsg
    });

    // Create assistant message placeholder
    const assistantId = this.makeId();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    this.messages.push(assistantMsg);

    this._view?.webview.postMessage({
      type: 'addMessage',
      message: assistantMsg
    });

    // Call API
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: this.messages.slice(0, -1).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const sep = buffer.indexOf('\n\n');
          if (sep === -1) break;

          const rawEvent = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          const lines = rawEvent.split('\n');
          const dataLines = lines
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice('data:'.length).trimStart());

          if (dataLines.length === 0) continue;
          const data = dataLines.join('\n');

          if (data === '[DONE]') break;

          try {
            const chunk = JSON.parse(data);
            if (typeof chunk === 'string') {
              assistantMsg.content += chunk;

              // Update in messages array
              const idx = this.messages.findIndex(m => m.id === assistantId);
              if (idx !== -1) {
                this.messages[idx] = assistantMsg;
              }

              // Send update to webview
              this._view?.webview.postMessage({
                type: 'updateMessage',
                id: assistantId,
                content: assistantMsg.content
              });
            }
          } catch {
            assistantMsg.content += data;
            this._view?.webview.postMessage({
              type: 'updateMessage',
              id: assistantId,
              content: assistantMsg.content
            });
          }
        }
      }

      // Mark as complete
      this._view?.webview.postMessage({
        type: 'messageComplete',
        id: assistantId
      });

      // Save chat history
      this.saveChatHistory();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Update assistant message with error
      assistantMsg.content = `[Error] ${errorMsg}`;
      const idx = this.messages.findIndex(m => m.id === assistantId);
      if (idx !== -1) {
        this.messages[idx] = assistantMsg;
      }

      this._view?.webview.postMessage({
        type: 'updateMessage',
        id: assistantId,
        content: assistantMsg.content
      });

      vscode.window.showErrorMessage(`WebBot Error: ${errorMsg}`);
    }
  }

  private async handleAttachActiveEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    const document = editor.document;
    const content = document.getText();
    const fileName = document.fileName.split('/').pop() || 'untitled';
    const language = document.languageId || '';

    if (content.length > 20000) {
      vscode.window.showWarningMessage('File too large (>20KB)');
      return;
    }

    this._view?.webview.postMessage({
      type: 'attachFileContent',
      fileName,
      language,
      content
    });
  }

  private async handleAttachSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('No selection');
      return;
    }

    const document = editor.document;
    const content = document.getText(selection);
    const fileName = `${document.fileName.split('/').pop() || 'selection'} (lines ${selection.start.line + 1}-${selection.end.line + 1})`;
    const language = document.languageId || '';

    this._view?.webview.postMessage({
      type: 'attachFileContent',
      fileName,
      language,
      content
    });
  }

  private loadChatHistory(): void {
    // Load from workspace state or global state
  }

  private saveChatHistory(): void {
    // Save to workspace state or global state
  }

  private makeId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebBot Chat</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      display: flex;
      flex-direction: column;
    }

    .chat-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }

    .message {
      display: flex;
      flex-direction: column;
      gap: 4px;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      align-items: flex-end;
    }

    .message.assistant {
      align-items: flex-start;
    }

    .message-header {
      font-size: 10px;
      opacity: 0.6;
      padding: 0 8px;
    }

    .message-bubble {
      max-width: 85%;
      padding: 10px 12px;
      border-radius: 12px;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
      font-size: 13px;
    }

    .message.user .message-bubble {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .message.assistant .message-bubble {
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 6px 0;
    }

    .typing-indicator span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--vscode-foreground);
      opacity: 0.6;
      animation: typing 1.4s infinite ease-in-out;
    }

    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .input-container {
      padding: 10px;
      border-top: 1px solid var(--vscode-panel-border);
      background-color: var(--vscode-editor-background);
      flex-shrink: 0;
    }

    .input-wrapper {
      display: flex;
      gap: 6px;
      align-items: flex-end;
    }

    .attach-buttons {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: 6px;
      border: 1px solid var(--vscode-input-border);
      background-color: var(--vscode-input-background);
      color: var(--vscode-foreground);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-btn:hover:not(:disabled) {
      background-color: var(--vscode-list-hoverBackground);
      transform: scale(1.05);
    }

    .icon-btn:active:not(:disabled) {
      transform: scale(0.95);
    }

    .icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    textarea {
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--vscode-input-border);
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: 13px;
      resize: none;
      min-height: 32px;
      max-height: 120px;
      line-height: 1.4;
    }

    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .send-btn {
      width: 36px;
      height: 32px;
      padding: 0;
      border-radius: 6px;
      border: none;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      background-color: var(--vscode-button-hoverBackground);
      transform: scale(1.05);
    }

    .send-btn:active:not(:disabled) {
      transform: scale(0.95);
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    code {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 2px 5px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    pre {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 6px 0;
      font-size: 12px;
    }

    pre code {
      background: none;
      padding: 0;
    }

    /* Scrollbar */
    .chat-container::-webkit-scrollbar {
      width: 8px;
    }

    .chat-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .chat-container::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
      border-radius: 4px;
    }

    .chat-container::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="chat-container" id="chat"></div>
  
  <div class="input-container">
    <div class="input-wrapper">
      <div class="attach-buttons">
        <button id="attach-editor" class="icon-btn" type="button" title="Attach current file">📄</button>
        <button id="attach-selection" class="icon-btn" type="button" title="Attach selection">✂️</button>
      </div>
      <textarea 
        id="input" 
        placeholder="Ask me anything..."
        rows="1"
      ></textarea>
      <button id="send" class="send-btn" type="button" title="Send (Enter)">➤</button>
    </div>
  </div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      const chatContainer = document.getElementById('chat');
      const input = document.getElementById('input');
      const attachEditorButton = document.getElementById('attach-editor');
      const attachSelectionButton = document.getElementById('attach-selection');
      const sendButton = document.getElementById('send');

      let isStreaming = false;

      input.addEventListener('input', function() {
        resizeInput();
      });

      function sendMessage() {
        const message = input.value.trim();
        if (!message || isStreaming) return;

        vscode.postMessage({
          type: 'sendMessage',
          message: message
        });

        input.value = '';
        input.style.height = 'auto';
        isStreaming = true;
        sendButton.disabled = true;
      }

      attachEditorButton.addEventListener('click', function() {
        vscode.postMessage({ type: 'attachActiveEditor' });
      });

      attachSelectionButton.addEventListener('click', function() {
        vscode.postMessage({ type: 'attachSelection' });
      });

      sendButton.addEventListener('click', sendMessage);

      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      window.addEventListener('message', function(event) {
        const message = event.data;

        switch (message.type) {
          case 'addMessage':
            addMessage(message.message);
            break;
          case 'updateMessage':
            updateMessage(message.id, message.content);
            break;
          case 'attachFileContent':
            attachFile(message);
            break;
          case 'messageComplete':
            isStreaming = false;
            sendButton.disabled = false;
            break;
          case 'clearChat':
            chatContainer.innerHTML = '';
            break;
          case 'prefillMessage':
            input.value = message.message;
            input.focus();
            resizeInput();
            break;
        }
      });

      function addMessage(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + msg.role;
        messageDiv.id = 'msg-' + msg.id;

        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = msg.role === 'user' ? 'You' : 'WebBot';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.id = 'bubble-' + msg.id;

        if (msg.content) {
          bubble.textContent = msg.content;
        } else if (msg.role === 'assistant') {
          const typing = document.createElement('div');
          typing.className = 'typing-indicator';
          typing.innerHTML = '<span></span><span></span><span></span>';
          bubble.appendChild(typing);
        }

        messageDiv.appendChild(header);
        messageDiv.appendChild(bubble);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      function updateMessage(id, content) {
        const bubble = document.getElementById('bubble-' + id);
        if (bubble) {
          bubble.textContent = content;
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }

      function resizeInput() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      }

      function attachFile(message) {
        const language = message.language || '';
        const attachmentText = 
          'File: ' + message.fileName + '\\n' +
          '\`\`\`' + language + '\\n' +
          message.content + '\\n' +
          '\`\`\`\\n\\n';

        const needsNewline = input.value && !input.value.endsWith('\\n');
        input.value = input.value + (needsNewline ? '\\n\\n' : '') + attachmentText;
        input.focus();
        resizeInput();
      }
    })();
  </script>
</body>
</html>`;
  }
}