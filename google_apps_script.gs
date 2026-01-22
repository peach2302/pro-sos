
/**
 * API สำหรับระบบรับแจ้งเหตุ อบต.หนองทุ่ม
 * รับข้อมูลจาก Frontend เพื่อบันทึกลง Google Sheets และ Google Drive
 */

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const sheetId = requestData.sheetId;
    const folderId = requestData.folderId;
    const data = requestData.data;
    const ss = SpreadsheetApp.openById(sheetId);
    
    // 1. จัดการการแจ้งเหตุใหม่
    if (action === "new_report") {
      let sheet = ss.getSheetByName("ผู้แจ้ง");
      if (!sheet) {
        sheet = ss.insertSheet("ผู้แจ้ง");
        sheet.appendRow(["วันที่-เวลา", "รหัสเหตุการณ์", "ประเภท", "รายละเอียด", "ชื่อผู้แจ้ง", "เบอร์โทร", "ที่อยู่/พิกัด", "Lat", "Lng", "ลิงก์รูปภาพ"]);
      }
      
      let mediaUrl = "";
      if (data.mediaData && data.mediaData.includes("base64")) {
        mediaUrl = saveFileToDrive(data.mediaData, folderId, "INCIDENT_" + data.id);
      }
      
      sheet.appendRow([
        new Date().toLocaleString('th-TH'),
        data.id,
        data.type,
        data.description,
        data.reporter,
        "'" + data.phone, // ใส่ ' เพื่อป้องกัน Google Sheet ตัดเลข 0 ตัวหน้า
        data.address,
        data.lat,
        data.lng,
        mediaUrl
      ]);
      
      return createResponse("Success");
    }
    
    // 2. อัปเดตสถานะและปิดงานโดยเจ้าหน้าที่
    else if (action === "update_status") {
      let officerSheet = ss.getSheetByName("เจ้าหน้าที่");
      if (!officerSheet) {
        officerSheet = ss.insertSheet("เจ้าหน้าที่");
        officerSheet.appendRow(["วันที่-เวลา", "รหัสเหตุการณ์", "สถานะ", "ชื่อเจ้าหน้าที่", "ตำแหน่ง", "รูปปิดงาน", "ลายเซ็น"]);
      }

      let closingMediaUrl = "";
      if (data.closingMediaData && data.closingMediaData.includes("base64")) {
        closingMediaUrl = saveFileToDrive(data.closingMediaData, folderId, "RESOLVED_" + data.id);
      }

      let signatureUrl = "";
      if (data.signatureData && data.signatureData.includes("base64")) {
        signatureUrl = saveFileToDrive(data.signatureData, folderId, "SIG_" + data.id);
      }

      officerSheet.appendRow([
        new Date().toLocaleString('th-TH'),
        data.id,
        data.status,
        data.officerName,
        data.officerPosition,
        closingMediaUrl,
        signatureUrl
      ]);
      
      return createResponse("Status Updated Successfully");
    }
    
  } catch (error) {
    return createResponse("Error: " + error.toString());
  }
}

/**
 * ฟังก์ชันบันทึกไฟล์ Base64 ลงใน Google Drive
 */
function saveFileToDrive(base64Data, folderId, fileName) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const contentType = base64Data.substring(5, base64Data.indexOf(';'));
    const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    
    // ตั้งค่าให้ทุกคนที่มีลิงก์สามารถดูรูปได้ (เพื่อให้เจ้าหน้าที่เปิดดูได้ทันที)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error saving file: " + e.toString();
  }
}

function createResponse(message) {
  return ContentService.createTextOutput(message).setMimeType(ContentService.MimeType.TEXT);
}
