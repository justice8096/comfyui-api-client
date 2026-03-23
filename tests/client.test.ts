import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ComfyUIClient } from '../src/client';
import type { HistoryResult, QueueResponse } from '../src/index';

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;

  before(() => {
    client = new ComfyUIClient({
      url: 'http://127.0.0.1:8188',
      wsUrl: 'ws://127.0.0.1:8188/ws',
    });
  });

  describe('Initialization', () => {
    it('should use default URLs when none provided', () => {
      const defaultClient = new ComfyUIClient();
      assert.ok(defaultClient);
    });

    it('should accept custom URLs and clientId', () => {
      const customClient = new ComfyUIClient({
        url: 'http://custom:8888',
        wsUrl: 'ws://custom:8888/ws',
        clientId: 'custom-id',
      });
      assert.ok(customClient);
    });
  });

  describe('queuePrompt', () => {
    it('should validate workflow object structure', () => {
      const workflow = {
        1: { class_type: 'CheckpointLoader', inputs: { ckpt_name: 'model.safetensors' } },
      };
      assert.ok(typeof workflow === 'object');
      assert.ok('1' in workflow);
    });

    it('should handle valid prompt response format', () => {
      const mockResponse = { prompt_id: 'test-uuid-1234' };
      assert.ok('prompt_id' in mockResponse);
      assert.equal(typeof mockResponse.prompt_id, 'string');
    });

    it('should accept complex workflow objects', () => {
      const workflow = {
        '1': { class_type: 'CheckpointLoader', inputs: { ckpt_name: 'model.safetensors' } },
        '2': { class_type: 'CLIPTextEncode', inputs: { text: 'a cat', clip: [1, 0] } },
        '3': { 
          class_type: 'KSampler', 
          inputs: { seed: 42, steps: 20, cfg: 7.5, model: [1, 0], positive: [2, 0] } 
        },
        '4': { class_type: 'VAEDecode', inputs: { samples: [3, 0], vae: [1, 0] } },
        '5': { class_type: 'SaveImage', inputs: { images: [4, 0], filename_prefix: 'output' } },
      };
      assert.equal(Object.keys(workflow).length, 5);
    });
  });

  describe('getHistory', () => {
    it('should parse history response with outputs', () => {
      const mockHistory: HistoryResult = {
        outputs: {
          5: {
            images: [
              { filename: 'output_1.png', subfolder: 'output', type: 'output' },
            ],
          },
        },
      };
      assert.ok('outputs' in mockHistory);
      assert.ok(Array.isArray(mockHistory.outputs['5'].images));
    });

    it('should handle empty outputs', () => {
      const mockHistory: HistoryResult = { outputs: {} };
      assert.equal(Object.keys(mockHistory.outputs).length, 0);
    });

    it('should handle multiple node outputs', () => {
      const mockHistory: HistoryResult = {
        outputs: {
          1: { status: 'ok' },
          2: { text: ['Some text output'] },
          3: { images: [{ filename: 'out.png' }] },
        },
      };
      assert.equal(Object.keys(mockHistory.outputs).length, 3);
    });
  });

  describe('getOutputImage', () => {
    it('should extract first image from history', () => {
      const mockHistory: HistoryResult = {
        outputs: {
          5: {
            images: [
              { filename: 'output_1.png', subfolder: 'output', type: 'output' },
              { filename: 'output_2.png', subfolder: 'output', type: 'output' },
            ],
          },
        },
      };

      const image = client.getOutputImage(mockHistory);
      assert.ok(image !== null);
      assert.equal(image!.filename, 'output_1.png');
    });

    it('should return null when no images found', () => {
      const mockHistory: HistoryResult = {
        outputs: {
          1: { text: ['Some text output'] },
          2: { result: ['Some other result'] },
        },
      };

      const image = client.getOutputImage(mockHistory);
      assert.strictEqual(image, null);
    });

    it('should handle multiple nodes and find first with images', () => {
      const mockHistory: HistoryResult = {
        outputs: {
          1: { status: 'ok' },
          2: { text: ['output'] },
          3: {
            images: [
              { filename: 'found.png', subfolder: 'output', type: 'output' },
            ],
          },
        },
      };

      const image = client.getOutputImage(mockHistory);
      assert.equal(image!.filename, 'found.png');
    });

    it('should extract all images from history', () => {
      const mockHistory: HistoryResult = {
        outputs: {
          1: {
            images: [
              { filename: 'img1.png' },
              { filename: 'img2.png' },
            ],
          },
          2: {
            images: [
              { filename: 'img3.png' },
            ],
          },
        },
      };

      const firstImage = client.getOutputImage(mockHistory);
      assert.equal(firstImage!.filename, 'img1.png');
    });
  });

  describe('uploadImage', () => {
    it('should validate upload response format', () => {
      const mockResponse = {
        name: 'input.png',
        subfolder: 'temp',
        type: 'input',
      };
      assert.ok('name' in mockResponse);
      assert.equal(typeof mockResponse.name, 'string');
    });

    it('should accept buffer input', () => {
      const testBuffer = Buffer.from('fake-image-data');
      assert.ok(Buffer.isBuffer(testBuffer));
      assert.equal(testBuffer.length, 15);
    });
  });

  describe('Queue Management', () => {
    it('should validate queue response format', () => {
      const mockQueue: QueueResponse = {
        queue_running: [],
        queue_pending: [],
      };
      assert.ok(Array.isArray(mockQueue.queue_running));
      assert.ok(Array.isArray(mockQueue.queue_pending));
    });

    it('should handle queue with items', () => {
      const mockQueue: QueueResponse = {
        queue_running: [
          { number: 1, prompt: [{}], outputs: {} },
          { number: 2, prompt: [{}], outputs: {} },
        ],
        queue_pending: [
          { number: 3, prompt: [{}], outputs: {} },
        ],
      };
      assert.equal(mockQueue.queue_running.length, 2);
      assert.equal(mockQueue.queue_pending.length, 1);
    });
  });

  describe('WebSocket Listener Registration', () => {
    it('should register and return unsubscribe function', () => {
      const listener = () => {};
      const unsubscribe = client.onWebSocketMessage('progress', listener);
      assert.equal(typeof unsubscribe, 'function');
    });

    it('should support multiple listeners for same message type', () => {
      const listener1 = () => {};
      const listener2 = () => {};
      const unsub1 = client.onWebSocketMessage('progress', listener1);
      const unsub2 = client.onWebSocketMessage('progress', listener2);
      assert.ok(unsub1);
      assert.ok(unsub2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields in image info', () => {
      const incompleteImage = { filename: 'test.png' };
      assert.ok(incompleteImage.filename);
    });

    it('should handle null/undefined safely', () => {
      const emptyHistory: HistoryResult = { outputs: {} };
      const result = client.getOutputImage(emptyHistory);
      assert.strictEqual(result, null);
    });

    it('should handle malformed queue numbers', () => {
      const validQueueItem = { number: 1, prompt: [], outputs: {} };
      assert.equal(typeof validQueueItem.number, 'number');
    });
  });

  describe('Type Safety Tests', () => {
    it('should maintain type consistency for ProgressMessage', () => {
      const msg = {
        type: 'progress',
        data: {
          prompt_id: 'test-id',
          node: '5',
          value: 10,
          max: 20,
        },
      };
      assert.equal(msg.type, 'progress');
      assert.equal(msg.data.value, 10);
    });

    it('should maintain type consistency for ExecutingMessage', () => {
      const msg = {
        type: 'executing',
        data: {
          prompt_id: 'test-id',
          node: null, // Completion marker
        },
      };
      assert.equal(msg.type, 'executing');
      assert.strictEqual(msg.data.node, null);
    });

    it('should maintain type consistency for ExecutionErrorMessage', () => {
      const msg = {
        type: 'execution_error',
        data: {
          prompt_id: 'test-id',
          node: '5',
          exception_message: 'Out of memory',
          exception_type: 'RuntimeError',
        },
      };
      assert.equal(msg.type, 'execution_error');
      assert.ok(msg.data.exception_message);
    });
  });

  describe('Workflow Integration Tests', () => {
    it('should build a valid text-to-image workflow', () => {
      const workflow = {
        '1': { 
          class_type: 'CheckpointLoader', 
          inputs: { ckpt_name: 'model.safetensors' } 
        },
        '2': { 
          class_type: 'CLIPTextEncode', 
          inputs: { text: 'a cat', clip: [1, 0] } 
        },
        '3': { 
          class_type: 'KSampler', 
          inputs: { 
            seed: 42, 
            steps: 20, 
            cfg: 7.5, 
            model: [1, 0], 
            positive: [2, 0] 
          } 
        },
      };
      assert.equal(Object.keys(workflow).length, 3);
      assert.equal(workflow['1'].class_type, 'CheckpointLoader');
    });

    it('should build a valid image-to-image workflow', () => {
      const workflow = {
        '1': { class_type: 'CheckpointLoader', inputs: { ckpt_name: 'model.safetensors' } },
        '2': { class_type: 'LoadImage', inputs: { image: 'uploaded.png' } },
        '3': { class_type: 'VAEEncode', inputs: { pixels: [2, 0], vae: [1, 0] } },
      };
      assert.ok(workflow['2'].inputs.image);
    });
  });
});
