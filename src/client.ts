import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import type {
  ComfyUIClientOptions,
  QueuePromptResponse,
  HistoryResult,
  ImageInfo,
  UploadImageResponse,
  ExecuteResult,
  ProgressCallback,
  WebSocketMessage,
  QueueResponse,
  QueueClearResponse,
  WebSocketEventListener,
} from './types';

/**
 * ComfyUI API Client
 *
 * Provides a complete interface to ComfyUI REST and WebSocket APIs.
 * Supports queueing prompts, monitoring progress, downloading images, and uploading files.
 */
export class ComfyUIClient {
  private url: string;
  private wsUrl: string;
  private clientId: string;
  private wsListeners: Map<string, WebSocketEventListener[]> = new Map();

  constructor(options: ComfyUIClientOptions = {}) {
    this.url = options.url || 'http://127.0.0.1:8188';
    this.wsUrl = options.wsUrl || 'ws://127.0.0.1:8188/ws';
    this.clientId = options.clientId || randomUUID();
  }

  /**
   * Queue a prompt (workflow) for execution
   */
  async queuePrompt(workflow: object): Promise<QueuePromptResponse> {
    const response = await fetch(`${this.url}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this.clientId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI /prompt failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<QueuePromptResponse>;
  }

  /**
   * Get the current queue status (running and pending prompts)
   */
  async getQueue(): Promise<QueueResponse> {
    const response = await fetch(`${this.url}/queue`);

    if (!response.ok) {
      throw new Error(`ComfyUI /queue failed (${response.status})`);
    }

    return response.json() as Promise<QueueResponse>;
  }

  /**
   * Clear all pending prompts from the queue
   * @param unfinishedOnly If true, only clear unfinished prompts; if false, clear all
   */
  async clearQueue(unfinishedOnly: boolean = true): Promise<QueueClearResponse> {
    const response = await fetch(`${this.url}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: !unfinishedOnly }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI /queue POST failed (${response.status}): ${text}`);
    }

    return { status: 'ok' };
  }

  /**
   * Remove a specific prompt from the queue by number
   * @param queueNumber The queue number of the prompt to remove
   */
  async removeFromQueue(queueNumber: number): Promise<QueueClearResponse> {
    const response = await fetch(`${this.url}/queue/${queueNumber}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI /queue/${queueNumber} DELETE failed (${response.status}): ${text}`);
    }

    return { status: 'ok' };
  }

  /**
   * Get execution history for a prompt
   */
  async getHistory(promptId: string): Promise<HistoryResult> {
    const response = await fetch(`${this.url}/history/${promptId}`);

    if (!response.ok) {
      throw new Error(`ComfyUI /history failed (${response.status})`);
    }

    const data = await response.json() as Record<string, HistoryResult>;
    return data[promptId];
  }

  /**
   * Download an image from ComfyUI
   */
  async downloadImage(
    filename: string,
    subfolder?: string,
    type?: string
  ): Promise<Buffer> {
    const params = new URLSearchParams({
      filename,
      subfolder: subfolder || '',
      type: type || 'output',
    });

    const response = await fetch(`${this.url}/view?${params}`);

    if (!response.ok) {
      throw new Error(`ComfyUI /view failed (${response.status})`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Upload an image to ComfyUI
   */
  async uploadImage(buffer: Buffer, filename: string): Promise<UploadImageResponse> {
    const boundary = `----ComfyUpload${Date.now()}`;
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(header);
    const footerBuf = Buffer.from(footer);
    const body = Buffer.concat([headerBuf, buffer, footerBuf]);

    const response = await fetch(`${this.url}/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI /upload/image failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<UploadImageResponse>;
  }

  /**
   * Register a WebSocket event listener for a specific message type
   * @param messageType The type of message to listen for (e.g., 'progress', 'executing')
   * @param listener Callback function to handle the message
   */
  onWebSocketMessage(messageType: string, listener: WebSocketEventListener): () => void {
    if (!this.wsListeners.has(messageType)) {
      this.wsListeners.set(messageType, []);
    }
    this.wsListeners.get(messageType)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.wsListeners.get(messageType);
      if (listeners) {
        const idx = listeners.indexOf(listener);
        if (idx > -1) {
          listeners.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Wait for prompt execution to complete via WebSocket
   *
   * @param promptId The prompt ID to monitor
   * @param onProgress Optional callback: (current: number, max: number) => void
   * @returns The execution history result
   */
  async waitForCompletion(
    promptId: string,
    onProgress?: ProgressCallback
  ): Promise<HistoryResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsUrl}?clientId=${this.clientId}`);
      let timeout = setTimeout(() => {
        ws.close();
        reject(new Error('ComfyUI execution timed out (5 min)'));
      }, 5 * 60 * 1000);

      ws.on('message', async (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString()) as WebSocketMessage;

          // Trigger registered listeners
          const listeners = this.wsListeners.get(msg.type);
          if (listeners) {
            listeners.forEach(listener => {
              try {
                listener(msg);
              } catch (e) {
                console.error(`Error in WebSocket listener for ${msg.type}:`, e);
              }
            });
          }

          // Progress update
          if (
            msg.type === 'progress' &&
            msg.data?.prompt_id === promptId
          ) {
            if (onProgress && msg.data.value !== undefined && msg.data.max !== undefined) {
              onProgress(msg.data.value as number, msg.data.max as number);
            }
          }

          // Execution complete
          if (
            msg.type === 'executing' &&
            msg.data?.prompt_id === promptId &&
            msg.data?.node === null
          ) {
            clearTimeout(timeout);
            ws.close();
            try {
              const history = await this.getHistory(promptId);
              resolve(history);
            } catch (err) {
              reject(err);
            }
          }

          // Execution error
          if (msg.type === 'execution_error' && msg.data?.prompt_id === promptId) {
            clearTimeout(timeout);
            ws.close();
            const errorMsg = msg.data?.exception_message || JSON.stringify(msg.data);
            reject(new Error(`ComfyUI execution error: ${errorMsg}`));
          }

          // Execution exception
          if (msg.type === 'execution_exception' && msg.data?.prompt_id === promptId) {
            clearTimeout(timeout);
            ws.close();
            const errorMsg = msg.data?.exception_message || JSON.stringify(msg.data);
            reject(new Error(`ComfyUI execution exception: ${errorMsg}`));
          }
        } catch (e) {
          // Ignore non-JSON messages (binary frames)
        }
      });

      ws.on('error', (err: Error) => {
        clearTimeout(timeout);
        reject(new Error(`ComfyUI WebSocket error: ${err.message}`));
      });

      ws.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Extract the first output image from a history result
   */
  getOutputImage(historyResult: HistoryResult): ImageInfo | null {
    const outputs = historyResult.outputs;
    for (const nodeId of Object.keys(outputs)) {
      const nodeOut = outputs[nodeId];
      if (nodeOut.images && nodeOut.images.length > 0) {
        return nodeOut.images[0];
      }
    }
    return null;
  }

  /**
   * Execute a complete workflow: queue → wait → extract results
   *
   * Convenience method combining queuePrompt, waitForCompletion, and getOutputImage.
   */
  async execute(
    workflow: object,
    onProgress?: ProgressCallback
  ): Promise<ExecuteResult> {
    const { prompt_id } = await this.queuePrompt(workflow);
    const history = await this.waitForCompletion(prompt_id, onProgress);

    const images: ImageInfo[] = [];
    const outputs = history.outputs;
    for (const nodeId of Object.keys(outputs)) {
      const nodeOut = outputs[nodeId];
      if (nodeOut.images && Array.isArray(nodeOut.images)) {
        images.push(...nodeOut.images);
      }
    }

    return { history, images };
  }
}
