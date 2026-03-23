# ComfyUI API Client

A complete TypeScript/Node.js client for the ComfyUI API. Provides REST and WebSocket support for queuing workflows, monitoring progress, and managing images.

## Installation

```bash
npm install comfyui-api-client
```

## Features

- **REST API Methods**: Queue prompts, fetch history, download/upload images, manage queues
- **WebSocket Support**: Real-time progress monitoring during execution with event listeners
- **Queue Management**: Check queue status, clear pending prompts, remove specific items
- **TypeScript**: Fully typed interfaces for all ComfyUI API responses
- **Native Fetch**: Uses Node.js 18+ native fetch API (no external HTTP library)
- **Convenience Methods**: High-level `execute()` for queue → wait → results workflow

## Usage

### Basic Setup

```typescript
import { ComfyUIClient } from 'comfyui-api-client';

const client = new ComfyUIClient({
  url: 'http://127.0.0.1:8188',
  wsUrl: 'ws://127.0.0.1:8188/ws',
  clientId: 'my-client-id', // optional, auto-generated if omitted
});
```

### Text-to-Image with Progress

```typescript
// Define your workflow (nodes and connections)
const workflow = {
  1: { class_type: 'CheckpointLoader', inputs: { ckpt_name: 'model.safetensors' } },
  2: { class_type: 'CLIPTextEncode', inputs: { text: 'a cat', clip: [1, 0] } },
  3: { class_type: 'KSampler', inputs: { seed: 42, steps: 20, cfg: 7.5, model: [1, 0], positive: [2, 0] } },
  4: { class_type: 'VAEDecode', inputs: { samples: [3, 0], vae: [1, 0] } },
  5: { class_type: 'SaveImage', inputs: { images: [4, 0], filename_prefix: 'output' } },
};

// Execute workflow with progress tracking
const result = await client.execute(workflow, (current, max) => {
  console.log(`Progress: ${current}/${max}`);
});

// Download first output image
if (result.images.length > 0) {
  const imageInfo = result.images[0];
  const buffer = await client.downloadImage(
    imageInfo.filename,
    imageInfo.subfolder,
    imageInfo.type
  );
  // save buffer to file...
}
```

### Advanced: Manual Control with WebSocket Events

```typescript
// Queue the workflow
const { prompt_id } = await client.queuePrompt(workflow);

// Subscribe to WebSocket progress events
const unsubscribe = client.onWebSocketMessage('progress', (msg) => {
  if (msg.data?.prompt_id === prompt_id) {
    const { value, max } = msg.data;
    console.log(`Node progress: ${value}/${max}`);
  }
});

// Wait for completion
const history = await client.waitForCompletion(prompt_id, (current, max) => {
  console.log(`Overall progress: ${current}/${max}`);
});

// Clean up listener
unsubscribe();

// Process results
const imageInfo = client.getOutputImage(history);
if (imageInfo) {
  const buffer = await client.downloadImage(
    imageInfo.filename,
    imageInfo.subfolder,
    imageInfo.type
  );
}
```

### Image-to-Image Workflow

```typescript
import fs from 'fs';

// Upload input image
const inputBuffer = fs.readFileSync('input.png');
const uploaded = await client.uploadImage(inputBuffer, 'input.png');
console.log(`Uploaded as: ${uploaded.name}`);

// Define workflow using uploaded image
const workflow = {
  1: { class_type: 'CheckpointLoader', inputs: { ckpt_name: 'model.safetensors' } },
  2: { class_type: 'LoadImage', inputs: { image: uploaded.name } },
  3: { class_type: 'VAEEncode', inputs: { pixels: [2, 0], vae: [1, 0] } },
  4: { class_type: 'KSampler', inputs: { seed: 42, steps: 20, cfg: 7.5, model: [1, 0], positive: [2, 0] } },
  5: { class_type: 'VAEDecode', inputs: { samples: [4, 0], vae: [1, 0] } },
  6: { class_type: 'SaveImage', inputs: { images: [5, 0], filename_prefix: 'output' } },
};

const result = await client.execute(workflow);
```

### Queue Management

```typescript
// Check queue status
const queueStatus = await client.getQueue();
console.log(`Running: ${queueStatus.queue_running.length} prompts`);
console.log(`Pending: ${queueStatus.queue_pending.length} prompts`);

// Queue multiple workflows
const promptIds = [];
for (const workflow of workflows) {
  const { prompt_id, number } = await client.queuePrompt(workflow);
  promptIds.push({ id: prompt_id, number });
}

// Monitor and process results
for (const { id, number } of promptIds) {
  console.log(`Processing prompt ${number} (${id})...`);
  const history = await client.waitForCompletion(id);
  const imageInfo = client.getOutputImage(history);
  if (imageInfo) {
    const buffer = await client.downloadImage(imageInfo.filename);
    // Process buffer...
  }
}

// Clear pending queue
await client.clearQueue(true); // Only clear unfinished

// Remove specific prompt from queue
const { queue_pending } = await client.getQueue();
if (queue_pending.length > 0) {
  const queueNumber = queue_pending[0].number;
  await client.removeFromQueue(queueNumber);
  console.log(`Removed prompt #${queueNumber} from queue`);
}
```

### Batch Processing with Error Handling

```typescript
// Queue multiple workflows and handle results
const results = [];
for (const workflow of workflows) {
  try {
    const { prompt_id } = await client.queuePrompt(workflow);
    
    // Wait for completion with timeout (5 min default)
    const history = await client.waitForCompletion(prompt_id, (current, max) => {
      process.stdout.write(`\rProgress: ${current}/${max}`);
    });
    
    // Extract images
    const images = [];
    const output = history.outputs;
    for (const nodeId of Object.keys(output)) {
      const node = output[nodeId];
      if (node.images) {
        images.push(...node.images);
      }
    }
    
    results.push({ prompt_id, images, success: true });
  } catch (err) {
    console.error(`Failed to process workflow:`, err);
    results.push({ prompt_id: 'unknown', images: [], success: false, error: String(err) });
  }
}
```

### WebSocket Event Monitoring

```typescript
// Listen to all message types
const progressUnsub = client.onWebSocketMessage('progress', (msg) => {
  console.log('Progress:', msg.data);
});

const executingUnsub = client.onWebSocketMessage('executing', (msg) => {
  console.log('Executing node:', msg.data?.node);
});

const errorUnsub = client.onWebSocketMessage('execution_error', (msg) => {
  console.error('Error on node:', msg.data?.node, msg.data?.exception_message);
});

const statusUnsub = client.onWebSocketMessage('status', (msg) => {
  console.log('Queue remaining:', msg.data?.status?.exec_info?.queue_remaining);
});

// Queue and wait
const { prompt_id } = await client.queuePrompt(workflow);
const history = await client.waitForCompletion(prompt_id);

// Unsubscribe when done
progressUnsub();
executingUnsub();
errorUnsub();
statusUnsub();
```

## API Reference

### Constructor

```typescript
new ComfyUIClient(options?: ComfyUIClientOptions)
```

**Options:**
- `url` (string, default: `http://127.0.0.1:8188`) - ComfyUI HTTP server URL
- `wsUrl` (string, default: `ws://127.0.0.1:8188/ws`) - ComfyUI WebSocket URL
- `clientId` (string, default: UUID) - Unique client identifier

### Methods

#### `queuePrompt(workflow: object): Promise<{prompt_id: string; number?: number}>`

Queue a workflow for execution.

```typescript
const { prompt_id, number } = await client.queuePrompt(workflow);
```

#### `getHistory(promptId: string): Promise<HistoryResult>`

Fetch execution history and results for a completed prompt.

```typescript
const history = await client.getHistory(promptId);
```

#### `downloadImage(filename: string, subfolder?: string, type?: string): Promise<Buffer>`

Download an image file from ComfyUI.

```typescript
const buffer = await client.downloadImage('output_1.png', 'output', 'output');
```

#### `uploadImage(buffer: Buffer, filename: string): Promise<{name, subfolder?, type?}>`

Upload an image file to ComfyUI for use in workflows.

```typescript
const { name } = await client.uploadImage(imageBuffer, 'input.png');
```

#### `waitForCompletion(promptId: string, onProgress?: (current, max) => void): Promise<HistoryResult>`

Wait for a queued prompt to complete via WebSocket. Optionally track progress.

```typescript
const history = await client.waitForCompletion(promptId, (current, max) => {
  console.log(`${current}/${max}`);
});
```

#### `getOutputImage(historyResult: HistoryResult): ImageInfo | null`

Extract the first output image from history results.

```typescript
const imageInfo = client.getOutputImage(history);
```

#### `execute(workflow: object, onProgress?: (current, max) => void): Promise<{history, images}>`

High-level convenience method: queue + wait + extract images.

```typescript
const result = await client.execute(workflow, (current, max) => {
  console.log(`Progress: ${current}/${max}`);
});
```

#### `getQueue(): Promise<{queue_running: QueueItem[]; queue_pending: QueueItem[]}>`

Get the current queue status.

```typescript
const { queue_running, queue_pending } = await client.getQueue();
```

#### `clearQueue(unfinishedOnly?: boolean): Promise<{status: 'ok' | 'error'}>`

Clear pending prompts from the queue.

```typescript
await client.clearQueue(true); // Clear only unfinished
```

#### `removeFromQueue(queueNumber: number): Promise<{status: 'ok' | 'error'}>`

Remove a specific prompt from the queue by number.

```typescript
await client.removeFromQueue(5);
```

#### `onWebSocketMessage(messageType: string, listener: (msg) => void): () => void`

Register a WebSocket event listener. Returns an unsubscribe function.

```typescript
const unsubscribe = client.onWebSocketMessage('progress', (msg) => {
  console.log(msg.data);
});

// Later...
unsubscribe();
```

## WebSocket Message Types

The client emits several message types via WebSocket:

- **`progress`** - Node execution progress: `{value: number, max: number, node: string}`
- **`executing`** - Node execution state: `{node: string | null}`
  - `node: null` indicates workflow completion
- **`execution_error`** - Execution failure: `{node: string, exception_message: string}`
- **`execution_exception`** - Unexpected exception: `{exception_message: string, traceback: string[]}`
- **`status`** - Server status: `{status: {exec_info: {queue_remaining: number}}}`

## Error Handling

The client throws errors with descriptive messages:

```typescript
try {
  await client.queuePrompt(workflow);
} catch (err) {
  if (err.message.includes('failed')) {
    console.error('API error:', err.message);
  }
}
```

Common errors:
- Network errors: WebSocket connection failures
- Timeout errors: Execution exceeds 5 minutes (configurable in code)
- HTTP errors: API returns non-2xx status code
- JSON parse errors: Malformed response from server

## Testing

```bash
npm test
```

Tests cover:
- Client initialization
- Type structures
- Message parsing
- Workflow building
- Error scenarios

## TypeScript Types

All responses are fully typed:

```typescript
import type {
  ComfyUIClientOptions,
  QueuePromptResponse,
  HistoryResult,
  ImageInfo,
  UploadImageResponse,
  ExecuteResult,
  ProgressCallback,
  QueueResponse,
  WebSocketMessage,
  ProgressMessage,
  ExecutingMessage,
  ExecutionErrorMessage,
} from 'comfyui-api-client';
```

## License

MIT
