
import { IncidentReport } from '../types';

/**
 * URL ของ Google Apps Script (Web App)
 * ท่านได้ส่งลิงก์นี้มาล่าสุด: https://script.google.com/macros/s/AKfycbzRENxCLj_PX6x-fNfTODxb3EcFRQygmdkLCYpPgEjKThPUPKPOuApNuWgb1HpgLkDF/exec
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRENxCLj_PX6x-fNfTODxb3EcFRQygmdkLCYpPgEjKThPUPKPOuApNuWgb1HpgLkDF/exec';

/**
 * --- คัดลอกโค้ดด้านล่างนี้ไปวางใน Google Apps Script (ไฟล์ .gs) เพื่อรองรับคอลัมน์ G (ลายเซ็น) ---
 * 
 * function doPost(e) {
 *   try {
 *     var requestData = JSON.parse(e.postData.contents);
 *     var action = requestData.action;
 *     var sheetId = requestData.sheetId;
 *     var folderId = requestData.folderId;
 *     var data = requestData.data;
 *     var ss = SpreadsheetApp.openById(sheetId);
 *     
 *     if (action === "new_report") {
 *       var sheet = ss.getSheetByName("ผู้แจ้ง") || ss.getSheets()[0];
 *       var mediaUrl = "";
 *       if (data.mediaData && data.mediaData.includes("base64")) {
 *         mediaUrl = saveFileToDrive(data.mediaData, folderId, "INCIDENT_" + data.id);
 *       }
 *       sheet.appendRow([
 *         new Date().toLocaleString('th-TH'),
 *         data.id, data.type, data.description, data.reporter,
 *         data.phone, data.address, data.lat, data.lng, mediaUrl
 *       ]);
 *       return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
 *     }
 *     
 *     else if (action === "update_status") {
 *       var officerSheet = ss.getSheetByName("เจ้าหน้าที่");
 *       if (!officerSheet) return ContentService.createTextOutput("Error: Sheet เจ้าหน้าที่ not found").setMimeType(ContentService.MimeType.TEXT);
 *
 *       var closingMediaUrl = "";
 *       if (data.closingMediaData && data.closingMediaData.includes("base64")) {
 *         closingMediaUrl = saveFileToDrive(data.closingMediaData, folderId, "RESOLVED_" + data.id);
 *       }
 *
 *       var signatureUrl = "";
 *       if (data.signatureData && data.signatureData.includes("base64")) {
 *         signatureUrl = saveFileToDrive(data.signatureData, folderId, "SIG_" + data.id);
 *       }
 *
 *       // บันทึกลงแถวใหม่: A:วันที่ | B:รหัส | C:สถานะ | D:รูปปิดงาน | E:ชื่อเจ้าหน้าที่ | F:ตำแหน่ง | G:ลายเซ็น
 *       officerSheet.appendRow([
 *         new Date().toLocaleString('th-TH'), // A
 *         data.id,                           // B
 *         data.status,                       // C
 *         closingMediaUrl,                   // D
 *         data.officerName,                  // E
 *         data.officerPosition,              // F
 *         signatureUrl                       // G (ลายเซ็น)
 *       ]);
 *       
 *       return ContentService.createTextOutput("Status Updated Successfully").setMimeType(ContentService.MimeType.TEXT);
 *     }
 *   } catch (error) {
 *     return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
 *   }
 * }
 *
 * function saveFileToDrive(base64Data, folderId, fileName) {
 *   var folder = DriveApp.getFolderById(folderId);
 *   var contentType = base64Data.substring(5, base64Data.indexOf(';'));
 *   var bytes = Utilities.base64Decode(base64Data.split(',')[1]);
 *   var blob = Utilities.newBlob(bytes, contentType, fileName);
 *   var file = folder.createFile(blob);
 *   file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
 *   return file.getUrl();
 * }
 */

export async function sendIncidentToGoogleCloud(incident: any, sheetId: string, folderId: string) {
  if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_URL')) return { success: false };
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
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error) {
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
        signatureData: fullIncident.signatureUrl || "" // ส่งลายเซ็นเจ้าหน้าที่ (Base64)
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
    return { success: false, error };
  }
}
