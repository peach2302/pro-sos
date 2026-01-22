
import { IncidentReport } from '../types';

/**
 * แทนที่ URL ด้านล่างนี้ด้วย 'Web App URL' ที่ท่านได้จากการ Deploy Google Apps Script
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRENxCLj_PX6x-fNfTODxb3EcFRQygmdkLCYpPgEjKThPUPKPOuApNuWgb1HpgLkDF/exec';

export async function sendIncidentToGoogleCloud(incident: any, sheetId: string, folderId: string) {
  if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_URL')) {
    console.error("API URL is missing");
    return { success: false };
  }
  
  try {
    const payload = {
      sheetId,
      folderId,
      action: "new_report",
      data: {
        id: incident.id,
        type: incident.type,
        description: incident.description,
        reporter: incident.reporterName,
        phone: incident.phone,
        lat: incident.location.lat,
        lng: incident.location.lng,
        address: incident.location.address || '-',
        mediaData: incident.mediaUrl || "", 
        status: "PENDING"
      }
    };

    // ใช้ mode: 'no-cors' สำหรับ Apps Script หากต้องการแค่ส่งข้อมูล (จะไม่ได้รับ JSON response กลับมาแต่ข้อมูลจะเข้าปกติ)
    // หรือถ้าต้องการรับ Response ต้องตั้งค่า CORS ใน Apps Script และใช้ fetch ปกติ
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, error };
  }
}

export async function updateIncidentStatusInGoogleCloud(
  incidentId: string, 
  status: string, 
  closingMediaUrl: string, 
  officerName: string,
  officerPosition: string,
  sheetId: string, 
  folderId: string,
  fullIncident: IncidentReport
) {
  if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_URL')) return { success: false };
  
  try {
    const payload = {
      sheetId,
      folderId,
      action: "update_status",
      data: {
        id: incidentId,
        status: status,
        officerName: officerName,      
        officerPosition: officerPosition,
        closingMediaData: closingMediaUrl || "",
        signatureData: fullIncident.signatureUrl || "" 
      }
    };

    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
    return { success: false, error };
  }
}
