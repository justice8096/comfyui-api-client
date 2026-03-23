/**
 * ComfyUI API Type Definitions
 */

export interface ComfyUIClientOptions {
  url?: string;
  wsUrl?: string;
  clientId?: string;
}

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

export interface ProgressCallback {
  (current: number, max: number): void;
}

export interface WebSocketMessage {
  type: string;
  data?: {
    prompt_id?: string;
    node?: string | null;
    value?: number;
    max?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
