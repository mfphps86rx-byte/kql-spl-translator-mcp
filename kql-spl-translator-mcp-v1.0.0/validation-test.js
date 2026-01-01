#!/usr/bin/env node
/**
 * Validation Test Suite - Checks correctness of translations
 * Tests if the translated queries are semantically correct
 */

import { QueryTranslator } from './enhanced-translator.js';

class ValidationTest {
  constructor() {
    this.translator = new QueryTranslator();
    this.issues = [];
  }

  async init() {
    console.log('🔍 Starting Validation Test Suite\n');
    await this.translator.loadReferences();
    console.log('✅ References loaded\n');
  }

  logIssue(test, severity, message) {
    this.issues.push({ test, severity, message });
    const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} ${severity.toUpperCase()}: ${message}`);
  }

  async validateTranslation(testName, query, from, to, expectedElements) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 ${testName}`);
    console.log('='.repeat(70));
    console.log(`Input (${from.toUpperCase()}):`, query);
    
    const result = await this.translator.translate(query, from, to);
    console.log(`Output (${to.toUpperCase()}):`, result.translatedQuery);
    console.log(`Confidence: ${result.confidence}%`);
    
    // Check for expected elements in output
    for (const element of expectedElements) {
      if (!result.translatedQuery.includes(element)) {
        this.logIssue(testName, 'error', `Missing expected element: "${element}"`);
      } else {
        console.log(`✅ Contains: "${element}"`);
      }
    }
    
    // Check validation
    if (result.validation.output.errors.length > 0) {
      this.logIssue(testName, 'error', `Output has validation errors: ${result.validation.output.errors.join(', ')}`);
    }
    
    if (result.confidence < 70) {
      this.logIssue(testName, 'warning', `Low confidence: ${result.confidence}%`);
    }
    
    return result;
  }

  async runAllTests() {
    await this.init();

    // Test 1: Basic stats command
    await this.validateTranslation(
      'Test 1: SPL stats → KQL summarize',
      'index=main | stats count by host',
      'spl', 'kql',
      ['summarize', 'count', 'host']
    );

    // Test 2: Basic where clause
    await this.validateTranslation(
      'Test 2: SPL where → KQL where',
      'index=main | where status=500',
      'spl', 'kql',
      ['where', 'status']
    );

    // Test 3: Eval to extend
    await this.validateTranslation(
      'Test 3: SPL eval → KQL extend',
      'index=main | eval response_ms=response_time*1000',
      'spl', 'kql',
      ['extend', 'response_ms', 'response_time*1000']
    );

    // Test 4: Sort descending
    await this.validateTranslation(
      'Test 4: SPL sort → KQL order by',
      'index=main | sort -count',
      'spl', 'kql',
      ['order by', 'count', 'desc']
    );

    // Test 5: Head to take
    await this.validateTranslation(
      'Test 5: SPL head → KQL take',
      'index=main | head 100',
      'spl', 'kql',
      ['take', '100']
    );

    // Test 6: Fields projection
    await this.validateTranslation(
      'Test 6: SPL fields → KQL project',
      'index=main | fields host, status, response_time',
      'spl', 'kql',
      ['project', 'host', 'status', 'response_time']
    );

    // Test 7: Rename fields
    await this.validateTranslation(
      'Test 7: SPL rename → KQL project-rename',
      'index=main | rename old_name as new_name',
      'spl', 'kql',
      ['project-rename', 'new_name', 'old_name']
    );

    // Test 8: Dedup to distinct
    await this.validateTranslation(
      'Test 8: SPL dedup → KQL distinct',
      'index=main | dedup host',
      'spl', 'kql',
      ['distinct', 'host']
    );

    // Test 9: KQL to SPL - summarize
    await this.validateTranslation(
      'Test 9: KQL summarize → SPL stats',
      'SecurityEvent | summarize count() by Computer',
      'kql', 'spl',
      ['stats', 'count()', 'Computer']
    );

    // Test 10: KQL to SPL - where
    await this.validateTranslation(
      'Test 10: KQL where → SPL filter',
      'SecurityEvent | where EventID == 4624',
      'kql', 'spl',
      ['EventID', '4624']
    );

    // Test 11: KQL to SPL - extend
    await this.validateTranslation(
      'Test 11: KQL extend → SPL eval',
      'Table | extend NewField = OldField * 2',
      'kql', 'spl',
      ['eval', 'NewField']
    );

    // Test 12: KQL to SPL - project
    await this.validateTranslation(
      'Test 12: KQL project → SPL fields',
      'Table | project Computer, EventID, TimeGenerated',
      'kql', 'spl',
      ['fields', 'Computer', 'EventID', 'TimeGenerated']
    );

    // Test 13: KQL to SPL - order by
    await this.validateTranslation(
      'Test 13: KQL order by desc → SPL sort -',
      'Table | order by Count desc',
      'kql', 'spl',
      ['sort', '-Count']
    );

    // Test 14: KQL to SPL - take
    await this.validateTranslation(
      'Test 14: KQL take → SPL head',
      'Table | take 50',
      'kql', 'spl',
      ['head', '50']
    );

    // Test 15: Complex chain SPL
    await this.validateTranslation(
      'Test 15: Complex SPL chain',
      'index=app | stats avg(response_time) as avg_time by host | where avg_time > 1000 | sort -avg_time | head 10',
      'spl', 'kql',
      ['summarize', 'avg(response_time)', 'where', 'order by', 'take', '10']
    );

    // Test 16: Complex chain KQL
    await this.validateTranslation(
      'Test 16: Complex KQL chain',
      'SecurityEvent | where TimeGenerated > ago(1d) | summarize count() by Computer | order by count_ desc | take 20',
      'kql', 'spl',
      ['TimeGenerated', 'ago', 'stats', 'count()', 'sort', 'head']
    );

    // Test 17: Timechart translation
    await this.validateTranslation(
      'Test 17: SPL timechart → KQL bin',
      'index=main | timechart span=1h avg(cpu_usage) by host',
      'spl', 'kql',
      ['summarize', 'bin', 'TimeGenerated', '1h']
    );

    // Test 18: Mvexpand translation
    await this.validateTranslation(
      'Test 18: SPL mvexpand → KQL mv-expand',
      'index=main | mvexpand tags',
      'spl', 'kql',
      ['mv-expand', 'tags']
    );

    // Test 19: Multiple aggregations
    await this.validateTranslation(
      'Test 19: Multiple aggregations',
      'index=main | stats count, avg(response_time), max(response_time) by host',
      'spl', 'kql',
      ['summarize', 'count', 'avg(response_time)', 'max(response_time)', 'host']
    );

    // Test 20: Search with earliest
    await this.validateTranslation(
      'Test 20: Time range with earliest',
      'index=main earliest=-7d | stats count',
      'spl', 'kql',
      ['ago', '7d', 'summarize']
    );

    // Generate report
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION TEST REPORT');
    console.log('='.repeat(70));
    
    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const infos = this.issues.filter(i => i.severity === 'info');
    
    console.log(`\n❌ Errors: ${errors.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`ℹ️  Info: ${infos.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND:');
      errors.forEach(issue => {
        console.log(`  • [${issue.test}] ${issue.message}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(issue => {
        console.log(`  • [${issue.test}] ${issue.message}`);
      });
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n🎉 ALL VALIDATIONS PASSED - Translations are semantically correct!');
      process.exit(0);
    } else if (errors.length === 0) {
      console.log('\n✅ No critical errors - Minor warnings found');
      process.exit(0);
    } else {
      console.log('\n❌ VALIDATION FAILED - Critical issues found');
      process.exit(1);
    }
  }
}

// Run validation tests
const tester = new ValidationTest();
tester.runAllTests();
