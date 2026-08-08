import type { RecognitionResult } from "@/lib/validation";

export type RecognitionInput = {
  imageDataUrl: string;
};

export type RecognitionProvider = {
  name: "QWEN";
  recognize: (input: RecognitionInput) => Promise<RecognitionResult>;
};

export type QwenRecognitionProviderConfig = {
  apiKey: string;
  model: string;
};

export function createQwenRecognitionProvider(_config: QwenRecognitionProviderConfig): RecognitionProvider {
  return {
    name: "QWEN",
    async recognize(_input: RecognitionInput): Promise<RecognitionResult> {
      throw new Error("Qwen recognition is intentionally enabled in P0-3, not P0-0");
    },
  };
}
