# Changelog

All notable changes to the KQL-SPL Translator MCP Server.

## [1.0.0] - 2026-01-01

### 🎉 Initial Release

#### Core Features
- ✅ Bidirectional KQL ↔ SPL translation
- ✅ Query explanation in plain English
- ✅ Syntax validation with warnings
- ✅ Confidence scoring (96.25% average)

#### Custom Mapping System
- ✅ KQL table to Splunk index/sourcetype mapping
- ✅ 30+ default mappings included
- ✅ Custom mapping file support (`splunk-mappings.json`)
- ✅ Runtime mapping updates via API
- ✅ Discovery query generation

#### Quality Assurance
- ✅ 74 comprehensive tests (100% pass rate)
- ✅ Basic functionality tests (4 tests)
- ✅ Stress testing (30 edge cases, 0 crashes)
- ✅ Validation tests (20 accuracy tests)
- ✅ Real-world tests (20 queries from kqlsearch.com)

#### Documentation
- ✅ Distribution README with setup instructions
- ✅ Splunk Cloud + Azure Event Hub mapping guide
- ✅ Discovery workflow documentation
- ✅ Example mapping configurations
- ✅ Troubleshooting guide

#### MCP Integration
- ✅ Full MCP SDK integration
- ✅ 7 tools exposed via MCP protocol
- ✅ Compatible with Claude Desktop and other MCP clients
- ✅ Stdio transport support

#### Supported Translations

**KQL Operators:**
- Tables, where, summarize, extend, project
- join, union, distinct, take/limit
- sort, top, count, bin
- Time functions (ago, between, startofday, etc.)
- String functions (contains, startswith, etc.)
- Regex and filtering

**SPL Commands:**
- search, stats, eval, fields, table
- join, append, dedup, head/tail
- sort, top, rare, spath
- Time functions (relative_time, strftime, etc.)
- String functions (match, like, etc.)
- rex and filtering

#### Known Limitations
- Complex nested queries may require manual review
- Some advanced functions have no direct equivalent
- Join operations flagged for manual validation
- Table mappings are environment-specific (requires discovery)

### Configuration
- Auto-loads `splunk-mappings.json` if present
- Fallback to 30+ intelligent default mappings
- Environment-specific customization supported

### Performance
- Average confidence: 96.25%
- Zero crashes in stress testing
- Fast translation (< 100ms for typical queries)

---

## Future Enhancements (Planned)

- [ ] Advanced join translation
- [ ] Multi-query batch translation
- [ ] Performance metrics API
- [ ] Web UI for mapping management
- [ ] Additional test scenarios
- [ ] CI/CD integration examples
- [ ] Docker containerization
- [ ] REST API wrapper (optional)

---

## Compatibility

- **Node.js**: 18.0.0+
- **MCP SDK**: 0.5.0+
- **Tested With**: Claude Desktop
- **Should Work With**: Any MCP-compatible client

---

## Support

For issues, questions, or contributions, please refer to:
- **Main Documentation**: [DISTRIBUTION-README.md](DISTRIBUTION-README.md)
- **Mapping Guide**: [SPLUNK-CLOUD-EVENT-HUB-GUIDE.md](SPLUNK-CLOUD-EVENT-HUB-GUIDE.md)
- **Test Results**: Run `npm run test:all`
