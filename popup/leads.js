// CRM Leads Manager
let currentLeads = [];

// DOM Elements
const leadsContainer = document.getElementById('leadsContainer');
const leadsEmptyState = document.getElementById('leadsEmptyState');
const leadsTable = document.getElementById('leadsTable');
const exportBtn = document.getElementById('exportToSheetsBtn');
const clearLeadsBtn = document.getElementById('clearLeadsBtn');
const filterInput = document.getElementById('filterLeads');

// Initialize leads
async function initializeLeads() {
  await loadLeads();
  setupLeadsEventListeners();
}

// Setup event listeners for leads
function setupLeadsEventListeners() {
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToGoogleSheets);
  }
  if (clearLeadsBtn) {
    clearLeadsBtn.addEventListener('click', clearAllLeads);
  }
  if (filterInput) {
    filterInput.addEventListener('input', filterLeads);
  }
}

// Load leads from storage
async function loadLeads() {
  try {
    const result = await chrome.storage.local.get(['leads']);
    currentLeads = result.leads || [];
    renderLeads(currentLeads);
  } catch (error) {
    console.error('Error loading leads:', error);
  }
}

// Save a new lead
async function saveLead(leadData) {
  try {
    const result = await chrome.storage.local.get(['leads']);
    let leads = result.leads || [];

    const newLead = {
      id: generateId(),
      firstName: leadData.firstName || '',
      lastName: leadData.lastName || '',
      email: leadData.email || '',
      company: leadData.company || '',
      title: leadData.title || '',
      profileUrl: leadData.profileUrl || '',
      messageUsed: leadData.messageUsed || '',
      timestamp: Date.now(),
      notes: leadData.notes || ''
    };

    leads.push(newLead);
    await chrome.storage.local.set({ leads });

    // Reload leads to update the display
    await loadLeads();

    console.log('[Connect Quick CRM] Lead saved:', newLead.firstName, newLead.lastName);
  } catch (error) {
    console.error('Error saving lead:', error);
  }
}

// Render leads table
function renderLeads(leads) {
  if (leads.length === 0) {
    leadsEmptyState.style.display = 'block';
    leadsTable.style.display = 'none';
    return;
  }

  leadsEmptyState.style.display = 'none';
  leadsTable.style.display = 'table';

  const tbody = leadsTable.querySelector('tbody');
  tbody.innerHTML = '';

  leads.forEach((lead) => {
    const row = document.createElement('tr');
    const date = new Date(lead.timestamp).toLocaleDateString();
    const time = new Date(lead.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <td class="lead-name">${escapeHtml(lead.firstName)} ${escapeHtml(lead.lastName)}</td>
      <td class="lead-company">${escapeHtml(lead.company)}</td>
      <td class="lead-title">${escapeHtml(lead.title)}</td>
      <td class="lead-message">${escapeHtml(lead.messageUsed.substring(0, 30))}${lead.messageUsed.length > 30 ? '...' : ''}</td>
      <td class="lead-date">${date}</td>
      <td class="lead-time">${time}</td>
      <td class="lead-actions">
        <button class="action-btn view-lead-btn" data-id="${lead.id}" title="View details">👁️</button>
        <button class="action-btn delete-lead-btn" data-id="${lead.id}" title="Delete lead">🗑️</button>
      </td>
    `;

    row.querySelector('.view-lead-btn').addEventListener('click', () => showLeadDetails(lead));
    row.querySelector('.delete-lead-btn').addEventListener('click', () => deleteLead(lead.id));

    tbody.appendChild(row);
  });
}

// Filter leads
function filterLeads(event) {
  const query = event.target.value.toLowerCase();
  const filtered = currentLeads.filter(lead =>
    lead.firstName.toLowerCase().includes(query) ||
    lead.lastName.toLowerCase().includes(query) ||
    lead.email.toLowerCase().includes(query) ||
    lead.company.toLowerCase().includes(query)
  );
  renderLeads(filtered);
}

// Show lead details in a modal
function showLeadDetails(lead) {
  // Close any existing modal first
  closeLeadDetails();
  
  const detailsHTML = `
    <div class="lead-details-modal">
      <div class="lead-details-content">
        <h3>${escapeHtml(lead.firstName)} ${escapeHtml(lead.lastName)}</h3>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${escapeHtml(lead.email)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Company:</span>
          <span class="detail-value">${escapeHtml(lead.company)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Title:</span>
          <span class="detail-value">${escapeHtml(lead.title)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Message:</span>
          <span class="detail-value">${escapeHtml(lead.messageUsed)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date/Time:</span>
          <span class="detail-value">${new Date(lead.timestamp).toLocaleString()}</span>
        </div>
        ${lead.profileUrl ? `
        <div class="detail-row">
          <span class="detail-label">LinkedIn Profile:</span>
          <a href="${lead.profileUrl}" target="_blank" class="detail-link">View Profile</a>
        </div>
        ` : ''}
        ${lead.notes ? `
        <div class="detail-row">
          <span class="detail-label">Notes:</span>
          <span class="detail-value">${escapeHtml(lead.notes)}</span>
        </div>
        ` : ''}
        <button class="btn btn-primary close-lead-modal-btn">Close</button>
      </div>
      <div class="lead-details-overlay"></div>
    </div>
  `;

  // Insert into DOM
  const modal = document.createElement('div');
  modal.innerHTML = detailsHTML;
  modal.id = 'leadDetailsModal';
  document.body.appendChild(modal);

  // Add event listeners for close actions
  const closeBtn = modal.querySelector('.close-lead-modal-btn');
  const overlay = modal.querySelector('.lead-details-overlay');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLeadDetails();
    }, { once: true });
  }
  
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLeadDetails();
    }, { once: true });
  }

  // Close the modal when profile link is clicked
  const profileLink = modal.querySelector('.detail-link');
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.stopPropagation();
      // Defer close slightly to allow the new tab to open
      setTimeout(closeLeadDetails, 50);
    }, { once: true });
  }
}

// Close lead details modal
function closeLeadDetails() {
  const modal = document.getElementById('leadDetailsModal');
  if (modal) {
    modal.remove();
  }
}

// Delete a lead
async function deleteLead(leadId) {
  if (!confirm('Are you sure you want to delete this lead?')) {
    return;
  }

  try {
    const result = await chrome.storage.local.get(['leads']);
    let leads = result.leads || [];
    leads = leads.filter(lead => lead.id !== leadId);

    await chrome.storage.local.set({ leads });
    await loadLeads();
    console.log('[Connect Quick CRM] Lead deleted');
  } catch (error) {
    console.error('Error deleting lead:', error);
  }
}

// Clear all leads
async function clearAllLeads() {
  if (!confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({ leads: [] });
    await loadLeads();
    console.log('[Connect Quick CRM] All leads cleared');
  } catch (error) {
    console.error('Error clearing leads:', error);
  }
}

// Export to Google Sheets
async function exportToGoogleSheets() {
  if (currentLeads.length === 0) {
    alert('No leads to export. Add some leads first!');
    return;
  }

  try {
    // Show loading state
    const originalText = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';

    // Create CSV data
    const csvData = convertLeadsToCSV(currentLeads);

    // Create a blob and download
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `leads-export-${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Restore button state
    exportBtn.disabled = false;
    exportBtn.textContent = originalText;

    // Show success message
    showLeadsNotification('Leads exported as CSV! You can now import this to Google Sheets.', 'success');

    // Show instructions
    alert(`
Your leads have been exported as CSV!

To import to Google Sheets:
1. Go to https://sheets.google.com
2. Create a new spreadsheet or open an existing one
3. Click "File" → "Import" → "Upload"
4. Select the downloaded CSV file
5. Choose "Insert new sheet" or replace existing data

Your exported leads include:
- Name, Email, Company, Title
- Message used
- Date and timestamp of contact
    `);
  } catch (error) {
    console.error('Error exporting to sheets:', error);
    exportBtn.disabled = false;
    exportBtn.textContent = originalText;
    showLeadsNotification('Error exporting leads', 'error');
  }
}

// Convert leads to CSV format
function convertLeadsToCSV(leads) {
  const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Title', 'Message', 'Date', 'Time', 'LinkedIn Profile', 'Notes'];
  const csvRows = [headers.map(h => `"${h}"`).join(',')];

  leads.forEach(lead => {
    const date = new Date(lead.timestamp).toLocaleDateString();
    const time = new Date(lead.timestamp).toLocaleTimeString();
    const row = [
      `"${escapeCSV(lead.firstName)}"`,
      `"${escapeCSV(lead.lastName)}"`,
      `"${escapeCSV(lead.email)}"`,
      `"${escapeCSV(lead.company)}"`,
      `"${escapeCSV(lead.title)}"`,
      `"${escapeCSV(lead.messageUsed)}"`,
      `"${date}"`,
      `"${time}"`,
      `"${lead.profileUrl || ''}"`,
      `"${escapeCSV(lead.notes || '')}"`,
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

// Escape CSV special characters
function escapeCSV(str) {
  if (!str) return '';
  return str.replace(/"/g, '""');
}

// Show notification
function showLeadsNotification(message, type) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Could also add a toast notification here
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for lead data from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveLead') {
    saveLead(request.data);
    sendResponse({ success: true });
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.leads) {
    loadLeads();
  }
});
