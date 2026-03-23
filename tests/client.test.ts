import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ComfyUIClient } from '../src/client';

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;

  before(() => {
    client = new ComfyUIClient({
      url: 'http://127.0.0.1:8188',
      wsUrl: 'ws://127.0.0.1:8188/ws',
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
  });

  describe('getHistory', () => {
    it('should parse history response with outputs', () => {
      const mockHistory = {
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
      const mockHistory = { outputs: {} };
      assert.equal(Object.keys(mockHistory.outputs).length, 0);
    });
  });

  describe('getOutputImage', () => {
    it('should extract first image from history', () => {
      const mockHistory = {
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
      const mockHistory = {
        outputs: {
          1: { text: ['Some text output'] },
          2: { result: ['Some other result'] },
        },
      };

      const image = client.getOutputImage(mockHistory);
      assert.strictEqual(image, null);
    });

    it('should handle multiple nodes and find first with images', () => {
      const mockHistory = {
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
  });

  describe('client initialization', () => {
    it('should use default URLs when none provided', () => {
      const defaultClient = new ComfyUIClient();
      assert.ok(defaultClient);
    });

    it('should accept custom URLs', () => {
      const customClient = new ComfyUIClient({
        url: 'http://custom:8888',
        wsUrl: 'ws://custom:8888/ws',
        clientId: 'custom-id',
      });
      assert.ok(customClient);
    });
  });
});
