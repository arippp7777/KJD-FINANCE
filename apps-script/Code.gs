/**
 * ============================================================
 * KJD FINANCE — Google Apps Script Backend
 * PT Putri Kharisma Jaya
 * ============================================================
 *
 * Architecture:
 *   Next.js  →  Google Apps Script (this file)  →  Google Sheets
 *
 * Deployment:
 *   Deploy as "Web App" → Execute as: Me → Who has access: Anyone
 *   Copy the deployment URL into Next.js env: NEXT_PUBLIC_GAS_URL
 *
 * Usage:
 *   GET  ?action=trips
 *   GET  ?action=trip&id=<uuid>
 *   POST { action: "createTrip", ... }
 *
 * Response envelope:
 *   { "success": true,  "data": ... }
 *   { "success": false, "message": "..." }
 *
 * ============================================================
 */

// ============================================================
// SECTION 1 — CONFIGURATION
// ============================================================

/** Replace with your actual Google Spreadsheet ID */
var SPREADSHEET_ID = "1H8UYPZ6F24QcRWuHveqPStZZFxulp0SJSB6gs1GLQQc";

/** Timezone for date operations */
var TIMEZONE = "Asia/Jakarta";

/** Sheet tab names — must match Phase 4 schema exactly */
var SHEETS = {
  TRIPS:              "TRIPS",
  EXPENSES:           "EXPENSES",
  CUSTOMERS:          "CUSTOMERS",
  UNITS:              "UNITS",
  EXPENSE_CATEGORIES: "EXPENSE_CATEGORIES",
  SETTINGS:           "SETTINGS"
};

/**
 * Column order per sheet (0-indexed).
 * Must match Phase 4 SHEET_COLUMNS exactly.
 */
var COLUMNS = {
  TRIPS:    ["id","trip_no","date","customer_id","unit_id","operator","origin","destination","trip_type","revenue","notes","status","created_at","updated_at"],
  EXPENSES: ["id","trip_id","category_id","description","amount","expense_date","created_at"],
  CUSTOMERS:["id","name","phone","address","contact_person","status","created_at","updated_at"],
  UNITS:    ["id","code","name","type","plate_number","status","created_at","updated_at"],
  EXPENSE_CATEGORIES: ["id","name","description","status","created_at","updated_at"],
  SETTINGS: ["key","value","description","updated_at"]
};

/** Columns that must be stored/read as plain numbers */
var NUMERIC_COLUMNS = {
  TRIPS:    ["revenue"],
  EXPENSES: ["amount"],
  CUSTOMERS:[], UNITS:[], EXPENSE_CATEGORIES:[], SETTINGS:[]
};


// ============================================================
// SECTION 2 — HTTP ENTRY POINTS
// ============================================================

/**
 * GET entry point.
 * Route via ?action=<name>[&param=value]
 */
function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || "";

    switch (action) {
      case "trips":       return respond(getTrips(params));
      case "trip":        return respond(getTrip(params.id));
      case "expenses":    return respond(getExpenses(params));
      case "customers":   return respond(getCustomers(params));
      case "units":       return respond(getUnits(params));
      case "categories":  return respond(getCategories(params));
      case "settings":    return respond(getSettings());
      case "dashboard":   return respond(getDashboard(params));
      case "reports":     return respond(getReports(params));
      case "ping":        return respond({ pong: true, time: nowISO() });
      default:
        return respondError("Unknown action: " + action);
    }
  } catch (err) {
    return respondError("Server error: " + err.message);
  }
}

/**
 * POST entry point.
 * Accepts BOTH:
 *   - application/x-www-form-urlencoded (from browser fetch — no CORS preflight)
 *   - application/json body (legacy / direct API calls)
 *
 * When form-urlencoded, every field arrives as a flat string in e.parameter.
 * We reconstruct the body object from e.parameter so all existing handlers work.
 */
function doPost(e) {
  try {
    var body;

    var contentType = (e.postData && e.postData.type) ? e.postData.type : "";

    if (contentType.indexOf("application/json") !== -1) {
      // Legacy: JSON body
      body = JSON.parse(e.postData.contents || "{}");
    } else {
      // Form-urlencoded: params arrive flat in e.parameter
      // The frontend puts each field as its own param key.
      body = {};
      var params = e.parameter || {};
      Object.keys(params).forEach(function(key) {
        var val = params[key];
        // Try to parse JSON strings (objects/arrays sent via JSON.stringify)
        try {
          var parsed = JSON.parse(val);
          body[key] = parsed;
        } catch (_) {
          body[key] = val;
        }
      });
    }

    var action = body.action || "";

    switch (action) {
      // --- TRIPS ---
      case "createTrip":    return respond(createTrip(body));
      case "updateTrip":    return respond(updateTrip(body));
      case "deleteTrip":    return respond(deleteTrip(body.id));

      // --- EXPENSES ---
      case "createExpense":  return respond(createExpense(body));
      case "updateExpense":  return respond(updateExpense(body));
      case "deleteExpense":  return respond(deleteExpense(body.id));

      // --- CUSTOMERS ---
      case "createCustomer": return respond(createCustomer(body));
      case "updateCustomer": return respond(updateCustomer(body));
      case "deleteCustomer": return respond(deleteCustomer(body.id));

      // --- UNITS ---
      case "createUnit":     return respond(createUnit(body));
      case "updateUnit":     return respond(updateUnit(body));
      case "deleteUnit":     return respond(deleteUnit(body.id));

      // --- CATEGORIES ---
      case "createCategory": return respond(createCategory(body));
      case "updateCategory": return respond(updateCategory(body));
      case "deleteCategory": return respond(deleteCategory(body.id));

      // --- SETTINGS ---
      case "updateSetting":  return respond(updateSetting(body));

      default:
        return respondError("Unknown action: " + action);
    }
  } catch (err) {
    return respondError("Server error: " + err.message);
  }
}


// ============================================================
// SECTION 3 — SPREADSHEET HELPERS
// ============================================================

/** Cached spreadsheet reference */
var _ss = null;
function getSpreadsheet() {
  if (!_ss) _ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _ss;
}

/**
 * Get a sheet by name; throws if not found.
 * Auto-creates the sheet + header row if it doesn't exist yet.
 */
function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = COLUMNS[name];
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

/**
 * Read all data rows from a sheet (skips header row 1).
 * Returns array of plain objects keyed by column name.
 */
function readAll(sheetName) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // no data rows

  var cols   = COLUMNS[sheetName];
  var numCols = cols.length;
  var range  = sheet.getRange(2, 1, lastRow - 1, numCols);
  var values = range.getValues();
  var numericCols = NUMERIC_COLUMNS[sheetName] || [];

  return values.map(function(row) {
    var obj = {};
    cols.forEach(function(col, i) {
      var raw = row[i];
      // Coerce numbers for designated numeric columns
      if (numericCols.indexOf(col) !== -1) {
        obj[col] = typeof raw === "number" ? raw : (parseFloat(raw) || 0);
      } else {
        // Dates stored as Date objects by Sheets — normalise to string
        obj[col] = raw instanceof Date ? Utilities.formatDate(raw, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss'Z'") : String(raw);
      }
    });
    return obj;
  });
}

/**
 * Find a single row object where column equals value.
 * Returns null if not found.
 */
function findOne(sheetName, column, value) {
  var rows = readAll(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][column]) === String(value)) return rows[i];
  }
  return null;
}

/**
 * Find the 1-based row index of a row where column = value.
 * Returns -1 if not found. Data starts at row 2.
 */
function findRowIndex(sheetName, column, value) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var cols     = COLUMNS[sheetName];
  var colIndex = cols.indexOf(column); // 0-based
  if (colIndex === -1) return -1;

  var colValues = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < colValues.length; i++) {
    if (String(colValues[i][0]) === String(value)) return i + 2; // 1-based row
  }
  return -1;
}

/**
 * Append a new data row to a sheet.
 */
function insertRow(sheetName, obj) {
  var sheet = getSheet(sheetName);
  var cols  = COLUMNS[sheetName];
  var row   = cols.map(function(col) {
    var v = obj[col];
    return (v === undefined || v === null) ? "" : v;
  });
  sheet.appendRow(row);
}

/**
 * Update an existing row in-place by its 1-based row index.
 */
function updateRow(sheetName, rowIndex, obj) {
  var sheet = getSheet(sheetName);
  var cols  = COLUMNS[sheetName];
  var row   = cols.map(function(col) {
    var v = obj[col];
    return (v === undefined || v === null) ? "" : v;
  });
  sheet.getRange(rowIndex, 1, 1, cols.length).setValues([row]);
}

/**
 * Delete a row by its 1-based row index.
 */
function deleteRow(sheetName, rowIndex) {
  getSheet(sheetName).deleteRow(rowIndex);
}


// ============================================================
// SECTION 4 — UTILITY HELPERS
// ============================================================

/**
 * Generate a UUID v4 using Utilities.getUuid().
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Get current timestamp as ISO 8601 string (UTC).
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Get today's date as YYYY-MM-DD in WIB (Asia/Jakarta).
 */
function todayWIB() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
}

/**
 * Get current year in WIB.
 */
function currentYear() {
  return parseInt(Utilities.formatDate(new Date(), TIMEZONE, "yyyy"), 10);
}

/**
 * Generate the next trip number in TRP-YYYY-NNNN format.
 * Reads existing trips to find the max sequence for the current year.
 * Falls back to SETTINGS.trip_number_sequence as a hint.
 */
function generateTripNo() {
  var year = currentYear();
  var prefix = "TRP-" + year + "-";
  var trips = readAll(SHEETS.TRIPS);
  var maxSeq = 0;

  trips.forEach(function(t) {
    if (t.trip_no && t.trip_no.indexOf(prefix) === 0) {
      var seq = parseInt(t.trip_no.replace(prefix, ""), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  // Also check Settings as secondary hint (handles year rollover)
  var setting = findOne(SHEETS.SETTINGS, "key", "trip_number_sequence");
  if (setting) {
    var hint = parseInt(setting.value, 10);
    if (!isNaN(hint) && hint > maxSeq) maxSeq = hint;
  }

  var nextSeq = maxSeq + 1;

  // Persist back to SETTINGS
  _upsertSetting("trip_number_sequence", String(nextSeq), "Nomor urut trip terakhir (auto-increment)");

  return prefix + String(nextSeq).padStart(4, "0");
}

/**
 * Upsert a setting by key (internal use only).
 */
function _upsertSetting(key, value, description) {
  var rowIndex = findRowIndex(SHEETS.SETTINGS, "key", key);
  var now = nowISO();
  var obj = { key: key, value: value, description: description || "", updated_at: now };
  if (rowIndex === -1) {
    insertRow(SHEETS.SETTINGS, obj);
  } else {
    updateRow(SHEETS.SETTINGS, rowIndex, obj);
  }
}

/**
 * Validate that required string fields are non-empty.
 * Returns an error message or null if valid.
 */
function validateRequired(obj, fields) {
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (!obj[f] || String(obj[f]).trim() === "") {
      return "Field '" + f + "' is required";
    }
  }
  return null;
}

/**
 * Validate that a value is a positive number.
 */
function validatePositiveNumber(value, fieldName) {
  var n = parseFloat(value);
  if (isNaN(n) || n < 0) return "Field '" + fieldName + "' must be a non-negative number";
  return null;
}

/**
 * Build a success JSON response.
 */
function respond(data) {
  var payload = JSON.stringify({ success: true, data: data });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Build an error JSON response.
 */
function respondError(message) {
  var payload = JSON.stringify({ success: false, message: message });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// SECTION 5 — TRIPS
// ============================================================

/**
 * GET trips
 * Params: status?, customer_id?, unit_id?, date_from?, date_to?, limit?
 * Returns trips with denormalized names + total_expenses + net_profit.
 */
function getTrips(params) {
  var trips = readAll(SHEETS.TRIPS);

  // --- Filters ---
  if (params.status)      trips = trips.filter(function(t) { return t.status === params.status; });
  if (params.customer_id) trips = trips.filter(function(t) { return t.customer_id === params.customer_id; });
  if (params.unit_id)     trips = trips.filter(function(t) { return t.unit_id === params.unit_id; });
  if (params.date_from)   trips = trips.filter(function(t) { return t.date >= params.date_from; });
  if (params.date_to)     trips = trips.filter(function(t) { return t.date <= params.date_to; });

  // Sort: newest first
  trips.sort(function(a, b) { return b.date > a.date ? 1 : -1; });

  if (params.limit) {
    var lim = parseInt(params.limit, 10);
    if (!isNaN(lim)) trips = trips.slice(0, lim);
  }

  return trips.map(function(t) { return enrichTrip(t); });
}

/**
 * GET a single trip by ID.
 */
function getTrip(id) {
  if (!id) throw new Error("id is required");
  var trip = findOne(SHEETS.TRIPS, "id", id);
  if (!trip) throw new Error("Trip not found: " + id);
  return enrichTrip(trip);
}

/**
 * Enrich a trip object with denormalized names, expenses, net_profit, profit_margin.
 */
function enrichTrip(trip) {
  // Denormalize customer
  var customer = findOne(SHEETS.CUSTOMERS, "id", trip.customer_id);
  trip.customer_name = customer ? customer.name : "";

  // Denormalize unit
  var unit = findOne(SHEETS.UNITS, "id", trip.unit_id);
  trip.unit_name = unit ? unit.name : "";
  trip.unit_code = unit ? unit.code : "";

  // Aggregate expenses for this trip
  var expenses = readAll(SHEETS.EXPENSES).filter(function(e) { return e.trip_id === trip.id; });
  trip.expenses = expenses;
  trip.total_expenses = expenses.reduce(function(sum, e) { return sum + (parseFloat(e.amount) || 0); }, 0);

  // Computed — never stored
  var revenue = parseFloat(trip.revenue) || 0;
  trip.net_profit = revenue - trip.total_expenses;
  trip.profit_margin = revenue > 0 ? Math.round((trip.net_profit / revenue) * 10000) / 100 : 0; // percentage, 2dp

  return trip;
}

/**
 * POST createTrip
 */
function createTrip(body) {
  var err = validateRequired(body, ["date", "customer_id", "unit_id", "operator", "origin", "destination", "trip_type", "revenue"]);
  if (err) throw new Error(err);

  err = validatePositiveNumber(body.revenue, "revenue");
  if (err) throw new Error(err);

  // Validate relations
  if (!findOne(SHEETS.CUSTOMERS, "id", body.customer_id)) throw new Error("Customer not found: " + body.customer_id);
  if (!findOne(SHEETS.UNITS, "id", body.unit_id))         throw new Error("Unit not found: " + body.unit_id);

  // Validate enums
  var validTripTypes   = ["REGULER", "CHARTER", "KONTRAK"];
  var validTripStatuses = ["ACTIVE", "COMPLETED", "CANCELLED"];
  if (validTripTypes.indexOf(body.trip_type) === -1)   throw new Error("Invalid trip_type: " + body.trip_type);
  var status = body.status || "ACTIVE";
  if (validTripStatuses.indexOf(status) === -1)         throw new Error("Invalid status: " + status);

  var now  = nowISO();
  var trip = {
    id:          generateId(),
    trip_no:     generateTripNo(),
    date:        body.date,
    customer_id: body.customer_id,
    unit_id:     body.unit_id,
    operator:    body.operator,
    origin:      body.origin,
    destination: body.destination,
    trip_type:   body.trip_type,
    revenue:     parseFloat(body.revenue),
    notes:       body.notes || "",
    status:      status,
    created_at:  now,
    updated_at:  now
  };

  insertRow(SHEETS.TRIPS, trip);
  return enrichTrip(trip);
}

/**
 * POST updateTrip
 */
function updateTrip(body) {
  if (!body.id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.TRIPS, "id", body.id);
  if (rowIndex === -1) throw new Error("Trip not found: " + body.id);

  var existing = findOne(SHEETS.TRIPS, "id", body.id);

  // Validate enums if provided
  if (body.trip_type) {
    var validTripTypes = ["REGULER", "CHARTER", "KONTRAK"];
    if (validTripTypes.indexOf(body.trip_type) === -1) throw new Error("Invalid trip_type: " + body.trip_type);
  }
  if (body.status) {
    var validStatuses = ["ACTIVE", "COMPLETED", "CANCELLED"];
    if (validStatuses.indexOf(body.status) === -1) throw new Error("Invalid status: " + body.status);
  }
  if (body.revenue !== undefined) {
    var err = validatePositiveNumber(body.revenue, "revenue");
    if (err) throw new Error(err);
  }
  if (body.customer_id && !findOne(SHEETS.CUSTOMERS, "id", body.customer_id)) throw new Error("Customer not found");
  if (body.unit_id     && !findOne(SHEETS.UNITS, "id", body.unit_id))         throw new Error("Unit not found");

  var updated = {
    id:          existing.id,
    trip_no:     existing.trip_no,
    date:        body.date        !== undefined ? body.date        : existing.date,
    customer_id: body.customer_id !== undefined ? body.customer_id : existing.customer_id,
    unit_id:     body.unit_id     !== undefined ? body.unit_id     : existing.unit_id,
    operator:    body.operator    !== undefined ? body.operator    : existing.operator,
    origin:      body.origin      !== undefined ? body.origin      : existing.origin,
    destination: body.destination !== undefined ? body.destination : existing.destination,
    trip_type:   body.trip_type   !== undefined ? body.trip_type   : existing.trip_type,
    revenue:     body.revenue     !== undefined ? parseFloat(body.revenue) : parseFloat(existing.revenue),
    notes:       body.notes       !== undefined ? body.notes       : existing.notes,
    status:      body.status      !== undefined ? body.status      : existing.status,
    created_at:  existing.created_at,
    updated_at:  nowISO()
  };

  updateRow(SHEETS.TRIPS, rowIndex, updated);
  return enrichTrip(updated);
}

/**
 * POST deleteTrip — also cascades delete to linked EXPENSES
 */
function deleteTrip(id) {
  if (!id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.TRIPS, "id", id);
  if (rowIndex === -1) throw new Error("Trip not found: " + id);

  // Cascade: delete all expenses for this trip
  var expenses = readAll(SHEETS.EXPENSES).filter(function(e) { return e.trip_id === id; });
  // Delete in reverse order to preserve row indices
  var expenseRows = expenses.map(function(e) { return findRowIndex(SHEETS.EXPENSES, "id", e.id); })
    .filter(function(r) { return r !== -1; })
    .sort(function(a, b) { return b - a; });
  expenseRows.forEach(function(r) { deleteRow(SHEETS.EXPENSES, r); });

  deleteRow(SHEETS.TRIPS, rowIndex);
  return { deleted_id: id, expenses_deleted: expenseRows.length };
}


// ============================================================
// SECTION 6 — EXPENSES
// ============================================================

/**
 * GET expenses
 * Params: trip_id?, category_id?
 */
function getExpenses(params) {
  var expenses = readAll(SHEETS.EXPENSES);

  if (params.trip_id)     expenses = expenses.filter(function(e) { return e.trip_id === params.trip_id; });
  if (params.category_id) expenses = expenses.filter(function(e) { return e.category_id === params.category_id; });

  expenses.sort(function(a, b) { return b.expense_date > a.expense_date ? 1 : -1; });
  return expenses.map(function(e) { return enrichExpense(e); });
}

/**
 * Enrich an expense with category name.
 */
function enrichExpense(expense) {
  var cat = findOne(SHEETS.EXPENSE_CATEGORIES, "id", expense.category_id);
  expense.category_name = cat ? cat.name : "";
  return expense;
}

/**
 * POST createExpense
 */
function createExpense(body) {
  var err = validateRequired(body, ["trip_id", "category_id", "amount", "expense_date"]);
  if (err) throw new Error(err);

  err = validatePositiveNumber(body.amount, "amount");
  if (err) throw new Error(err);

  if (!findOne(SHEETS.TRIPS, "id", body.trip_id))                        throw new Error("Trip not found: " + body.trip_id);
  if (!findOne(SHEETS.EXPENSE_CATEGORIES, "id", body.category_id))       throw new Error("Category not found: " + body.category_id);

  var now     = nowISO();
  var expense = {
    id:           generateId(),
    trip_id:      body.trip_id,
    category_id:  body.category_id,
    description:  body.description || "",
    amount:       parseFloat(body.amount),
    expense_date: body.expense_date,
    created_at:   now
  };

  insertRow(SHEETS.EXPENSES, expense);
  return enrichExpense(expense);
}

/**
 * POST updateExpense
 */
function updateExpense(body) {
  if (!body.id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.EXPENSES, "id", body.id);
  if (rowIndex === -1) throw new Error("Expense not found: " + body.id);

  var existing = findOne(SHEETS.EXPENSES, "id", body.id);

  if (body.amount !== undefined) {
    var err = validatePositiveNumber(body.amount, "amount");
    if (err) throw new Error(err);
  }
  if (body.trip_id     && !findOne(SHEETS.TRIPS, "id", body.trip_id))                  throw new Error("Trip not found");
  if (body.category_id && !findOne(SHEETS.EXPENSE_CATEGORIES, "id", body.category_id)) throw new Error("Category not found");

  var updated = {
    id:           existing.id,
    trip_id:      body.trip_id      !== undefined ? body.trip_id      : existing.trip_id,
    category_id:  body.category_id  !== undefined ? body.category_id  : existing.category_id,
    description:  body.description  !== undefined ? body.description  : existing.description,
    amount:       body.amount       !== undefined ? parseFloat(body.amount) : parseFloat(existing.amount),
    expense_date: body.expense_date !== undefined ? body.expense_date : existing.expense_date,
    created_at:   existing.created_at
  };

  updateRow(SHEETS.EXPENSES, rowIndex, updated);
  return enrichExpense(updated);
}

/**
 * POST deleteExpense
 */
function deleteExpense(id) {
  if (!id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.EXPENSES, "id", id);
  if (rowIndex === -1) throw new Error("Expense not found: " + id);
  deleteRow(SHEETS.EXPENSES, rowIndex);
  return { deleted_id: id };
}


// ============================================================
// SECTION 7 — CUSTOMERS
// ============================================================

/**
 * GET customers
 * Params: status?
 */
function getCustomers(params) {
  var customers = readAll(SHEETS.CUSTOMERS);
  if (params.status) customers = customers.filter(function(c) { return c.status === params.status; });
  customers.sort(function(a, b) { return a.name > b.name ? 1 : -1; });
  return customers;
}

/**
 * POST createCustomer
 */
function createCustomer(body) {
  var err = validateRequired(body, ["name"]);
  if (err) throw new Error(err);

  var validStatuses = ["ACTIVE", "INACTIVE"];
  var status = body.status || "ACTIVE";
  if (validStatuses.indexOf(status) === -1) throw new Error("Invalid status: " + status);

  var now      = nowISO();
  var customer = {
    id:             generateId(),
    name:           body.name,
    phone:          body.phone          || "",
    address:        body.address        || "",
    contact_person: body.contact_person || "",
    status:         status,
    created_at:     now,
    updated_at:     now
  };

  insertRow(SHEETS.CUSTOMERS, customer);
  return customer;
}

/**
 * POST updateCustomer
 */
function updateCustomer(body) {
  if (!body.id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.CUSTOMERS, "id", body.id);
  if (rowIndex === -1) throw new Error("Customer not found: " + body.id);

  var existing = findOne(SHEETS.CUSTOMERS, "id", body.id);

  if (body.status) {
    var validStatuses = ["ACTIVE", "INACTIVE"];
    if (validStatuses.indexOf(body.status) === -1) throw new Error("Invalid status: " + body.status);
  }

  var updated = {
    id:             existing.id,
    name:           body.name           !== undefined ? body.name           : existing.name,
    phone:          body.phone          !== undefined ? body.phone          : existing.phone,
    address:        body.address        !== undefined ? body.address        : existing.address,
    contact_person: body.contact_person !== undefined ? body.contact_person : existing.contact_person,
    status:         body.status         !== undefined ? body.status         : existing.status,
    created_at:     existing.created_at,
    updated_at:     nowISO()
  };

  updateRow(SHEETS.CUSTOMERS, rowIndex, updated);
  return updated;
}

/**
 * POST deleteCustomer
 * Guards: cannot delete if customer has trips.
 */
function deleteCustomer(id) {
  if (!id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.CUSTOMERS, "id", id);
  if (rowIndex === -1) throw new Error("Customer not found: " + id);

  var linkedTrips = readAll(SHEETS.TRIPS).filter(function(t) { return t.customer_id === id; });
  if (linkedTrips.length > 0) throw new Error("Cannot delete customer with " + linkedTrips.length + " linked trip(s). Delete or reassign trips first.");

  deleteRow(SHEETS.CUSTOMERS, rowIndex);
  return { deleted_id: id };
}


// ============================================================
// SECTION 8 — UNITS
// ============================================================

/**
 * GET units
 * Params: status?, type?
 */
function getUnits(params) {
  var units = readAll(SHEETS.UNITS);
  if (params.status) units = units.filter(function(u) { return u.status === params.status; });
  if (params.type)   units = units.filter(function(u) { return u.type   === params.type; });
  units.sort(function(a, b) { return a.code > b.code ? 1 : -1; });
  return units;
}

/**
 * POST createUnit
 */
function createUnit(body) {
  var err = validateRequired(body, ["name", "plate_number"]);
  if (err) throw new Error(err);

  var validTypes = ["TRUCK", "PICKUP", "CONTAINER", "TOWING", "CRANE", "OTHER"];
  var type = body.type || "TRUCK";
  if (validTypes.indexOf(type) === -1) throw new Error("Invalid type: " + type);

  // Auto-generate code from plate number if not provided
  var plateStr = String(body.plate_number).replace(/\s+/g, "").toUpperCase();
  var code = body.code ? String(body.code).replace(/\s+/g, "").toUpperCase() : plateStr;

  // Check code uniqueness — if duplicate, append a suffix
  var existing = findOne(SHEETS.UNITS, "code", code);
  if (existing) code = code + "_" + Date.now().toString().slice(-4);

  var now  = nowISO();
  var unit = {
    id:           generateId(),
    code:         code,
    name:         body.name,
    type:         type,
    plate_number: plateStr,
    status:       "ACTIVE",
    created_at:   now,
    updated_at:   now
  };

  insertRow(SHEETS.UNITS, unit);
  return unit;
}

/**
 * POST updateUnit
 */
function updateUnit(body) {
  if (!body.id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.UNITS, "id", body.id);
  if (rowIndex === -1) throw new Error("Unit not found: " + body.id);

  var existing = findOne(SHEETS.UNITS, "id", body.id);

  if (body.status) {
    var validStatuses = ["ACTIVE", "INACTIVE", "MAINTENANCE"];
    if (validStatuses.indexOf(body.status) === -1) throw new Error("Invalid status: " + body.status);
  }
  if (body.type) {
    var validTypes = ["TRUCK", "PICKUP", "CONTAINER", "TOWING", "CRANE", "OTHER"];
    if (validTypes.indexOf(body.type) === -1) throw new Error("Invalid type: " + body.type);
  }

  var updated = {
    id:           existing.id,
    code:         body.code         !== undefined ? body.code.toUpperCase()         : existing.code,
    name:         body.name         !== undefined ? body.name                       : existing.name,
    type:         body.type         !== undefined ? body.type                       : existing.type,
    plate_number: body.plate_number !== undefined ? body.plate_number.toUpperCase() : existing.plate_number,
    status:       body.status       !== undefined ? body.status                     : existing.status,
    created_at:   existing.created_at,
    updated_at:   nowISO()
  };

  updateRow(SHEETS.UNITS, rowIndex, updated);
  return updated;
}

/**
 * POST deleteUnit
 * Guards: cannot delete if unit has trips.
 */
function deleteUnit(id) {
  if (!id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.UNITS, "id", id);
  if (rowIndex === -1) throw new Error("Unit not found: " + id);

  var linkedTrips = readAll(SHEETS.TRIPS).filter(function(t) { return t.unit_id === id; });
  if (linkedTrips.length > 0) throw new Error("Cannot delete unit with " + linkedTrips.length + " linked trip(s). Delete or reassign trips first.");

  deleteRow(SHEETS.UNITS, rowIndex);
  return { deleted_id: id };
}


// ============================================================
// SECTION 9 — EXPENSE CATEGORIES
// ============================================================

/**
 * GET categories
 * Params: status?
 */
function getCategories(params) {
  var categories = readAll(SHEETS.EXPENSE_CATEGORIES);
  if (params.status) categories = categories.filter(function(c) { return c.status === params.status; });
  categories.sort(function(a, b) { return a.name > b.name ? 1 : -1; });
  return categories;
}

/**
 * POST createCategory
 */
function createCategory(body) {
  var err = validateRequired(body, ["name"]);
  if (err) throw new Error(err);

  var validStatuses = ["ACTIVE", "INACTIVE"];
  var status = body.status || "ACTIVE";
  if (validStatuses.indexOf(status) === -1) throw new Error("Invalid status: " + status);

  var now = nowISO();
  var cat = {
    id:          generateId(),
    name:        body.name,
    description: body.description || "",
    status:      status,
    created_at:  now,
    updated_at:  now
  };

  insertRow(SHEETS.EXPENSE_CATEGORIES, cat);
  return cat;
}

/**
 * POST updateCategory
 */
function updateCategory(body) {
  if (!body.id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.EXPENSE_CATEGORIES, "id", body.id);
  if (rowIndex === -1) throw new Error("Category not found: " + body.id);

  var existing = findOne(SHEETS.EXPENSE_CATEGORIES, "id", body.id);

  if (body.status) {
    var validStatuses = ["ACTIVE", "INACTIVE"];
    if (validStatuses.indexOf(body.status) === -1) throw new Error("Invalid status: " + body.status);
  }

  var updated = {
    id:          existing.id,
    name:        body.name        !== undefined ? body.name        : existing.name,
    description: body.description !== undefined ? body.description : existing.description,
    status:      body.status      !== undefined ? body.status      : existing.status,
    created_at:  existing.created_at,
    updated_at:  nowISO()
  };

  updateRow(SHEETS.EXPENSE_CATEGORIES, rowIndex, updated);
  return updated;
}

/**
 * POST deleteCategory
 * Guards: cannot delete if category is used in expenses.
 */
function deleteCategory(id) {
  if (!id) throw new Error("id is required");
  var rowIndex = findRowIndex(SHEETS.EXPENSE_CATEGORIES, "id", id);
  if (rowIndex === -1) throw new Error("Category not found: " + id);

  var linked = readAll(SHEETS.EXPENSES).filter(function(e) { return e.category_id === id; });
  if (linked.length > 0) throw new Error("Cannot delete category used in " + linked.length + " expense(s).");

  deleteRow(SHEETS.EXPENSE_CATEGORIES, rowIndex);
  return { deleted_id: id };
}


// ============================================================
// SECTION 10 — SETTINGS
// ============================================================

/**
 * GET all settings as a key-value map.
 */
function getSettings() {
  var rows = readAll(SHEETS.SETTINGS);
  var map  = {};
  rows.forEach(function(r) { map[r.key] = r; });
  return map;
}

/**
 * POST updateSetting
 * Body: { key, value, description? }
 */
function updateSetting(body) {
  var err = validateRequired(body, ["key", "value"]);
  if (err) throw new Error(err);
  _upsertSetting(body.key, body.value, body.description || "");
  return findOne(SHEETS.SETTINGS, "key", body.key);
}


// ============================================================
// SECTION 11 — DASHBOARD
// ============================================================

/**
 * GET dashboard summary
 * Params: year?, month?
 *   - If month provided: filter to that month (YYYY-MM)
 *   - If year only: filter to that year
 *   - If neither: use current month
 */
function getDashboard(params) {
  var now   = new Date();
  var year  = params.year  ? parseInt(params.year,  10) : parseInt(Utilities.formatDate(now, TIMEZONE, "yyyy"), 10);
  var month = params.month ? parseInt(params.month, 10) : null;

  // Build date prefix filter
  var prefix = String(year);
  if (month !== null) {
    prefix = year + "-" + String(month).padStart(2, "0");
  }

  var allTrips    = readAll(SHEETS.TRIPS);
  var allExpenses = readAll(SHEETS.EXPENSES);
  var allCats     = readAll(SHEETS.EXPENSE_CATEGORIES);

  // Filter trips by period
  var periodTrips = allTrips.filter(function(t) { return t.date && t.date.indexOf(prefix) === 0; });

  // --- Summary ---
  var totalRevenue  = 0;
  var totalExpenses = 0;

  var tripIds = {};
  periodTrips.forEach(function(t) {
    tripIds[t.id] = true;
    totalRevenue += parseFloat(t.revenue) || 0;
  });

  var periodExpenses = allExpenses.filter(function(e) { return tripIds[e.trip_id]; });
  periodExpenses.forEach(function(e) { totalExpenses += parseFloat(e.amount) || 0; });

  var netProfit    = totalRevenue - totalExpenses;
  var profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

  var summary = {
    period_label:    prefix,
    total_trips:     periodTrips.length,
    active_trips:    periodTrips.filter(function(t) { return t.status === "ACTIVE"; }).length,
    completed_trips: periodTrips.filter(function(t) { return t.status === "COMPLETED"; }).length,
    cancelled_trips: periodTrips.filter(function(t) { return t.status === "CANCELLED"; }).length,
    total_revenue:   totalRevenue,
    total_expenses:  totalExpenses,
    net_profit:      netProfit,
    profit_margin:   profitMargin
  };

  // --- Revenue chart (monthly breakdown within the year) ---
  var revenueChart = [];
  for (var m = 1; m <= 12; m++) {
    var mPrefix  = year + "-" + String(m).padStart(2, "0");
    var mTrips   = allTrips.filter(function(t) { return t.date && t.date.indexOf(mPrefix) === 0; });
    var mTripIds = {};
    var mRev     = 0;
    mTrips.forEach(function(t) { mTripIds[t.id] = true; mRev += parseFloat(t.revenue) || 0; });
    var mExp  = allExpenses.filter(function(e) { return mTripIds[e.trip_id]; })
                           .reduce(function(s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var mNet  = mRev - mExp;
    var mMarg = mRev > 0 ? Math.round((mNet / mRev) * 10000) / 100 : 0;
    revenueChart.push({
      period:       mPrefix,
      trip_count:   mTrips.length,
      revenue:      mRev,
      expenses:     mExp,
      net_profit:   mNet,
      profit_margin: mMarg
    });
  }

  // --- Expense breakdown by category ---
  var catTotals = {};
  periodExpenses.forEach(function(e) {
    var cid = e.category_id;
    catTotals[cid] = (catTotals[cid] || 0) + (parseFloat(e.amount) || 0);
  });

  var expenseByCategory = allCats.map(function(cat) {
    var total = catTotals[cat.id] || 0;
    return {
      category_id:   cat.id,
      category_name: cat.name,
      total_amount:  total,
      percentage:    totalExpenses > 0 ? Math.round((total / totalExpenses) * 10000) / 100 : 0
    };
  }).filter(function(c) { return c.total_amount > 0; })
    .sort(function(a, b) { return b.total_amount - a.total_amount; });

  // --- Top customers ---
  var customerRevMap = {};
  periodTrips.forEach(function(t) {
    if (!customerRevMap[t.customer_id]) customerRevMap[t.customer_id] = { trips: 0, revenue: 0 };
    customerRevMap[t.customer_id].trips++;
    customerRevMap[t.customer_id].revenue += parseFloat(t.revenue) || 0;
  });

  var allCustomers = readAll(SHEETS.CUSTOMERS);
  var topCustomers = allCustomers.map(function(c) {
    var data = customerRevMap[c.id] || { trips: 0, revenue: 0 };
    return { id: c.id, name: c.name, trip_count: data.trips, total_revenue: data.revenue };
  }).filter(function(c) { return c.trip_count > 0; })
    .sort(function(a, b) { return b.total_revenue - a.total_revenue; })
    .slice(0, 5);

  // --- Recent trips (latest 10) ---
  var recentTrips = allTrips
    .sort(function(a, b) { return b.date > a.date ? 1 : -1; })
    .slice(0, 10)
    .map(function(t) { return enrichTrip(t); });

  return {
    summary:            summary,
    revenue_chart:      revenueChart,
    expense_by_category: expenseByCategory,
    top_customers:      topCustomers,
    recent_trips:       recentTrips
  };
}


// ============================================================
// SECTION 11 — REPORTS
// ============================================================

function getReports(params) {
  var year  = params.year;
  var month = params.month;
  
  var allTrips    = readAll(SHEETS.TRIPS);
  var allExpenses = readAll(SHEETS.EXPENSES);
  var allCats     = readAll(SHEETS.EXPENSE_CATEGORIES);
  var allCustomers = readAll(SHEETS.CUSTOMERS);
  var allUnits = readAll(SHEETS.UNITS);

  // Filter trips by year/month if provided
  var periodTrips = allTrips;
  if (year) {
    var prefix = String(year);
    if (month) {
      prefix = year + "-" + String(month).padStart(2, "0");
    }
    periodTrips = periodTrips.filter(function(t) { return t.date && t.date.indexOf(prefix) === 0; });
  }

  // Enrich trips
  var custMap = {};
  allCustomers.forEach(function(c) { custMap[c.id] = c.name; });
  var unitMap = {};
  allUnits.forEach(function(u) { unitMap[u.id] = { name: u.name, code: u.code }; });

  var tripIds = {};
  var totalRevenue = 0;
  var totalExpenses = 0;

  var tripsReport = periodTrips.map(function(t) {
    tripIds[t.id] = true;
    var rev = parseFloat(t.revenue) || 0;
    totalRevenue += rev;
    
    var tExp = allExpenses.filter(function(e) { return e.trip_id === t.id; })
                          .reduce(function(s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    totalExpenses += tExp;
    
    var net = rev - tExp;
    var margin = rev > 0 ? Math.round((net / rev) * 10000) / 100 : 0;
    var u = unitMap[t.unit_id] || { name: "", code: "" };
    
    return {
      id: t.id,
      trip_no: t.trip_no,
      date: t.date,
      customer_name: custMap[t.customer_id] || "-",
      unit_name: u.name,
      unit_code: u.code,
      revenue: rev,
      total_expenses: tExp,
      net_profit: net,
      profit_margin: margin,
      status: t.status
    };
  }).sort(function(a, b) { return b.date > a.date ? 1 : -1; });

  var periodExpenses = allExpenses.filter(function(e) { return tripIds[e.trip_id]; });

  var netProfit = totalRevenue - totalExpenses;
  var profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

  var summary = {
    total_trips: periodTrips.length,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    profit_margin: profitMargin
  };

  // --- Expense breakdown by category ---
  var catStats = {};
  periodExpenses.forEach(function(e) {
    var cid = e.category_id;
    if (!catStats[cid]) catStats[cid] = { amount: 0, count: 0 };
    catStats[cid].amount += (parseFloat(e.amount) || 0);
    catStats[cid].count++;
  });

  var expenseReport = allCats.map(function(cat) {
    var stats = catStats[cat.id] || { amount: 0, count: 0 };
    return {
      category_name: cat.name,
      transaction_count: stats.count,
      total_amount: stats.amount,
      percentage: totalExpenses > 0 ? Math.round((stats.amount / totalExpenses) * 10000) / 100 : 0
    };
  }).filter(function(c) { return c.transaction_count > 0; })
    .sort(function(a, b) { return b.total_amount - a.total_amount; });

  // --- Customer Report ---
  var custStats = {};
  tripsReport.forEach(function(t) {
    var cname = t.customer_name;
    if (!custStats[cname]) custStats[cname] = { trips: 0, revenue: 0, expense: 0, net: 0 };
    custStats[cname].trips++;
    custStats[cname].revenue += t.revenue;
    custStats[cname].expense += t.total_expenses;
    custStats[cname].net += t.net_profit;
  });

  var customerReport = Object.keys(custStats).map(function(cname) {
    var stats = custStats[cname];
    return {
      customer_name: cname,
      total_trips: stats.trips,
      total_revenue: stats.revenue,
      total_expenses: stats.expense,
      net_profit: stats.net
    };
  }).sort(function(a, b) { return b.total_revenue - a.total_revenue; });

  return {
    summary: summary,
    trips: tripsReport,
    expenses_by_category: expenseReport,
    customers: customerReport
  };
}

// ============================================================
// SECTION 12 — INITIALISATION / SEED
// ============================================================

/**
 * Run this function ONCE manually from the Apps Script editor to:
 *  1. Create all 6 sheet tabs with correct headers.
 *  2. Seed Expense Categories.
 *  3. Seed default Settings.
 *
 * Safe to run multiple times — skips existing data.
 */
function initializeDatabase() {
  // Ensure all sheets exist with headers
  Object.keys(SHEETS).forEach(function(key) {
    getSheet(SHEETS[key]); // creates + headers if missing
  });

  // --- Seed Expense Categories ---
  var existingCats = readAll(SHEETS.EXPENSE_CATEGORIES);
  if (existingCats.length === 0) {
    var categorySeed = [
      { name: "Solar",        description: "Bahan bakar solar untuk operasional unit" },
      { name: "Tol",          description: "Biaya tol selama perjalanan" },
      { name: "Makan",        description: "Uang makan operator dan kru" },
      { name: "Parkir",       description: "Biaya parkir kendaraan" },
      { name: "Operator",     description: "Upah atau honor operator kendaraan" },
      { name: "Maintenance",  description: "Biaya perawatan dan servis unit" },
      { name: "Transportasi", description: "Biaya transportasi pendukung operasional" },
      { name: "Lain-lain",    description: "Pengeluaran operasional lainnya" }
    ];
    var now = nowISO();
    categorySeed.forEach(function(cat) {
      insertRow(SHEETS.EXPENSE_CATEGORIES, {
        id:          generateId(),
        name:        cat.name,
        description: cat.description,
        status:      "ACTIVE",
        created_at:  now,
        updated_at:  now
      });
    });
    Logger.log("Seeded " + categorySeed.length + " expense categories.");
  } else {
    Logger.log("Expense categories already exist (" + existingCats.length + " rows) — skipped.");
  }

  // --- Seed Settings ---
  var settingsSeed = [
    { key: "company_name",           value: "PT Putri Kharisma Jaya",     description: "Nama perusahaan" },
    { key: "company_address",        value: "-",                           description: "Alamat perusahaan" },
    { key: "company_phone",          value: "-",                           description: "Nomor telepon perusahaan" },
    { key: "company_email",          value: "-",                           description: "Email perusahaan" },
    { key: "tax_percentage",         value: "0",                           description: "Persentase pajak (0 = tidak ada pajak)" },
    { key: "currency_locale",        value: "id-ID",                       description: "Locale untuk format mata uang" },
    { key: "trip_number_sequence",   value: "0",                           description: "Nomor urut trip terakhir (auto-increment)" }
  ];
  var now = nowISO();
  var seededSettings = 0;
  settingsSeed.forEach(function(s) {
    if (findRowIndex(SHEETS.SETTINGS, "key", s.key) === -1) {
      insertRow(SHEETS.SETTINGS, { key: s.key, value: s.value, description: s.description, updated_at: now });
      seededSettings++;
    }
  });
  Logger.log("Seeded " + seededSettings + " settings (skipped " + (settingsSeed.length - seededSettings) + " existing).");

  Logger.log("✅ initializeDatabase() complete.");
}
