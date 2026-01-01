#!/usr/bin/env node
/**
 * Splunk Data Discovery Helper
 * Generates SPL queries to help users discover where their Azure/Microsoft data lives
 * in their Splunk environment
 */

const QueryTranslator = require('./enhanced-translator.js');

class SplunkDataDiscovery {
  constructor() {
    this.translator = new QueryTranslator();
  }

  /**
   * Generate discovery queries for finding Azure data in Splunk
   */
  generateDiscoveryQueries() {
    return {
      // Discover all indexes
      allIndexes: `| eventcount summarize=false index=* 
| dedup index 
| table index`,

      // Discover all sourcetypes
      allSourcetypes: `| metadata type=sourcetypes 
| table sourcetype, totalCount, lastTime`,

      // Find Azure-related data
      azureData: `index=* (azure OR entra OR "Azure Active Directory" OR microsoft OR defender OR office365)
| stats count by index, sourcetype
| sort -count`,

      // Find Windows Security events
      windowsSecurity: `index=* (EventCode=4624 OR EventID=4624 OR "Event ID: 4624")
| stats count by index, sourcetype
| sort -count`,

      // Find Microsoft Defender data
      defenderData: `index=* (DeviceName OR DeviceId OR "Microsoft Defender")
| stats count by index, sourcetype
| sort -count`,

      // Find Azure AD / Entra ID data
      entraData: `index=* (UserPrincipalName OR "Azure AD" OR "Entra ID" OR SignInLogs)
| stats count by index, sourcetype
| sort -count`,

      // Find Office 365 data
      office365Data: `index=* (office365 OR o365 OR Exchange OR SharePoint OR Teams)
| stats count by index, sourcetype
| sort -count`,

      // Find all Event Hub sourced data
      eventHubData: `index=* source=*eventhub* OR sourcetype=*eventhub* OR sourcetype=*azure*
| stats count by index, sourcetype, source
| sort -count`,

      // Sample events per sourcetype
      sampleEventsBySourcetype: (sourcetype) => `index=* sourcetype="${sourcetype}"
| head 5
| table _time, index, sourcetype, _raw`,

      // Discover field names in a sourcetype
      fieldDiscovery: (sourcetype) => `index=* sourcetype="${sourcetype}"
| head 1000
| fieldsummary
| table field, count, distinct_count
| sort -count`
    };
  }

  /**
   * Generate mapping discovery workflow
   */
  generateMappingWorkflow() {
    console.log('='  .repeat(70));
    console.log('🔍 SPLUNK DATA DISCOVERY WORKFLOW');
    console.log('='  .repeat(70));
    console.log('\nWhen Azure data is ingested via Event Hub, the index/sourcetype');
    console.log('mappings depend on your Splunk administrator\'s configuration.');
    console.log('\nFollow this workflow to discover YOUR environment\'s mappings:\n');

    const queries = this.generateDiscoveryQueries();

    console.log('STEP 1: Discover all indexes in your environment');
    console.log('-'.repeat(70));
    console.log('Run this query in Splunk:');
    console.log('```spl');
    console.log(queries.allIndexes);
    console.log('```');
    console.log('Expected output: List of all indexes (main, windows, azure, etc.)\n');

    console.log('STEP 2: Find Azure-related data');
    console.log('-'.repeat(70));
    console.log('Run this query to find where Azure data lives:');
    console.log('```spl');
    console.log(queries.azureData);
    console.log('```');
    console.log('Expected output: Count of events by index and sourcetype\n');

    console.log('STEP 3: Find specific data types');
    console.log('-'.repeat(70));
    console.log('\n📊 For Windows Security Events:');
    console.log('```spl');
    console.log(queries.windowsSecurity);
    console.log('```\n');

    console.log('📊 For Microsoft Defender Events:');
    console.log('```spl');
    console.log(queries.defenderData);
    console.log('```\n');

    console.log('📊 For Azure AD / Entra ID Events:');
    console.log('```spl');
    console.log(queries.entraData);
    console.log('```\n');

    console.log('📊 For Office 365 Events:');
    console.log('```spl');
    console.log(queries.office365Data);
    console.log('```\n');

    console.log('📊 For Event Hub sourced data:');
    console.log('```spl');
    console.log(queries.eventHubData);
    console.log('```\n');

    console.log('STEP 4: Verify data structure');
    console.log('-'.repeat(70));
    console.log('Once you identify a sourcetype, examine sample events:');
    console.log('```spl');
    console.log(queries.sampleEventsBySourcetype('YOUR_SOURCETYPE_HERE'));
    console.log('```\n');

    console.log('STEP 5: Discover available fields');
    console.log('-'.repeat(70));
    console.log('Check what fields are available in the data:');
    console.log('```spl');
    console.log(queries.fieldDiscovery('YOUR_SOURCETYPE_HERE'));
    console.log('```\n');

    console.log('='  .repeat(70));
    console.log('📝 CREATING YOUR CUSTOM MAPPING');
    console.log('='  .repeat(70));
    console.log('\nBased on your discovery results, create a custom mapping:\n');
    console.log('```javascript');
    console.log('const customMapping = {');
    console.log('  // Example: If you found SecurityEvent data in index=windows');
    console.log('  "SecurityEvent": {');
    console.log('    index: "windows",');
    console.log('    sourcetype: "azure:aad:signin",  // From your discovery');
    console.log('    note: "My Azure AD signin logs"');
    console.log('  },');
    console.log('  ');
    console.log('  // Example: Defender data');
    console.log('  "DeviceProcessEvents": {');
    console.log('    index: "mde",  // From your discovery');
    console.log('    sourcetype: "azure:eventhub:defender",  // From your discovery');
    console.log('    note: "Defender for Endpoint via Event Hub"');
    console.log('  },');
    console.log('  ');
    console.log('  // Add more mappings as you discover them...');
    console.log('};');
    console.log('');
    console.log('// Use the custom mapping');
    console.log('const translator = new QueryTranslator(customMapping);');
    console.log('```\n');

    console.log('='  .repeat(70));
    console.log('💡 COMMON AZURE EVENT HUB PATTERNS');
    console.log('='  .repeat(70));
    console.log('\nWhen data comes from Azure Event Hub, you might see:\n');
    console.log('Pattern 1: Single index with multiple sourcetypes');
    console.log('  index=azure sourcetype=azure:aad:signin');
    console.log('  index=azure sourcetype=azure:aad:audit');
    console.log('  index=azure sourcetype=azure:defender:process\n');

    console.log('Pattern 2: Multiple indexes by data type');
    console.log('  index=azuread sourcetype=azure:eventhub:signin');
    console.log('  index=defender sourcetype=azure:eventhub:mde');
    console.log('  index=o365 sourcetype=azure:eventhub:office365\n');

    console.log('Pattern 3: Generic Event Hub sourcetype');
    console.log('  index=azure sourcetype=azure:eventhub');
    console.log('  (data differentiated by fields, not sourcetype)\n');

    console.log('='  .repeat(70));
    console.log('⚠️  IMPORTANT NOTES FOR SPLUNK CLOUD');
    console.log('='  .repeat(70));
    console.log('• You may not have access to inputs.conf or configuration files');
    console.log('• Use the discovery queries above to understand your data');
    console.log('• Contact your Splunk administrator if you need more details');
    console.log('• Event Hub data often has metadata fields like:');
    console.log('  - source (Event Hub name)');
    console.log('  - category (Azure log category)');
    console.log('  - resourceId (Azure resource identifier)');
    console.log('');
  }

  /**
   * Generate a smart mapping query that outputs JavaScript config
   */
  generateConfigGenerator() {
    console.log('='  .repeat(70));
    console.log('🤖 AUTO-GENERATE MAPPING CONFIG');
    console.log('='  .repeat(70));
    console.log('\nRun this query in Splunk to auto-generate mapping configuration:\n');
    console.log('```spl');
    console.log(`index=* (azure OR entra OR microsoft OR defender OR office365 OR SecurityEvent OR DeviceProcessEvents OR SigninLogs)
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
| eval mapping="  \\"" + kql_table + "\\": { index: \\"" + index + "\\", sourcetype: \\"" + sourcetype + "\\", note: \\"Auto-discovered\\" },"
| table mapping
| head 50`);
    console.log('```\n');
    console.log('This will output JavaScript mapping objects you can copy/paste!\n');
  }

  /**
   * Show specific Azure Event Hub scenarios
   */
  showEventHubScenarios() {
    console.log('='  .repeat(70));
    console.log('📘 AZURE EVENT HUB INGESTION SCENARIOS');
    console.log('='  .repeat(70));
    console.log('\nScenario 1: Splunk Add-on for Microsoft Cloud Services');
    console.log('-'.repeat(70));
    console.log('If using the official Splunk Add-on:');
    console.log('  • Data typically goes to: index=mscs (Microsoft Cloud Services)');
    console.log('  • Sourcetypes: mscs:azure:*, mscs:aad:*, mscs:o365:*');
    console.log('  • Discovery query:');
    console.log('    index=mscs | stats count by sourcetype\n');

    console.log('Scenario 2: Azure Monitor Logs Add-on');
    console.log('-'.repeat(70));
    console.log('If using Azure Monitor Logs Add-on:');
    console.log('  • Data typically goes to: index=azure or index=azuremonitor');
    console.log('  • Sourcetypes: azure:monitor:*, azure:activitylog');
    console.log('  • Discovery query:');
    console.log('    index=azure* | stats count by sourcetype\n');

    console.log('Scenario 3: Custom Event Hub Integration');
    console.log('-'.repeat(70));
    console.log('If custom Event Hub setup by your team:');
    console.log('  • Index name: Varies (check with admin)');
    console.log('  • Sourcetypes: Often azure:eventhub or custom names');
    console.log('  • Data structure: May need parsing/field extraction');
    console.log('  • Discovery query:');
    console.log('    index=* sourcetype=*eventhub* | stats count by index, sourcetype\n');

    console.log('Scenario 4: Multiple Event Hub Namespaces');
    console.log('-'.repeat(70));
    console.log('If different Azure services use different Event Hubs:');
    console.log('  • Each namespace might map to different index');
    console.log('  • Check the "source" field to identify Event Hub name');
    console.log('  • Discovery query:');
    console.log('    index=* source=*eventhub* | stats count by index, sourcetype, source\n');
  }
}

// Run the helper
async function main() {
  const discovery = new SplunkDataDiscovery();
  
  discovery.generateMappingWorkflow();
  console.log('\n\n');
  discovery.generateConfigGenerator();
  console.log('\n\n');
  discovery.showEventHubScenarios();
  
  console.log('\n' + '='  .repeat(70));
  console.log('✅ NEXT STEPS');
  console.log('='  .repeat(70));
  console.log('1. Run the discovery queries in your Splunk Cloud environment');
  console.log('2. Note the index/sourcetype combinations for your data');
  console.log('3. Create a custom mapping configuration');
  console.log('4. Pass it to the translator: new QueryTranslator(customMapping)');
  console.log('5. Test translations with your actual data');
  console.log('');
  console.log('💬 Questions? Contact your Splunk Cloud administrator for:');
  console.log('   • How Azure Event Hub was configured');
  console.log('   • Which indexes contain which data types');
  console.log('   • Field extraction and parsing rules');
  console.log('');
}

main();
