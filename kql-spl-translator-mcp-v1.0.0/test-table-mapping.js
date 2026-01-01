#!/usr/bin/env node
/**
 * Test for KQL Table to Splunk Index/Sourcetype Mapping
 * Demonstrates how the translator handles the architectural difference
 * between KQL tables and Splunk indexes
 */

const QueryTranslator = require('./enhanced-translator.js');

async function testTableMapping() {
  console.log('🔍 Testing KQL Table → Splunk Index/Sourcetype Mapping\n');
  console.log('='  .repeat(70));
  console.log('THE PROBLEM:');
  console.log('='  .repeat(70));
  console.log('• KQL uses TABLES (SecurityEvent, DeviceProcessEvents, etc.)');
  console.log('• Splunk uses INDEXES (windows, defender, main, etc.)');
  console.log('• These do NOT map 1:1!');
  console.log('• SecurityEvent data could be in index=windows, security, OR main');
  console.log('• Splunk needs index + sourcetype to identify data correctly\n');

  const translator = new QueryTranslator();
  await translator.loadReferences();

  // Test 1: Known table with good mapping
  console.log('='  .repeat(70));
  console.log('TEST 1: Known KQL Table (SecurityEvent)');
  console.log('='  .repeat(70));
  const query1 = 'SecurityEvent | where EventID == 4624 | summarize count() by Computer';
  console.log('KQL Query:', query1);
  
  const result1 = await translator.translate(query1, 'kql', 'spl');
  console.log('\nTranslated SPL:');
  console.log(result1.translatedQuery);
  console.log('\nTranslation Notes:');
  result1.translationNotes.forEach(note => console.log('  •', note));
  console.log('');

  // Test 2: Unknown table - should warn
  console.log('='  .repeat(70));
  console.log('TEST 2: Unknown KQL Table (CustomAppData)');
  console.log('='  .repeat(70));
  const query2 = 'CustomAppData | where Status == "error" | summarize count()';
  console.log('KQL Query:', query2);
  
  const result2 = await translator.translate(query2, 'kql', 'spl');
  console.log('\nTranslated SPL:');
  console.log(result2.translatedQuery);
  console.log('\nTranslation Notes:');
  result2.translationNotes.forEach(note => console.log('  •', note));
  console.log('');

  // Test 3: Defender table
  console.log('='  .repeat(70));
  console.log('TEST 3: Microsoft Defender Table (DeviceProcessEvents)');
  console.log('='  .repeat(70));
  const query3 = 'DeviceProcessEvents | where FileName == "powershell.exe" | take 10';
  console.log('KQL Query:', query3);
  
  const result3 = await translator.translate(query3, 'kql', 'spl');
  console.log('\nTranslated SPL:');
  console.log(result3.translatedQuery);
  console.log('\nTranslation Notes:');
  result3.translationNotes.forEach(note => console.log('  •', note));
  console.log('');

  // Test 4: Custom mapping
  console.log('='  .repeat(70));
  console.log('TEST 4: Custom Table Mapping (User-Defined)');
  console.log('='  .repeat(70));
  console.log('Setting custom mapping for MyCustomTable...');
  
  translator.setTableMapping({
    'MyCustomTable': {
      index: 'my_app_index',
      sourcetype: 'custom:app:logs',
      note: 'Custom application logs'
    }
  });
  
  const query4 = 'MyCustomTable | where Level == "ERROR" | stats count() by Source';
  console.log('KQL Query:', query4);
  
  const result4 = await translator.translate(query4, 'kql', 'spl');
  console.log('\nTranslated SPL:');
  console.log(result4.translatedQuery);
  console.log('\nTranslation Notes:');
  result4.translationNotes.forEach(note => console.log('  •', note));
  console.log('');

  // Show available mappings
  console.log('='  .repeat(70));
  console.log('AVAILABLE TABLE MAPPINGS (Sample)');
  console.log('='  .repeat(70));
  const mappings = translator.getTableMapping();
  const sampleTables = ['SecurityEvent', 'DeviceProcessEvents', 'SigninLogs', 'EmailEvents', 'Resources'];
  
  sampleTables.forEach(table => {
    const mapping = mappings[table];
    console.log(`\n${table}:`);
    console.log(`  Index: ${mapping.index}`);
    console.log(`  Sourcetype: ${mapping.sourcetype || '(not specified)'}`);
    console.log(`  Note: ${mapping.note}`);
  });

  // Summary
  console.log('\n' + '='  .repeat(70));
  console.log('SOLUTION SUMMARY');
  console.log('='  .repeat(70));
  console.log('✅ Translator now includes index + sourcetype mapping');
  console.log('✅ Default mappings for 30+ common KQL tables');
  console.log('✅ Warns when table mapping is unknown');
  console.log('✅ Users can customize mappings for their environment');
  console.log('✅ Translation notes show exactly what was mapped');
  console.log('\n💡 RECOMMENDATION FOR USERS:');
  console.log('   1. Review the translated index/sourcetype');
  console.log('   2. Verify data exists in that Splunk index');
  console.log('   3. Customize mappings if your environment differs');
  console.log('   4. Use translator.setTableMapping() for custom tables');
  console.log('\n📚 Example: Custom Mapping in Your Code');
  console.log('   ```javascript');
  console.log('   const translator = new QueryTranslator({');
  console.log('     "SecurityEvent": {');
  console.log('       index: "my_windows_index",');
  console.log('       sourcetype: "WinEventLog:Security",');
  console.log('       note: "My custom Windows logs"');
  console.log('     }');
  console.log('   });');
  console.log('   ```');
  console.log('');
}

testTableMapping();
