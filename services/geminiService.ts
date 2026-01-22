
import { GoogleGenAI, Type } from "@google/genai";

// กำหนดค่าเริ่มต้นของ AI Instance โดยใช้ API_KEY จาก environment variable
// ซึ่งจะถูกแทนที่ค่าจริงในขั้นตอนการ Build โดย Vite
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function analyzeIncident(description: string, mediaBase64?: string, mediaMimeType?: string) {
  try {
    const parts: any[] = [
      { 
        text: `คุณคือ AI ผู้ช่วยวิเคราะห์เหตุฉุกเฉินสำหรับศูนย์รับแจ้งเหตุ อบต.หนองทุ่ม
        หน้าที่ของคุณ:
        1. วิเคราะห์ความรุนแรง (severity): LOW, MEDIUM, HIGH, CRITICAL
        2. สรุปรายละเอียดเหตุการณ์ให้กระชับและชัดเจนสำหรับเจ้าหน้าที่ (summary)
        3. ให้คำแนะนำเบื้องต้นสำหรับผู้แจ้งเหตุ (advice) เพื่อความปลอดภัยก่อนเจ้าหน้าที่ไปถึง
        
        รายละเอียดจากผู้แจ้ง: "${description}"`
      }
    ];
    
    if (mediaBase64 && mediaMimeType && mediaMimeType.startsWith('image/')) {
      const base64Data = mediaBase64.includes(',') ? mediaBase64.split(',')[1] : mediaBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mediaMimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING },
            summary: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["severity", "summary", "advice"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { 
      severity: "MEDIUM", 
      summary: description, 
      advice: "กรุณารอในที่ปลอดภัยและปฏิบัติตามคำแนะนำของเจ้าหน้าที่ทางโทรศัพท์" 
    };
  }
}
