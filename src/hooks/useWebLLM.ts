import { useState, useCallback, useEffect } from 'react';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';

export function useWebLLM() {
    const [engine, setEngine] = useState<MLCEngineInterface | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("未初始化");
    const [isLoaded, setIsLoaded] = useState(false);
    const [webGPUAvailable, setWebGPUAvailable] = useState<boolean | null>(null);
    const [webGPUSupportMessage, setWebGPUSupportMessage] = useState("");

    // Check WebGPU availability on mount
    useEffect(() => {
        if (typeof navigator === 'undefined') return;
        
        if ('gpu' in navigator) {
            setWebGPUAvailable(true);
            setWebGPUSupportMessage("支援 WebGPU (可啟用瀏覽器本機 AI 引擎)");
        } else {
            setWebGPUAvailable(false);
            setStatus("本機 AI 不可用 (瀏覽器不支援 WebGPU)");
            setWebGPUSupportMessage("您的瀏覽器不支援 WebGPU。請換用最新版的 Chrome、Edge 或 Opera 瀏覽器，或者在設定中切換使用 Gemini 雲端金鑰進行對話。");
        }
    }, []);

    const init = useCallback(async () => {
        if (engine) return;
        
        if (webGPUAvailable === false) {
            console.warn("WebGPU not available, fallback is required.");
            setStatus("初始化失敗: 瀏覽器不支援 WebGPU");
            return;
        }

        setStatus("正在載入 AI 引擎核心...");
        try {
            // Lazy load the huge MLC AI package to optimize initial page loading
            const webllm = await import('@mlc-ai/web-llm');
            
            setStatus("正在初始化...");
            const initProgressCallback = (report: { progress: number; text: string }) => {
                setProgress(Math.round(report.progress * 100));
                setStatus(report.text);
            };

            // Using Gemma model as requested
            const selectedModel = "gemma-2b-it-q4f32_1-MLC";
            const newEngine = await webllm.CreateMLCEngine(
                selectedModel,
                { initProgressCallback }
            );
            setEngine(newEngine);
            setIsLoaded(true);
            setStatus("準備就緒");
        } catch (err) {
            console.error("WebLLM Init Error:", err);
            setStatus("初始化失敗: " + (err instanceof Error ? err.message : String(err)));
        }
    }, [engine, webGPUAvailable]);

    return { engine, progress, status, isLoaded, init, webGPUAvailable, webGPUSupportMessage };
}

