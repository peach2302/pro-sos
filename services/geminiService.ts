
import { GoogleGenAI, Type } from "@google/genai";

/**
 * ฟังก์ชันดึง AI Instance อย่างปลอดภัย
 * รองรับการดึงค่าจาก Environment Variables ทั้งบน Render และ Netlify
 */
const getAIInstance = () => {
  const apiKey = (import.meta as any).env?.VITE_API_KEY || 
                 (typeof process !== 'undefined' ? process.env.API_KEY : '') || 
                 (window as any).API_KEY;
                 
  if (!apiKey) {
    console.warn("Missing Gemini API Key. Please set API_KEY in your deployment settings.");
  }
  
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export async function analyzeIncident(description: string, mediaBase64?: string, mediaMimeType?: string) {
  try {
    const ai = getAIInstance();
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
      // ตัดส่วนหัว data:image/jpeg;base64, ออกเพื่อให้ Gemini ประมวลผลได้
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
