# ComfyUI API Client

A complete TypeScript/Node.js client for the ComfyUI API. Provides REST and WebSocket support for queuing workflows, monitoring progress, and managing images.

## Installation

```bash
npm install comfyui-api-client
```

## Features

- **REST API Methods**: Queue prompts, fetch history, download images, upload images
- **WebSocket Support**: Real-time progress monitoring during execution
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

### Text-to-Image

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

### Image-to-Image

```typescript
// Upload input image
const inputBuffer = fs.readFileSync('input.png');
const uploaded = await client.uploadImage(inputBuffer, 'input.png');

// Define workflow using uploaded image
const workflow = {
  1: { class_type: 'CheckpointLoader', inputs: { ckpt_name: 'model.safetensors' } },
  2: { class_type: 'LoadImage', inputs: { image: uploaded.name } },
  3: { class_type: 'VAEEncode', inputs: { pixels: [2, 0], vae: [1, 0] } },
  // ... img2img nodes
};

const result = await client.execute(workflow);
```

### Batch Processing with Manual Control

```typescript
// Queue multiple workflows
const promptIds = [];
for (const prompt of prompts) {
  const { prompt_id } = await client.queuePrompt(prompt);
  promptIds.push(prompt_id);
}

// Wait for all to complete
for (const promptId of promptIds) {
  const history = await client.waitForCompletion(promptId, (current, max) => {
    console.log(`[${promptId}] ${current}/${max}`);
  });

  const imageInfo = client.getOutputImage(history);
  if (imageInfo) {
    const buffer = await client.downloadImage(
      imageInfo.filename,
      imageInfo.subfolder,
      imageInfo.type
    );
    // process buffer...
  }
}
```

## API Reference

### Constructor

```typescript
new ComfyUIClient(options?: ComfyUIClientOptions)
```

### Methods

#### `queuePrompt(workflow: object): Promise<{prompt_id: string}>`

Queue a workflow for execution.

#### `getHistory(promptId: string): Promise<HistoryResult>`

Fetch execution history and results for a completed prompt.

#### `downloadImage(filename: string, subfolder?: string, type?: string): Promise<Buffer>`

Download an image file from ComfyUI.

#### `uploadImage(buffer: Buffer, filename: string): Promise<{name, subfolder, type}>`

Upload an image file to ComfyUI.

#### `waitForCompletion(promptId: string, onProgress?: (current, max) => void): Promise<HistoryResult>`

Wait for a queued prompt to complete via WebSocket. Optionally track progress.

#### `getOutputImage(historyResult: HistoryResult): ImageInfo | null`

Extract the first output image from history results.

#### `execute(workflow: object, onProgress?: (current, max) => void): Promise<{history, images}>`

High-level convenience method: queue + wait + extract images.

## License

MIT
