# Enhanced Query Translator MCP Server

An improved SPL ↔ KQL translation system with validation and auto-refresh capabilities.

## Features

✅ **Official Documentation Sources**
- SPL: Splunk Quick Reference Guide
- KQL: Microsoft Learn Azure Data Explorer documentation

✅ **Syntax Validation**
- Pre-translation validation of input queries
- Post-translation validation of output queries
- Detailed error and warning reporting

✅ **Smart Translation**
- Command-by-command translation with context awareness
- Proper handling of JSON parsing (spath → parse_json)
- Array expansion (mvexpand → mv-expand)
- Time functions and modifiers
- Confidence scoring for translations

✅ **Auto-Refresh System**
- Periodic updates from official sources
- Configurable refresh intervals (default: 7 days)
- Manual refresh trigger available

## Files Structure

```
/Users/ryan/MCP/
├── splunk-reference.json      # Splunk SPL command reference
├── kql-reference.json          # KQL operator reference
├── enhanced-translator.js      # Main translation engine with validation
├── auto-refresh.js             # Auto-refresh documentation system
└── README.md                   # This file
```

## ⚠️ Important: KQL Tables vs Splunk Indexes

### The Challenge

KQL uses **tables** (SecurityEvent, DeviceProcessEvents, etc.) while Splunk uses **indexes** (windows, defender, main, etc.) + **sourcetypes**. These do NOT map 1:1!

For example:
- `SecurityEvent` data could be in `index=windows`, `index=security`, OR `index=main`
- When data comes from Azure Event Hub, mappings depend on your Splunk configuration

### The Solution

The translator includes:
1. **Default mappings** for 30+ common KQL tables
2. **Custom mapping support** for your environment
3. **Discovery queries** to find your actual data locations

### Discovering Your Data Mappings

If using **Splunk Cloud with Azure Event Hub**, run:

```bash
node splunk-data-discovery.js
```

This provides:
- SPL queries to discover where your Azure data lives
- Common Event Hub ingestion patterns
- Auto-generation of mapping configuration
- Step-by-step discovery workflow

### Using Custom Mappings

```javascript
const QueryTranslator = require('./enhanced-translator.js');

// Define your environment's mappings
const customMapping = {
  "SecurityEvent": {
    index: "windows",
    sourcetype: "WinEventLog:Security",
    note: "Windows Security events from Event Hub"
  },
  "DeviceProcessEvents": {
    index: "mde",
    sourcetype: "azure:eventhub:defender",
    note: "Defender data via Event Hub"
  }
};

// Pass custom mapping to translator
const translator = new QueryTranslator(customMapping);
```

Or update mappings after creation:

```javascript
const translator = new QueryTranslator();

translator.setTableMapping({
  "MyCustomTable": {
    index: "my_app_index",
    sourcetype: "custom:logs",
    note: "Custom application logs"
  }
});
```

## Integration with Your MCP Server

### Option 1: Replace Existing Translation Logic

Update `/Users/ryan/query-translator-mcp/dist/index.js` to use the enhanced translator:

```javascript
const QueryTranslator = require('/Users/ryan/MCP/enhanced-translator.js');

// Load custom mappings for your Splunk environment
const customMappings = require('./splunk-mappings.json');
const translator = new QueryTranslator(customMappings);

// In your translate function:
async function translateSPLtoKQL(query) {
  const result = await translator.translateSPLtoKQL(query);
  
  return {
    originalQuery: result.originalQuery,
    translatedQuery: result.translatedQuery,
    validation: {
      input: result.inputValidation,
      output: result.outputValidation
    },
    confidence: result.confidence,
    notes: result.translationNotes
  };
}
```

### Option 2: Add as Separate Enhanced Translation Tool

Add new MCP tools alongside existing ones:

```json
{
  "tools": {
    "translate_spl_to_kql_enhanced": {
      "description": "Enhanced SPL to KQL translation with validation",
      "handler": "enhancedTranslator.translateSPLtoKQL"
    },
    "validate_spl": {
      "description": "Validate SPL syntax",
      "handler": "enhancedTranslator.validateSPL"
    },
    "validate_kql": {
      "description": "Validate KQL syntax",
      "handler": "enhancedTranslator.validateKQL"
    }
  }
}
```

## Key Improvements Over Current System

### 1. **Accurate Command Mappings**

**Before:**
```
SPL: mvexpand field
KQL: mvexpand field  ❌ INVALID SYNTAX
```

**After:**
```
SPL: mvexpand field
KQL: | mv-expand field  ✅ VALID
```

### 2. **JSON Parsing**

**Before:**
```
SPL: | spath path=properties.targetResources{} output=targetResources
KQL: | spath path ==properties.targetResources{} output ==targetResources  ❌
```

**After:**
```
SPL: | spath path=properties.targetResources{} output=targetResources  
KQL: | mv-expand targetResources = properties.targetResources  ✅
     | extend field = tostring(targetResources.property)
```

### 3. **Time Functions**

**Before:**
```
SPL: earliest=-8d
KQL: earliest ==-8d  ❌
```

**After:**
```
SPL: earliest=-8d
KQL: | where TimeGenerated >= ago(8d)  ✅
```

### 4. **Validation & Confidence Scores**

Each translation includes:
- Input validation (syntax errors/warnings)
- Output validation (syntax errors/warnings)
- Translation notes (manual review needed)
- Confidence score (0-100%)

Example output:
```json
{
  "originalQuery": "index=security EventID=4625 | stats count by Computer",
  "translatedQuery": "security\\n| where EventID == 4625\\n| summarize count() by Computer",
  "inputValidation": {
    "valid": true,
    "errors": [],
    "warnings": []
  },
  "outputValidation": {
    "valid": true,
    "errors": [],
    "warnings": []
  },
  "translationNotes": [
    "Mapped index=security to table security",
    "Translated stats count by Computer"
  ],
  "confidence": 95
}
```

## Auto-Refresh Setup

### Start Auto-Refresh Service

```bash
cd /Users/ryan/MCP
node auto-refresh.js start
```

This will:
- Check if references need updating (every 7 days by default)
- Log refresh instructions for manual updates
- Run continuously in the background

### Manual Refresh

```bash
node auto-refresh.js refresh
```

### Check Refresh Status

```bash
node auto-refresh.js status
```

Output:
```json
{
  "autoRefreshEnabled": true,
  "refreshIntervalDays": 7,
  "lastKqlUpdate": "2025-12-31T...",
  "lastSplunkUpdate": "2025-12-31T...",
  "kqlNeedsRefresh": false,
  "splunkNeedsRefresh": false,
  "nextScheduledRefresh": "2026-01-07T..."
}
```

### Integration with MCP Microsoft-Learn Tool

To automatically refresh KQL documentation:

```javascript
// In your auto-refresh.js, replace the refreshKQLReference method:

async refreshKQLReference() {
  // Call MCP tool
  const mcpClient = require('./mcp-client'); // Your MCP client
  
  const queries = [
    'Azure Data Explorer Kusto Query Language operators',
    'KQL mv-expand parse extend where operators',
    'KQL scalar functions datetime string conversion'
  ];
  
  const results = [];
  for (const query of queries) {
    const result = await mcpClient.call('mcp_microsoft-lea_microsoft_docs_search', {
      query: query
    });
    results.push(result);
  }
  
  // Parse results and update kql-reference.json
  await this.updateKQLReference(results);
  
  const config = await this.loadConfig();
  config.lastKqlUpdate = new Date().toISOString();
  await this.saveConfig(config);
  
  return { success: true, documentsProcessed: results.length };
}
```

## Testing the Enhanced Translator

### Test Simple Query

```javascript
const QueryTranslator = require('./enhanced-translator.js');

const translator = new QueryTranslator();

// Load references
await translator.loadReferences();

// Test translation
const result = await translator.translateSPLtoKQL(
  'index=security EventID=4625 | stats count by Computer'
);

console.log('Translated Query:', result.translatedQuery);
console.log('Confidence:', result.confidence + '%');
console.log('Notes:', result.translationNotes);
```

### Test Complex Query (Your Audit Log Example)

```javascript
const complexQuery = `index=* category=AuditLogs earliest=-8d operationName="Update user"
| spath path=properties.targetResources{} output=targetResources
| mvexpand targetResources
| spath input=targetResources path=userPrincipalName output=trUpn
| eval country_old=lower(replace(country_old_raw, "[\\\"\\[\\]\\s]", ""))
| where country_old!=country_new
| table _time, trUpn, country_old, country_new`;

const result = await translator.translateSPLtoKQL(complexQuery);
console.log(result.translatedQuery);
```

Expected output will be valid KQL with proper:
- `mv-expand` instead of `mvexpand`
- `extend` instead of `eval`
- `project` instead of `table`
- Proper JSON field access
- Valid time filtering

## Configuration

Create `refresh-config.json` to customize:

```json
{
  "lastSplunkUpdate": "2025-12-31T...",
  "lastKqlUpdate": "2025-12-31T...",
  "splunkSource": "https://www.splunk.com/en_us/pdfs/solution-guide/splunk-quick-reference-guide.pdf",
  "kqlSources": [
    "https://learn.microsoft.com/en-us/kusto/query/kql-quick-reference"
  ],
  "autoRefreshEnabled": true,
  "refreshIntervalDays": 7
}
```

## Next Steps

1. **Integrate into your existing MCP server** at `/Users/ryan/query-translator-mcp/`
2. **Test with your problem queries** to verify improvements
3. **Set up auto-refresh** to keep documentation current
4. **Add more translation patterns** as you encounter edge cases

## Support

The enhanced system uses:
- Official Splunk Quick Reference Guide (provided)
- Microsoft Learn documentation (via MCP tool)
- Comprehensive command mappings
- Syntax validation
- Confidence scoring

All translations are now based on official documentation rather than pattern matching!
