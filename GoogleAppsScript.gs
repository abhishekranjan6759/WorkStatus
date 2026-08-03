/**
 * Google Apps Script - Work Documentation (Multi-Sheet)
 * 
 * SETUP:
 * 1. Go to https://script.google.com → New Project
 * 2. Paste this entire code
 * 3. Run the 'setup' function once (creates all sheets with headers)
 * 4. Deploy → New Deployment → Web App
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Copy the URL → paste into SCRIPT_URL in index.html
 * 
 * IMPORTANT: Make sure runtime is set to V8 (default for new projects)
 */

// Sheet configurations
var SHEETS = {
  WorkLog: ['Timestamp', 'Date', 'Work Done', 'Jira Ticket', 'Blockers', 'Time Reason', 'Learnings', 'Extra Notes'],
  QuickNotes: ['Timestamp', 'Date', 'Time', 'Note', 'Tag'],
  ScrumNotes: ['Timestamp', 'Date', 'Scrum Notes', 'Today Plan', 'Scrum Blockers'],
  Reflection: ['Timestamp', 'Date', 'Went Well', 'Could Be Better', 'Do Tomorrow', 'Goals Track'],
  YaadHai: ['Timestamp', 'Date', 'Who', 'What', 'Context'],
  DayRating: ['Timestamp', 'Date', 'Rating', 'Reason']
};

/**
 * Run this ONCE to create all sheets with headers.
 * Go to Run → setup
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (var sheetName in SHEETS) {
    var headers = SHEETS[sheetName];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // Delete default Sheet1 if it exists and is empty
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) { /* ignore if it's the only sheet */ }
  }
  
  Logger.log('✅ Setup complete! All 5 sheets created.');
}

/**
 * Handle POST requests from the web app.
 * Uses LockService to prevent race conditions when multiple
 * requests hit the sheet at the same time.
 * 
 * NOTE: The frontend sends with Content-Type: text/plain (due to no-cors mode).
 * Apps Script still receives the body in e.postData.contents regardless of content-type.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  try {
    // Wait up to 30 seconds to acquire the lock (handles slow sheet writes)
    lock.waitLock(30000);
    
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.sheetName || 'WorkLog';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      lock.releaseLock();
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'error', message: 'Sheet "' + sheetName + '" not found. Run setup() first.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    var row = [];
    var ts = data.timestamp || new Date().toISOString();
    var date = data.date || '';
    
    switch(sheetName) {
      case 'WorkLog':
        row = [ts, date, data.workDone||'', data.jiraTicket||'', data.blockers||'', data.timeReason||'', data.learnings||'', data.extraNotes||''];
        break;
      case 'QuickNotes':
        row = [ts, date, data.time||'', data.note||'', data.tag||''];
        break;
      case 'ScrumNotes':
        row = [ts, date, data.scrumNotes||'', data.todayPlan||'', data.scrumBlockers||''];
        break;
      case 'Reflection':
        row = [ts, date, data.wentWell||'', data.couldBeBetter||'', data.doTomorrow||'', data.goalsTrack||''];
        break;
      case 'YaadHai':
        row = [ts, date, data.who||'', data.what||'', data.context||''];
        break;
      case 'DayRating':
        row = [ts, date, data.rating||0, data.reason||''];
        break;
      default:
        row = [ts, date, JSON.stringify(data)];
    }
    
    sheet.appendRow(row);
    SpreadsheetApp.flush(); // Force write to sheet immediately
    
    lock.releaseLock();
    
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'success', message: 'Saved to ' + sheetName })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Release lock if we have it
    try { lock.releaseLock(); } catch(e2) {}
    
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests.
 * HR role: only sees WorkLog (limited) + ScrumNotes
 * Admin role: sees everything
 * 
 * Usage:
 *   ?role=hr         → limited data for HR
 *   ?role=admin      → full data (default)
 *   ?sheet=WorkLog   → specific sheet only
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var role = (e.parameter && e.parameter.role) ? e.parameter.role : 'admin';
    var requestedSheet = (e.parameter && e.parameter.sheet) ? e.parameter.sheet : 'all';
    
    if (role === 'hr') {
      var result = {};
      
      var workSheet = ss.getSheetByName('WorkLog');
      if (workSheet && workSheet.getLastRow() > 1) {
        var workData = workSheet.getDataRange().getValues();
        result.workLog = [];
        for (var i = 1; i < workData.length; i++) {
          result.workLog.push({
            date: workData[i][1],
            workDone: workData[i][2],
            jiraTicket: workData[i][3],
            blockers: workData[i][4],
            timeReason: workData[i][5]
            // HR cannot see: Learnings (col 6), Extra Notes (col 7)
          });
        }
      }
      
      var scrumSheet = ss.getSheetByName('ScrumNotes');
      if (scrumSheet && scrumSheet.getLastRow() > 1) {
        var scrumData = scrumSheet.getDataRange().getValues();
        result.scrumNotes = [];
        for (var j = 1; j < scrumData.length; j++) {
          result.scrumNotes.push({
            date: scrumData[j][1],
            scrumNotes: scrumData[j][2],
            todayPlan: scrumData[j][3],
            scrumBlockers: scrumData[j][4]
          });
        }
      }
      
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'success', data: result })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Admin gets everything
    var adminResult = {};
    for (var sheetName in SHEETS) {
      if (requestedSheet !== 'all' && requestedSheet !== sheetName) continue;
      var sheet = ss.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        adminResult[sheetName] = [];
        for (var k = 1; k < data.length; k++) {
          var entry = {};
          for (var l = 0; l < headers.length; l++) {
            entry[headers[l]] = data[k][l];
          }
          adminResult[sheetName].push(entry);
        }
      } else {
        adminResult[sheetName] = [];
      }
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'success', data: adminResult })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function - run manually to verify doPost works.
 * Simulates a WorkLog entry submission.
 */
function testPost() {
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        sheetName: 'WorkLog',
        timestamp: new Date().toISOString(),
        date: '2026-08-03',
        workDone: 'Test entry from script',
        jiraTicket: 'TEST-001',
        blockers: '',
        timeReason: '',
        learnings: 'Testing works!',
        extraNotes: ''
      })
    }
  };
  
  var result = doPost(mockEvent);
  Logger.log(result.getContent());
}

/**
 * Test function - run manually to verify doGet works.
 */
function testGet() {
  var mockEvent = { parameter: { role: 'admin', sheet: 'all' } };
  var result = doGet(mockEvent);
  Logger.log(result.getContent());
}
