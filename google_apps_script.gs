
/**
 * API สำหรับระบบรับแจ้งเหตุ อบต.หนองทุ่ม (V2 - Stable)
 * วิธีใช้:
 * 1. นำโค้ดนี้ไปวางใน Google Apps Script
 * 2. กด Deploy > New Deployment > Web App
 * 3. เลือก Execute as "Me" และ Who has access "Anyone"
 * 4. นำ URL ที่ได้ไปใส่ใน WEB_APP_URL ของไฟล์ googleIntegration.ts
 */

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const { action, sheetId, folderId, data } = requestData;
    const ss = SpreadsheetApp.openById(sheetId);
    
    // --- 1. รับแจ้งเหตุใหม่ ---
    if (action === "new_report") {
      let sheet = ss.getSheetByName("ผู้แจ้ง") || ss.insertSheet("ผู้แจ้ง");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["วันที่-เวลา", "รหัสเหตุการณ์", "ประเภท", "รายละเอียด", "ชื่อผู้แจ้ง", "เบอร์โทร", "พิกัด", "Lat", "Lng", "ลิงก์รูปภาพ"]);
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
        "'" + data.phone,
        data.address,
        data.lat,
        data.lng,
        mediaUrl
      ]);
      
      return createResponse("Success");
    }
    
    // --- 2. อัปเดตสถานะโดยเจ้าหน้าที่ ---
    else if (action === "update_status") {
      let officerSheet = ss.getSheetByName("เจ้าหน้าที่") || ss.insertSheet("เจ้าหน้าที่");
      if (officerSheet.getLastRow() === 0) {
        officerSheet.appendRow(["วันที่-เวลา", "รหัสเหตุการณ์", "สถานะ", "ชื่อเจ้าหน้าที่", "ตำแหน่ง", "รูปปิดงาน", "ลายเซ็น"]);
      }

      let closingMediaUrl = data.closingMediaData ? saveFileToDrive(data.closingMediaData, folderId, "RESOLVED_" + data.id) : "";
      let signatureUrl = data.signatureData ? saveFileToDrive(data.signatureData, folderId, "SIG_" + data.id) : "";

      officerSheet.appendRow([
        new Date().toLocaleString('th-TH'),
        data.id,
        data.status,
        data.officerName,
        data.officerPosition,
        closingMediaUrl,
        signatureUrl
      ]);
      
      return createResponse("Updated Successfully");
    }
    
  } catch (error) {
    return createResponse("Error: " + error.toString());
  }
}

function saveFileToDrive(base64Data, folderId, fileName) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const contentType = base64Data.substring(5, base64Data.indexOf(';'));
    const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error: " + e.toString(); }
}

function createResponse(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
