
import { IncidentReport, IncidentType, IncidentStatus } from '../types';

/**
 * แทนที่ URL ด้านล่างนี้ด้วย 'Web App URL' ที่ท่านได้จากการ Deploy Google Apps Script
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRENxCLj_PX6x-fNfTODxb3EcFRQygmdkLCYpPgEjKThPUPKPOuApNuWgb1HpgLkDF/exec';

// ฟังก์ชันสำหรับแปลงประเภทเหตุการณ์เป็นภาษาไทย
const translateType = (type: IncidentType): string => {
  const types: Record<IncidentType, string> = {
    [IncidentType.FIRE]: 'เพลิงไหม้',
    [IncidentType.ACCIDENT]: 'อุบัติเหตุ',
    [IncidentType.SICK]: 'กู้ชีพ/ป่วย',
    [IncidentType.ANIMAL]: 'สัตว์มีพิษ',
    [IncidentType.OTHER]: 'เหตุอื่นๆ'
  };
  return types[type] || type;
};

// ฟังก์ชันสำหรับแปลงสถานะเป็นภาษาไทย
const translateStatus = (status: IncidentStatus | string): string => {
  const statuses: Record<string, string> = {
    [IncidentStatus.PENDING]: 'รอรับเรื่อง',
    [IncidentStatus.IN_PROGRESS]: 'กำลังปฏิบัติงาน',
    [IncidentStatus.RESOLVED]: 'สำเร็จ/ปิดงาน',
    [IncidentStatus.CANCELLED]: 'ยกเลิก'
  };
  return statuses[status] || status;
};

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
        type: translateType(incident.type), // แปลเป็นไทย
        description: incident.description,
        reporter: incident.reporterName,
        phone: incident.phone,
        lat: incident.location.lat,
        lng: incident.location.lng,
        address: incident.location.address || '-',
        mediaData: incident.mediaUrl || "", 
        status: translateStatus(IncidentStatus.PENDING) // แปลเป็นไทย
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
        status: translateStatus(status), // แปลเป็นไทย
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
