---
name: comfyui-api-client
description: Queue ComfyUI workflows, poll for completion, and download results via the HTTP/WebSocket API
version: 0.1.0
---

# ComfyUI API Client Skill

Use this skill when the user wants to programmatically interact with a ComfyUI server — queue prompts, track progress, download generated images, or upload input images.

## When to use
- User wants to run ComfyUI workflows from Node.js/TypeScript code
- User is building an app or n8n workflow that calls ComfyUI
- User asks about the ComfyUI API

## How to use

```typescript
import { ComfyUIClient } from 'comfyui-api-client';

const client = new ComfyUIClient({ host: 'localhost', port: 8188 });

// Queue a workflow
const { prompt_id } = await client.queuePrompt(workflowJson);

// Wait for completion (uses WebSocket for real-time progress)
const result = await client.waitForCompletion(prompt_id);

// Download generated images
for (const image of result.images) {
  const buffer = await client.downloadImage(image.filename, image.subfolder, image.type);
  fs.writeFileSync(`output/${image.filename}`, buffer);
}

// Upload an input image
await client.uploadImage('input.png', imageBuffer);
```

## API methods
- `queuePrompt(workflow)` — POST /prompt
- `getHistory(promptId)` — GET /history/{prompt_id}
- `waitForCompletion(promptId, { timeout?, onProgress? })` — WebSocket-based polling
- `downloadImage(filename, subfolder, type)` — GET /view
- `uploadImage(filename, buffer)` — POST /upload/image
- `getQueue()` — GET /queue
- `interrupt()` — POST /interrupt

## Key behaviors
- TypeScript with full type definitions for ComfyUI API responses
- WebSocket progress tracking with callback support
- Configurable timeout and retry logic
- Works in both standalone Node.js and n8n Code nodes
