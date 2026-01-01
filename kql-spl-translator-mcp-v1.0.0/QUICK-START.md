# 🚀 Quick Start Guide

Get your KQL-SPL Translator MCP Server running in 5 minutes!

## Prerequisites

- **Node.js** 18.0.0 or higher ([Download](https://nodejs.org/))
- **Claude Desktop** (or any MCP-compatible client)

## Installation (3 Steps)

### 1. Extract Package

```bash
tar -xzf kql-spl-translator-mcp-v1.0.0.tar.gz
cd kql-spl-translator-mcp-v1.0.0
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test Installation

```bash
npm test
```

✅ You should see: "All tests completed successfully!"

---

## Configure with Claude Desktop

### Find Your Config File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Add MCP Server

Edit the config file and add:

```json
{
  "mcpServers": {
    "kql-spl-translator": {
      "command": "node",
      "args": ["/FULL/PATH/TO/kql-spl-translator-mcp-v1.0.0/server.js"]
    }
  }
}
```

**⚠️ Important:** Replace `/FULL/PATH/TO/` with your actual path!

**Example paths:**
- macOS: `/Users/yourname/Downloads/kql-spl-translator-mcp-v1.0.0/server.js`
- Windows: `C:\\Users\\yourname\\Downloads\\kql-spl-translator-mcp-v1.0.0\\server.js`
- Linux: `/home/yourname/Downloads/kql-spl-translator-mcp-v1.0.0/server.js`

### Restart Claude Desktop

Close and reopen Claude Desktop completely.

---

## Test It Works

Ask Claude:

> "Translate this KQL query to SPL: `SecurityEvent | where EventID == 4624 | summarize count() by Computer`"

Expected response shows the SPL translation with confidence score!

---

## Optional: Custom Mappings (Recommended for Production)

If you're using **Splunk Cloud with Azure Event Hub**:

### 1. Discover Your Mappings

```bash
npm run discovery
```

Copy the discovery queries and run them in Splunk.

### 2. Create Custom Mapping File

```bash
cp splunk-mappings.example.json splunk-mappings.json
```

Edit `splunk-mappings.json` with your actual index/sourcetype combinations.

### 3. Restart Server

The server auto-loads `splunk-mappings.json` on startup!

📖 **Full guide:** See [SPLUNK-CLOUD-EVENT-HUB-GUIDE.md](SPLUNK-CLOUD-EVENT-HUB-GUIDE.md)

---

## Usage Examples

Once configured, ask Claude:

**Query Translation:**
> "Convert this KQL to SPL: `SigninLogs | where TimeGenerated > ago(1h) | where ResultType != 0`"

**Query Explanation:**
> "What does this SPL query do? `index=main | stats avg(response_time) by host`"

**Reverse Translation:**
> "Translate this Splunk query to KQL: `index=security EventID=4625 | stats count by src_ip`"

---

## Troubleshooting

### "Tests fail" or "Module not found"

```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### "MCP server not connecting"

1. Check the path in `claude_desktop_config.json` is **absolute** (starts with `/` or `C:\`)
2. Verify `server.js` exists at that path
3. Restart Claude Desktop completely (not just reload)

### "Translation seems wrong"

You may need custom mappings for your environment:

```bash
npm run discovery
```

Follow the [SPLUNK-CLOUD-EVENT-HUB-GUIDE.md](SPLUNK-CLOUD-EVENT-HUB-GUIDE.md).

### "Can't find Node.js"

Download from [nodejs.org](https://nodejs.org/) and install.

Verify: `node --version` (should be 18.0.0+)

---

## Next Steps

✅ **Installed** - Server is running  
🎯 **Configured** - Claude can use it  
📊 **Tested** - Translations work  

### What's Next?

1. **Read the full docs:** [README.md](README.md)
2. **Set up custom mappings:** [SPLUNK-CLOUD-EVENT-HUB-GUIDE.md](SPLUNK-CLOUD-EVENT-HUB-GUIDE.md)
3. **Run comprehensive tests:** `npm run test:all`
4. **Start translating!** Ask Claude to translate your queries

---

## Support

**Having issues?**

1. Check [README.md](README.md) - Troubleshooting section
2. Run `npm test` to verify installation
3. Check Node version: `node --version`

**Working great?**

Share it with your team! Send them the `.tar.gz` file.

---

## Summary

```bash
# Extract
tar -xzf kql-spl-translator-mcp-v1.0.0.tar.gz
cd kql-spl-translator-mcp-v1.0.0

# Install
npm install

# Test
npm test

# Configure Claude Desktop
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
# Add server with full path to server.js

# Restart Claude Desktop
# Ask Claude to translate a query!
```

**You're all set! 🎉**
