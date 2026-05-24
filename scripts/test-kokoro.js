import { KokoroTTS } from "kokoro-js";
import fs from "fs";

async function main() {
  console.log("Loading model...");
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.1-zh-ONNX", {
    dtype: "q8",
    device: "cpu"
  });
  console.log("Model loaded! Generating speech...");
  const audio = await tts.generate("你好，這是 Kokoro 測試。", {
    voice: "af_sky"
  });
  console.log("Speech generated! Saving to wav...");
  audio.save("output.wav");
  console.log("Done!");
}

main().catch(console.error);
