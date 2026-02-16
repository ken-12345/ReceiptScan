import * as pdfjsLib from 'pdfjs-dist';
// Vite の機能を利用して、パッケージ内のワーカーを URL としてインポート
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Gemini API を使用してレシート画像を解析するサービス
 */
export const analyzeReceipt = async (apiKey, base64Image, mimeType = "image/jpeg", modelName = "gemini-1.5-flash") => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log(`[Gemini] Starting analysis... Model: ${modelName}, MimeMode: ${mimeType}`);

    const prompt = `
あなたは優秀な会計アシスタントです。
提供されたレシートのデータ（画像またはPDFの画像化されたもの）から以下の情報を抽出し、必ず指定されたJSON形式で返答してください。
抽出できない項目がある場合は、空文字列（""）を返してください。

抽出項目:
1. 日付 (format: YYYY/MM/DD)
2. 合計金額 (数値のみ)
3. 支払先 (店名など)
4. 摘要 (購入内容や用途の短い説明)

返答フォーマット:
{
  "date": "2024/01/25",
  "amount": 1250,
  "payee": "Starbucks",
  "description": "コーヒー、サンドイッチ"
}
`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    response_mime_type: "application/json",
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[Gemini] API Error Response:", errorData);
            throw new Error(errorData.error?.message || `HTTP ${response.status}: APIの呼び出しに失敗しました`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("[Gemini] Empty response text:", data);
            throw new Error("APIから有効なテキストが返されませんでした。");
        }

        console.log("[Gemini] Raw response text:", text);

        // Markdown の JSON ブロックがある場合は除去
        text = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();

        try {
            return JSON.parse(text);
        } catch (parseErr) {
            console.error("[Gemini] JSON Parse Error. Text:", text);
            throw new Error("JSONの解析に失敗しました。AIが正しい形式で回答しませんでした。");
        }
    } catch (err) {
        console.error("[Gemini] Fetch or Logic Error:", err);
        throw err;
    }
};

/**
 * ファイルを Base64 に変換する（画像用）
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => {
            console.error("[fileToBase64] Error reading file:", error);
            reject(error);
        };
    });
};

/**
 * PDF の 1 ページ目を画像 (Base64) に変換する
 */
export const pdfToImageBase64 = async (file) => {
    console.log("[pdfToImageBase64] Starting sequence for:", file.name);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        console.log(`[pdfToImageBase64] PDF loaded. Pages: ${pdf.numPages}`);

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        console.log("[pdfToImageBase64] Page 1 rendered to canvas.");

        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl.split(',')[1];
    } catch (err) {
        console.error("[pdfToImageBase64] Error during PDF rendering:", err);
        throw new Error(`PDFの画像化に失敗しました: ${err.message}`);
    }
};

/**
 * 利用可能なモデル一覧を取得する
 */
export const fetchAvailableModels = async (apiKey) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log("[Gemini] Fetching available models...");

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}: モデル一覧の取得に失敗しました`);
        }

        const data = await response.json();
        // generateContent をサポートしているモデルのみを抽出
        return data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => ({
                id: m.name.split('/').pop(), // "models/gemini-1.5-flash" -> "gemini-1.5-flash"
                displayName: m.displayName,
                description: m.description
            }));
    } catch (err) {
        console.error("[Gemini] FetchModels Error:", err);
        throw err;
    }
};
