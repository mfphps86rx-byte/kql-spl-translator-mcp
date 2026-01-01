# Splunk Cloud + Azure Event Hub: Data Discovery Guide

## Problem Statement

When Azure data is ingested into Splunk Cloud via Azure Event Hub (following Microsoft's guide: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/stream-monitoring-data-event-hubs), the **index and sourcetype mappings are environment-specific**.

You cannot assume that:
- `SecurityEvent` → `index=securityevent`
- `DeviceProcessEvents` → `index=deviceprocessevents`

Instead, you need to **discover where your data actually lives** in Splunk.

---

## Solution: 3-Step Discovery Process

### Step 1: Run Discovery Queries

Use the provided helper script:

```bash
node splunk-data-discovery.js
```

This generates SPL queries you can run in Splunk Cloud to find your data.

### Step 2: Example Discovery Session

#### Query 1: Find all Azure data (by sourcetype)
```spl
index=* (sourcetype=*azure* OR sourcetype=*entra* OR sourcetype=*defender* OR sourcetype=*mscs* OR sourcetype=*o365* OR sourcetype=*office365*)
| stats count by index, sourcetype
| sort -count
```

**Example Output:**
```
index          sourcetype                    count
azure          azure:eventhub:aad:signin     15000
azure          azure:eventhub:aad:audit      8000
defender       azure:eventhub:mde:process    25000
defender       azure:eventhub:mde:network    12000
o365           azure:eventhub:o365:activity  5000
```

#### Query 2: Find Event Hub sourced data
```spl
index=* (source=*eventhub* OR sourcetype=*eventhub*)
| stats count by index, sourcetype, source
| sort -count
```

**Example Output:**
```
index     sourcetype                     source                          count
azure     azure:eventhub:aad:signin     eh-azuread-signin               15000
azure     azure:eventhub:aad:audit      eh-azuread-audit                8000
defender  azure:eventhub:mde:process    eh-defender-process             25000
```

#### Query 3: Broader search (if Query 1 returns nothing)
```spl
| eventcount summarize=false index=* 
| where NOT (index IN ("_*", "summary", "history"))
| table index
```
Then manually check each index for Azure data.

#### Query 4: Verify data structure
```spl
index=azure sourcetype="azure:eventhub:aad:signin"
| head 5
| table _time, UserPrincipalName, ResultType, IPAddress
```

**Example Output:**
```
_time                 UserPrincipalName           ResultType  IPAddress
2026-01-01 10:30:00   user@company.com            0           192.168.1.1
2026-01-01 10:31:00   admin@company.com           0           10.0.0.5
```

### Step 3: Create Custom Mapping

Based on your discovery results, create a mapping file:

**File: `splunk-mappings.json`**
```json
{
  "SecurityEvent": {
    "index": "windows",
    "sourcetype": "azure:eventhub:windows:security",
    "note": "Windows Security events via Event Hub"
  },
  "SigninLogs": {
    "index": "azure",
    "sourcetype": "azure:eventhub:aad:signin",
    "note": "Azure AD sign-in logs"
  },
  "AuditLogs": {
    "index": "azure",
    "sourcetype": "azure:eventhub:aad:audit",
    "note": "Azure AD audit logs"
  },
  "DeviceProcessEvents": {
    "index": "defender",
    "sourcetype": "azure:eventhub:mde:process",
    "note": "Defender for Endpoint process events"
  },
  "DeviceNetworkEvents": {
    "index": "defender",
    "sourcetype": "azure:eventhub:mde:network",
    "note": "Defender for Endpoint network events"
  },
  "EmailEvents": {
    "index": "o365",
    "sourcetype": "azure:eventhub:o365:email",
    "note": "Office 365 email events"
  },
  "OfficeActivity": {
    "index": "o365",
    "sourcetype": "azure:eventhub:o365:activity",
    "note": "Office 365 activity logs"
  }
}
```

---

## Using Custom Mappings in Your Code

### JavaScript Example

```javascript
const QueryTranslator = require('./enhanced-translator.js');
const fs = require('fs');

// Load your custom mappings
const customMappings = JSON.parse(
  fs.readFileSync('./splunk-mappings.json', 'utf8')
);

// Create translator with your environment's mappings
const translator = new QueryTranslator(customMappings);

// Translate a query
async function translateQuery() {
  const kqlQuery = `SigninLogs
  | where TimeGenerated > ago(1h)
  | where ResultType != "0"
  | summarize count() by UserPrincipalName`;

  const result = await translator.translate(kqlQuery, 'kql', 'spl');
  
  console.log('Translated SPL:');
  console.log(result.translatedQuery);
  // Output: index=azure sourcetype="azure:eventhub:aad:signin" TimeGenerated > ago(1h) ...
}
```

### Testing Your Mappings

```javascript
// Test that your mapping works
const testQuery = 'DeviceProcessEvents | where FileName == "powershell.exe" | take 10';

translator.translate(testQuery, 'kql', 'spl').then(result => {
  console.log('Translation Notes:');
  result.translationNotes.forEach(note => console.log('  -', note));
  
  // Should show: "Mapped table DeviceProcessEvents to index=defender sourcetype=azure:eventhub:mde:process"
});
```

---

## Common Splunk Cloud Scenarios

### Scenario 1: Splunk Add-on for Microsoft Cloud Services

If your org uses the official Splunk Add-on:

```json
{
  "SecurityEvent": {
    "index": "mscs",
    "sourcetype": "mscs:azure:windows:security",
    "note": "Microsoft Cloud Services Add-on"
  },
  "SigninLogs": {
    "index": "mscs",
    "sourcetype": "mscs:aad:signin",
    "note": "Microsoft Cloud Services Add-on"
  }
}
```

**Discovery query:**
```spl
index=mscs | stats count by sourcetype
```

### Scenario 2: Azure Monitor Add-on

If using Azure Monitor Add-on:

```json
{
  "SecurityEvent": {
    "index": "azuremonitor",
    "sourcetype": "azure:monitor:security",
    "note": "Azure Monitor Add-on"
  },
  "Resources": {
    "index": "azuremonitor",
    "sourcetype": "azure:monitor:resourcegraph",
    "note": "Azure Resource Graph data"
  }
}
```

**Discovery query:**
```spl
index=azure* | stats count by index, sourcetype
```

### Scenario 3: Custom Event Hub Setup

If your team built a custom integration:

```json
{
  "SecurityEvent": {
    "index": "azure_logs",
    "sourcetype": "eventhub:windows",
    "note": "Custom Event Hub integration"
  }
}
```

**Discovery query:**
```spl
index=* sourcetype=*eventhub* | stats count by index, sourcetype
```

---

## Auto-Generate Mapping Config

Run this query in Splunk to auto-generate JavaScript config:

```spl
index=* (azure OR entra OR microsoft OR defender OR office365 OR SecurityEvent OR DeviceProcessEvents OR SigninLogs)
| stats count by index, sourcetype
| eval kql_table=case(
    match(sourcetype, "(?i)signin"), "SigninLogs",
    match(sourcetype, "(?i)audit.*log"), "AuditLogs",
    match(sourcetype, "(?i)device.*process"), "DeviceProcessEvents",
    match(sourcetype, "(?i)device.*network"), "DeviceNetworkEvents",
    match(sourcetype, "(?i)device.*file"), "DeviceFileEvents",
    match(sourcetype, "(?i)security.*event"), "SecurityEvent",
    match(sourcetype, "(?i)office|o365"), "OfficeActivity",
    1=1, "Unknown"
  )
| where kql_table != "Unknown"
| eval mapping="  \"" + kql_table + "\": { \"index\": \"" + index + "\", \"sourcetype\": \"" + sourcetype + "\", \"note\": \"Auto-discovered\" },"
| table mapping
| head 50
```

**Example Output:**
```
mapping
"SigninLogs": { "index": "azure", "sourcetype": "azure:eventhub:aad:signin", "note": "Auto-discovered" },
"AuditLogs": { "index": "azure", "sourcetype": "azure:eventhub:aad:audit", "note": "Auto-discovered" },
"DeviceProcessEvents": { "index": "defender", "sourcetype": "azure:eventhub:mde:process", "note": "Auto-discovered" },
```

Copy/paste these into your `splunk-mappings.json` file!

---

## Verifying Your Mappings

After creating your mapping, verify it works:

```javascript
// Test script
const translator = new QueryTranslator(customMappings);

// Get the mapping for a specific table
const mapping = translator.getTableMapping()['SigninLogs'];
console.log('SigninLogs maps to:', mapping);
// Should show: { index: 'azure', sourcetype: 'azure:eventhub:aad:signin', note: '...' }

// Translate a test query
const testResult = await translator.translate(
  'SigninLogs | where ResultType != "0"',
  'kql',
  'spl'
);

console.log('Translated query:', testResult.translatedQuery);
// Should start with: index=azure sourcetype="azure:eventhub:aad:signin" ...
```

---

## Troubleshooting

### Problem: Discovery queries return no results

**Possible causes:**
1. Data hasn't been ingested yet
2. Using wrong search terms
3. Access permissions issue

**Solution:**
```spl
# Try broader search
index=* | stats count by index
# Then narrow down to indexes that look Azure-related
```

### Problem: Data exists but fields are missing

**Possible causes:**
1. Field extraction not configured
2. Data format different than expected
3. Parsing issues

**Solution:**
```spl
# Check raw data
index=your_index sourcetype=your_sourcetype
| head 1
| table _raw

# Then contact Splunk admin about field extractions
```

### Problem: Multiple sourcetypes for same table

**Possible causes:**
1. Multiple Event Hub namespaces
2. Different Azure regions
3. Migration/testing environments

**Solution:**
Use array in mapping or create separate mappings:
```javascript
// Option 1: Use primary sourcetype
"SigninLogs": {
  "index": "azure",
  "sourcetype": "azure:eventhub:aad:signin",
  "note": "Primary signin logs"
}

// Option 2: Search across multiple
// In this case, omit sourcetype and add field filtering
"SigninLogs": {
  "index": "azure",
  "sourcetype": null,  // Will search all sourcetypes in index
  "note": "Signin logs - multiple sourcetypes in azure index"
}
```

---

## Best Practices

1. **Document your mappings** - Add detailed notes about where data comes from
2. **Version control** - Keep `splunk-mappings.json` in source control
3. **Test regularly** - Verify mappings after Splunk configuration changes
4. **Work with admin** - Coordinate with Splunk admin on data ingestion
5. **Monitor data volume** - Use discovery queries to track data growth

---

## Questions to Ask Your Splunk Admin

1. Which indexes contain Azure Event Hub data?
2. What sourcetype naming convention was used?
3. Are there any field extraction configurations?
4. How is data from different Azure services separated?
5. Are there any retention policies affecting data availability?
6. What's the ingestion delay from Azure to Splunk?

---

## Summary

✅ KQL tables ≠ Splunk indexes (mapping is environment-specific)  
✅ Use discovery queries to find your data  
✅ Create custom mapping configuration  
✅ Test translations with your actual data  
✅ Work with Splunk admin for accurate mappings  

**Tools provided:**
- `splunk-data-discovery.js` - Discovery query generator
- `enhanced-translator.js` - Translator with mapping support
- `test-table-mapping.js` - Mapping test script
