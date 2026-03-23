/**
 * ComfyUI API Type Definitions
 */

export interface ComfyUIClientOptions {
  url?: string;
  wsUrl?: string;
  clientId?: string;
}

// === Queue Management ===

export interface QueueItem {
  number: number;
  prompt: unknown[];
  outputs: Record<string, unknown>;
}

export interface QueueResponse {
  queue_running: QueueItem[];
  queue_pending: QueueItem[];
}

export interface QueueClearResponse {
  status: 'ok' | 'error';
}

// === Prompt & Execution ===

export interface QueuePromptResponse {
  prompt_id: string;
  number?: number;
}

export interface ImageInfo {
  filename: string;
  subfolder?: string;
  type?: string;
}

export interface NodeOutput {
  images?: ImageInfo[];
  [key: string]: unknown;
}

export interface HistoryResult {
  outputs: {
    [nodeId: string]: NodeOutput;
  };
  [key: string]: unknown;
}

export interface UploadImageResponse {
  name: string;
  subfolder?: string;
  type?: string;
}

export interface ExecuteResult {
  history: HistoryResult;
  images: ImageInfo[];
}

// === Callbacks ===

export interface ProgressCallback {
  (current: number, max: number): void;
}

export type WebSocketEventListener = (message: WebSocketMessage) => void;

// === WebSocket Messages ===

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage {
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Progress message: sent during node execution
 * type: "progress"
 */
export interface ProgressMessage extends WebSocketMessage {
  type: 'progress';
  data?: {
    prompt_id?: string;
    node?: string;
    value?: number;
    max?: number;
  };
}

/**
 * Executing message: sent before/after node execution
 * When node is null, execution is complete
 * type: "executing"
 */
export interface ExecutingMessage extends WebSocketMessage {
  type: 'executing';
  data?: {
    prompt_id?: string;
    node?: string | null;
  };
}

/**
 * Execution error message
 * type: "execution_error"
 */
export interface ExecutionErrorMessage extends WebSocketMessage {
  type: 'execution_error';
  data?: {
    prompt_id?: string;
    node?: string;
    exception_message?: string;
    exception_type?: string;
    traceback?: string[];
  };
}

/**
 * Execution exception message (different from error)
 * type: "execution_exception"
 */
export interface ExecutionExceptionMessage extends WebSocketMessage {
  type: 'execution_exception';
  data?: {
    prompt_id?: string;
    exception_message?: string;
    exception_type?: string;
    traceback?: string[];
  };
}

/**
 * Status message: sent periodically with server status
 * type: "status"
 */
export interface StatusMessage extends WebSocketMessage {
  type: 'status';
  data?: {
    status?: {
      exec_info?: {
        queue_remaining: number;
      };
    };
  };
}

// Discriminated union of all WebSocket message types
export type ComfyUIWebSocketMessage = 
  | ProgressMessage
  | ExecutingMessage
  | ExecutionErrorMessage
  | ExecutionExceptionMessage
  | StatusMessage
  | WebSocketMessage; // fallback for unknown types
