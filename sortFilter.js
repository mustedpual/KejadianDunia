export function parseCustomDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  dateStr = dateStr.trim();

  // Handle full ISO strings containing 'T' (e.g., vessel UTC timestamps)
  if (dateStr.includes('T')) {
      const parsed = Date.parse(dateStr);
      return isNaN(parsed) ? 0 : parsed;
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
      let year, month, day;

      // Auto-detect format: If the first part has 4 digits, it's YYYY-MM-DD
      if (parts[0].length === 4) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
      } else {
          // Otherwise, assume standard DD-MM-YYYY (Common Events format)
          day = parts[0];
          month = parts[1];
          year = parts[2];
      }
      
      const isoString = `${year}-${month}-${day}`;
      const parsedTimestamp = Date.parse(isoString);
      
      return isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
  }
  
  // Fallback for native parsing
  const fallbackParsed = Date.parse(dateStr);
  return isNaN(fallbackParsed) ? 0 : fallbackParsed;
}

// Restores input field text from the URL context if present on load/reset
export function syncFormWithUrl(section) {
  const urlParams = new URLSearchParams(window.location.search);
  const searchInput = section.querySelector("#eventSearch");
  
  if (searchInput && urlParams.has("cari")) {
      searchInput.value = urlParams.get("cari");
  }
}

export function openCalendar() {
  initializeDatePicker();
  const inputElement = document.getElementById('strictDateInput');
  if (typeof inputElement.showPicker === 'function') {
    inputElement.showPicker();
  } else {
    inputElement.click(); 
  }
}

function initializeDatePicker() {
  const inputElement = document.getElementById('strictDateInput');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // 1. Calculate boundaries for the current month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 2. Set min and max HTML attributes natively
  inputElement.min = formatDateString(firstDay);
  inputElement.max = formatDateString(lastDay);
}

function formatDateString(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function convertToStandardDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Clean up separators (handles dashes, slashes, or dots)
  const cleaned = dateStr.replace(/[\/.]/g, '-');
  const parts = cleaned.split('-');
  if (parts.length !== 3) return null;

  let p1 = parts[0], p2 = parts[1], p3 = parts[2];
  let year, month, day;

  // Rule 1: Detect YY-MM-DD or YYYY-MM-DD (Year is first)
  if (p1.length === 4 || parseInt(p1, 10) > 31) {
      year = p1;
      month = p2;
      day = p3;
  } 
  // Rule 2: Detect Year at the end
  else {
      year = p3;
      const num1 = parseInt(p1, 10);
      const num2 = parseInt(p2, 10);

      // Ambiguity resolution: If second number is > 12, it must be the day (MM-DD-YY)
      if (num2 > 12) {
          month = p1;
          day = p2;
      } 
      // If first number is > 12, it must be the day (DD-MM-YY)
      else if (num1 > 12) {
          day = p1;
          month = p2;
      } 
      // Default Fallback: If both are <= 12 (e.g. 05-06-26), assume DD-MM-YY
      // Change this order if your system expects MM-DD-YY by default
      else {
          day = p1;
          month = p2;
      }
  }

  // Standardize 2-digit years to 4 digits (e.g., "26" -> "2026")
  if (year.length === 2) {
      year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
  }
  
  // Ensure two digits for month and day (adds leading zeros if needed)
  const finalMonth = month.padStart(2, '0');
  const finalDay = day.padStart(2, '0');

  return `${year}-${finalMonth}-${finalDay}`;
}
