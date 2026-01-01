#!/usr/bin/env node
/**
 * Stress Test Suite for Query Translator MCP Server
 * Attempts to break the translator with edge cases and extreme scenarios
 */

const QueryTranslator = require('./enhanced-translator.js');

class StressTest {
  constructor() {
    this.translator = new QueryTranslator();
    this.passed = 0;
    this.failed = 0;
    this.crashed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🧪 ${name}`);
      console.log('='.repeat(70));
      await testFn();
      this.passed++;
      console.log('✅ Test passed (no crash)');
    } catch (error) {
      this.crashed++;
      console.log('💥 CRASH:', error.message);
      console.log('Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
    }
  }

  async init() {
    console.log('🚀 Starting Stress Test Suite\n');
    await this.translator.loadReferences();
    console.log('✅ References loaded\n');
  }

  async runAllTests() {
    await this.init();

    // ============ EDGE CASES ============
    await this.runTest('Test 1: Empty Query', async () => {
      const result = await this.translator.translate('', 'spl', 'kql');
      console.log('Input: (empty string)');
      console.log('Output:', result.translatedQuery);
      console.log('Confidence:', result.confidence);
    });

    await this.runTest('Test 2: Whitespace Only Query', async () => {
      const result = await this.translator.translate('   \n\t  ', 'spl', 'kql');
      console.log('Input: (whitespace only)');
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 3: Single Pipe Character', async () => {
      const result = await this.translator.translate('|', 'spl', 'kql');
      console.log('Input: |');
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 4: Multiple Consecutive Pipes', async () => {
      const result = await this.translator.translate('index=main ||| stats count', 'spl', 'kql');
      console.log('Input: index=main ||| stats count');
      console.log('Output:', result.translatedQuery);
    });

    // ============ SPECIAL CHARACTERS ============
    await this.runTest('Test 5: SQL Injection-like Input', async () => {
      const query = 'index=main "Robert\'); DROP TABLE Users;--" | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 6: Unicode and Emojis', async () => {
      const query = 'index=main 你好世界 🚀💥 | stats count by 用户';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 7: Special Regex Characters', async () => {
      const query = 'index=main source=".*[a-z]+.*\\d{3,5}(test|prod)$" | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 8: Nested Quotes and Escapes', async () => {
      const query = 'index=main "field=\\"value\\"" field2=\'single\\\'quote\' | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    // ============ VERY LONG QUERIES ============
    await this.runTest('Test 9: Extremely Long Query', async () => {
      const longField = 'field_' + 'a'.repeat(1000);
      const query = `index=main ${longField}="value" | stats count`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input length:', query.length, 'characters');
      console.log('Output length:', result.translatedQuery.length, 'characters');
    });

    await this.runTest('Test 10: Many Chained Commands', async () => {
      const commands = Array(50).fill('stats count').join(' | ');
      const query = `index=main error | ${commands}`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: 50 chained stats commands');
      console.log('Output lines:', result.translatedQuery.split('\n').length);
    });

    // ============ COMPLEX NESTED QUERIES ============
    await this.runTest('Test 11: Complex SPL with Multiple Conditions', async () => {
      const query = `index=main sourcetype=access_combined (status=404 OR status=500) earliest=-7d@d latest=now 
        | eval response_time_ms=response_time*1000 
        | where response_time_ms > 1000 
        | stats avg(response_time_ms) as avg_time, count as total_errors by host, status 
        | where total_errors > 100 
        | sort -avg_time 
        | head 10`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: Complex multi-line SPL query');
      console.log('Output:\n', result.translatedQuery);
      console.log('Confidence:', result.confidence);
      console.log('Warnings:', result.validation.output.warnings.length);
    });

    await this.runTest('Test 12: Complex KQL with Multiple Operators', async () => {
      const query = `SecurityEvent
        | where TimeGenerated >= ago(7d)
        | where EventID in (4624, 4625, 4634)
        | extend AccountType = case(
            Account contains "admin", "Administrator",
            Account contains "svc", "Service",
            "Regular"
          )
        | summarize LoginCount=count(), UniqueIPs=dcount(IpAddress) by Account, AccountType, bin(TimeGenerated, 1h)
        | where LoginCount > 100
        | order by LoginCount desc
        | take 20`;
      const result = await this.translator.translate(query, 'kql', 'spl');
      console.log('Input: Complex multi-line KQL query');
      console.log('Output:\n', result.translatedQuery);
      console.log('Confidence:', result.confidence);
    });

    // ============ UNSUPPORTED/UNKNOWN COMMANDS ============
    await this.runTest('Test 13: Completely Invalid Command', async () => {
      const query = 'index=main | foobar123xyz abc=def ghi="jkl" | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
      console.log('Validation warnings:', result.validation.input.warnings.length);
    });

    await this.runTest('Test 14: Mixed Valid and Invalid Commands', async () => {
      const query = 'index=main | stats count | invalidcmd | eval x=1 | anotherbadcmd | head 10';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
      console.log('Translation notes:', result.translationNotes.length);
    });

    // ============ MALFORMED SYNTAX ============
    await this.runTest('Test 15: Missing Required Arguments', async () => {
      const query = 'index=main | stats | eval | where | sort';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 16: Unbalanced Quotes', async () => {
      const query = 'index=main "unclosed quote | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 17: Unbalanced Parentheses', async () => {
      const query = 'index=main | stats avg(response_time by host | head 10';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    // ============ NULL/UNDEFINED HANDLING ============
    await this.runTest('Test 18: Null Query', async () => {
      try {
        const result = await this.translator.translate(null, 'spl', 'kql');
        console.log('Output:', result.translatedQuery);
      } catch (error) {
        console.log('Expected error caught:', error.message);
      }
    });

    await this.runTest('Test 19: Undefined Query', async () => {
      try {
        const result = await this.translator.translate(undefined, 'spl', 'kql');
        console.log('Output:', result.translatedQuery);
      } catch (error) {
        console.log('Expected error caught:', error.message);
      }
    });

    await this.runTest('Test 20: Invalid Language Codes', async () => {
      try {
        const result = await this.translator.translate('test query', 'foo', 'bar');
        console.log('Output:', result.translatedQuery);
      } catch (error) {
        console.log('Expected error caught:', error.message);
      }
    });

    // ============ EXPLAIN QUERY EDGE CASES ============
    await this.runTest('Test 21: Explain Empty Query', async () => {
      const result = await this.translator.explainQuery('', 'spl');
      console.log('Explanation:', result);
    });

    await this.runTest('Test 22: Explain Invalid Language', async () => {
      try {
        const result = await this.translator.explainQuery('test query', 'invalid');
        console.log('Explanation:', result);
      } catch (error) {
        console.log('Expected error caught:', error.message);
      }
    });

    // ============ MEMORY/PERFORMANCE TESTS ============
    await this.runTest('Test 23: Rapid Sequential Translations', async () => {
      const start = Date.now();
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(this.translator.translate('index=main | stats count', 'spl', 'kql'));
      }
      await Promise.all(promises);
      const elapsed = Date.now() - start;
      console.log(`Completed 100 translations in ${elapsed}ms`);
      console.log(`Average: ${(elapsed/100).toFixed(2)}ms per translation`);
    });

    await this.runTest('Test 24: Concurrent Mixed Translations', async () => {
      const start = Date.now();
      const promises = [
        ...Array(25).fill().map(() => this.translator.translate('index=main | stats count', 'spl', 'kql')),
        ...Array(25).fill().map(() => this.translator.translate('Table | summarize count()', 'kql', 'spl')),
        ...Array(25).fill().map(() => this.translator.explainQuery('index=main | stats count', 'spl')),
        ...Array(25).fill().map(() => this.translator.explainQuery('Table | where x == 1', 'kql'))
      ];
      await Promise.all(promises);
      const elapsed = Date.now() - start;
      console.log(`Completed 100 mixed operations in ${elapsed}ms`);
      console.log(`Average: ${(elapsed/100).toFixed(2)}ms per operation`);
    });

    // ============ BOUNDARY CONDITIONS ============
    await this.runTest('Test 25: Query with Only Spaces Between Pipes', async () => {
      const query = 'index=main |     |     | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input:', query);
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 26: Query with Newlines and Tabs', async () => {
      const query = `index=main
\t\t| where field=value
\t\t| stats count
\t\t\tby host`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: (multiline with tabs)');
      console.log('Output:', result.translatedQuery);
    });

    await this.runTest('Test 27: Query with Control Characters', async () => {
      const query = 'index=main\x00\x01\x02 | stats count';
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: (with control chars)');
      console.log('Output:', result.translatedQuery);
    });

    // ============ REAL-WORLD COMPLEX SCENARIOS ============
    await this.runTest('Test 28: Real-World Security Query', async () => {
      const query = `index=security sourcetype=windows:security EventCode=4624 LogonType=3 
        | rex field=_raw "Account Name:\\s+(?<user>\\S+)" 
        | rex field=_raw "Source Network Address:\\s+(?<src_ip>\\d+\\.\\d+\\.\\d+\\.\\d+)" 
        | stats count values(src_ip) as source_ips dc(src_ip) as unique_ips by user 
        | where unique_ips > 10 
        | sort -count`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: Security monitoring query with regex');
      console.log('Output:\n', result.translatedQuery);
      console.log('Confidence:', result.confidence);
    });

    await this.runTest('Test 29: Real-World Performance Query', async () => {
      const query = `index=app_logs sourcetype=json 
        | spath path=response.time output=response_time 
        | spath path=request.endpoint output=endpoint 
        | eval response_time_sec=response_time/1000 
        | timechart span=5m avg(response_time_sec) as avg_response p95(response_time_sec) as p95_response by endpoint 
        | where avg_response > 2`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: Performance monitoring with JSON parsing');
      console.log('Output:\n', result.translatedQuery);
      console.log('Confidence:', result.confidence);
    });

    await this.runTest('Test 30: Stress Test with Everything', async () => {
      const query = `index="test_🚀" sourcetype="app-*" (status>=400 OR error="*" OR 💥) earliest=-30d@d
        | rex field=_raw "user=\\"(?<user>[^\\"]*)\\""
        | spath path=data.metrics{}.value output=metric_value
        | eval metric_value_normalized=if(isnull(metric_value), 0, metric_value)
        | eval category=case(
            metric_value_normalized < 10, "low",
            metric_value_normalized < 100, "medium",
            1=1, "high"
          )
        | stats avg(metric_value_normalized) as avg_val, 
                max(metric_value_normalized) as max_val,
                min(metric_value_normalized) as min_val,
                count as total_events,
                dc(user) as unique_users,
                values(category) as categories
          by _time, host, sourcetype
        | where total_events > 1000 AND unique_users > 50
        | eval score=(avg_val * unique_users) / total_events
        | sort -score
        | head 100
        | rename host as "Server Name", score as "Risk Score"`;
      const result = await this.translator.translate(query, 'spl', 'kql');
      console.log('Input: Kitchen sink query with emojis, regex, JSON, conditionals, and aggregations');
      console.log('Output length:', result.translatedQuery.length, 'characters');
      console.log('Output lines:', result.translatedQuery.split('\n').length);
      console.log('Confidence:', result.confidence);
      console.log('Translation notes:', result.translationNotes.length);
      console.log('Validation errors:', result.validation.output.errors.length);
      console.log('Validation warnings:', result.validation.output.warnings.length);
    });

    // ============ FINAL REPORT ============
    console.log('\n' + '='.repeat(70));
    console.log('🏁 STRESS TEST COMPLETE');
    console.log('='.repeat(70));
    console.log(`✅ Tests Passed (No Crash): ${this.passed}`);
    console.log(`💥 Tests Crashed: ${this.crashed}`);
    console.log(`📊 Total Tests: ${this.passed + this.crashed}`);
    console.log(`🎯 Success Rate: ${((this.passed / (this.passed + this.crashed)) * 100).toFixed(1)}%`);
    
    if (this.crashed > 0) {
      console.log('\n⚠️  SOME TESTS CAUSED CRASHES - Review logs above');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL TESTS PASSED - No crashes detected!');
      process.exit(0);
    }
  }
}

// Run stress tests
const tester = new StressTest();
tester.runAllTests();
