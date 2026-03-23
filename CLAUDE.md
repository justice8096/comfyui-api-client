# ComfyUI API Client

## Purpose
Full-featured Node.js/TypeScript client for the ComfyUI HTTP and WebSocket APIs. Handles workflow submission, progress tracking, image download/upload, and result extraction.

## Tools & Stack
- **TypeScript** with ES modules
- **WebSocket** (ws) for real-time progress
- **Node.js** 18+ (native fetch)

## Directory Structure
```
src/
  index.ts             — Main exports
  client.ts            — ComfyUIClient class (HTTP + WebSocket)
  types.ts             — TypeScript interfaces for ComfyUI API
tests/
  client.test.ts       — Client tests
```

## Key Commands
```bash
npm install comfyui-api-client
npm test
npm run build
```

## API
```typescript
import { ComfyUIClient } from 'comfyui-api-client';

const client = new ComfyUIClient('http://127.0.0.1:8188');
const { prompt_id } = await client.queuePrompt(workflow);
const result = await client.waitForCompletion(prompt_id, (value, max) => {
  console.log(`Progress: ${value}/${max}`);
});
const imageBuffer = await client.downloadImage(result.images[0]);
```

## Technical Notes
- Supports both GUI-saved and API-format workflow JSONs
- WebSocket progress tracking with configurable timeout (default 5 min)
- Image upload via multipart form for img2img workflows
- Extracts first output image from any output node automatically
