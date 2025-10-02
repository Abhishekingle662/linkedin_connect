# 🎯 LinkedIn Hiring Team Finder

## Overview
The Hiring Team Finder is a powerful addition to your LinkedIn Auto-Note Connect extension that helps you find the "side door" into companies by identifying hiring managers, recruiters, and your network connections at target companies.

## Features

### 🔍 **Automatic Detection**
- Automatically detects when you're viewing LinkedIn job postings
- Extracts job title, company name, and posting details
- Shows a floating widget with hiring team information

### 👥 **Your Network Analysis**
- Scans for people you know at the target company
- Shows current and former employees in your network
- Provides quick actions to view profiles and send messages

### 🎯 **Hiring Team Discovery**
- **Find Recruiters**: Discovers talent acquisition specialists, recruiters, and hiring partners
- **Find Hiring Managers**: Identifies engineering managers, directors, and VPs who might be hiring
- Opens targeted LinkedIn searches with relevant keywords

### ⚡ **Quick Actions**
- One-click buttons to connect with hiring team members
- Direct links to view profiles
- Smart search queries to find the right people

## How to Use

### Method 1: Automatic
1. Navigate to any job posting on supported portals:
   - LinkedIn jobs (`/jobs/view/*`)
   - Greenhouse (`boards.greenhouse.io/*/jobs/*`)
   - Ashby HQ (`jobs.ashbyhq.com/*/jobs/*`)
   - Wellfound (`wellfound.com/company/*/jobs/*`)
   - Lever (`jobs.lever.co/*/jobs/*`)
   - Workable (`apply.workable.com/*/j/*`)
   - Workday (`*.myworkdayjobs.com/*/*`)
2. The Hiring Team Finder widget will automatically appear in the top-right corner
3. Click "Find Recruiters" or "Find Hiring Managers" to discover key contacts

### Method 2: Keyboard Shortcut
1. On any job posting page, press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)
2. The widget will toggle open/closed

### Method 3: Manual Search
1. Use the "Search All Employees" button to explore the entire company
2. Use targeted search buttons for specific roles

## Widget Sections

### 📋 **Job Information**
- Displays the job title and company name
- Shows the specific posting you're viewing

### 👥 **Your Network**
- Lists connections you have at the company
- Shows their current roles and titles
- Provides quick action buttons

### 🔍 **Hiring Team**
- Two main categories: Recruiters and Hiring Managers
- Smart search functionality
- Direct LinkedIn search integration

## Tips for Success

### 🎯 **Best Practices**
1. **Start with Your Network**: Always check if you know someone at the company first
2. **Target Recruiters**: They're often more responsive to connection requests
3. **Research Before Connecting**: View profiles to understand their role and background
4. **Use Personalized Messages**: Reference the specific job posting in your outreach

### 🚀 **Advanced Strategies**
1. **Multi-Level Approach**: Connect with both recruiters AND hiring managers
2. **Employee Referrals**: Ask your network connections about referral processes
3. **Follow-Up Timing**: Space out your outreach to avoid seeming spammy

## Technical Details

### Supported Job Portals
- **LinkedIn**: `https://www.linkedin.com/jobs/view/*`
- **Greenhouse**: `https://boards.greenhouse.io/*/jobs/*` and `https://*.greenhouse.io/*/jobs/*`
- **Ashby HQ**: `https://jobs.ashbyhq.com/*/jobs/*` and `https://*.ashbyhq.com/*/jobs/*`
- **Wellfound**: `https://wellfound.com/company/*/jobs/*` and `https://angel.co/company/*/jobs/*`
- **Lever**: `https://jobs.lever.co/*/jobs/*` and `https://*.lever.co/*/jobs/*`
- **Workable**: `https://apply.workable.com/*/j/*` and `https://*.workable.com/jobs/*`
- **Workday**: `https://*.myworkdayjobs.com/*/*`

### Data Extracted
- Job title and company name
- Job location and posting ID
- Company LinkedIn page (when available)

### Search Terms Used
**For Recruiters:**
- recruiter
- talent acquisition
- talent partner
- hiring

**For Managers:**
- hiring manager
- engineering manager
- director
- vp

## Keyboard Shortcuts
- `Ctrl+Shift+H` (Windows) / `Cmd+Shift+H` (Mac): Toggle Hiring Team Finder

## Future Enhancements
- [ ] Integration with LinkedIn's actual search API
- [ ] Connection strength analysis
- [ ] Outreach tracking and follow-up reminders
- [ ] Custom search term configuration
- [ ] Export hiring contact lists
- [ ] Success rate analytics

---

**Version**: 1.6.0  
**Compatibility**: LinkedIn job posting pages  
**Browser**: Chrome (Manifest v3)
