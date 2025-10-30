#!/usr/bin/env node

/**
 * Security Audit Script
 * 
 * Analyzes npm dependencies for security vulnerabilities
 * and provides a detailed report with recommendations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runNpmAudit() {
  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    if (error.stdout) {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

function analyzeDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  return {
    production: Object.keys(packageJson.dependencies || {}).length,
    development: Object.keys(packageJson.devDependencies || {}).length,
    total: Object.keys(packageJson.dependencies || {}).length + 
           Object.keys(packageJson.devDependencies || {}).length
  };
}

function categorizeSeverity(auditData) {
  const metadata = auditData.metadata || {};
  const vulnerabilities = metadata.vulnerabilities || {};
  
  return {
    info: vulnerabilities.info || 0,
    low: vulnerabilities.low || 0,
    moderate: vulnerabilities.moderate || 0,
    high: vulnerabilities.high || 0,
    critical: vulnerabilities.critical || 0,
    total: vulnerabilities.total || 0
  };
}

function getTopVulnerabilities(auditData, limit = 10) {
  const vulnerabilities = [];
  
  if (auditData.vulnerabilities) {
    for (const [name, vuln] of Object.entries(auditData.vulnerabilities)) {
      if (vuln.via && Array.isArray(vuln.via)) {
        vuln.via.forEach(v => {
          if (typeof v === 'object' && v.title) {
            vulnerabilities.push({
              package: name,
              severity: vuln.severity,
              title: v.title,
              url: v.url,
              range: vuln.range
            });
          }
        });
      }
    }
  }
  
  // Sort by severity
  const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
  vulnerabilities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return vulnerabilities.slice(0, limit);
}

function generateRecommendations(severities, deps) {
  const recommendations = [];
  
  if (severities.critical > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Immediate action required',
      description: `${severities.critical} critical vulnerabilities found. Run 'npm audit fix' immediately.`
    });
  }
  
  if (severities.high > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Address high-severity vulnerabilities',
      description: `${severities.high} high-severity vulnerabilities found. Consider running 'npm audit fix'.`
    });
  }
  
  if (severities.moderate > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Review moderate vulnerabilities',
      description: `${severities.moderate} moderate vulnerabilities found. Review and fix when possible.`
    });
  }
  
  if (severities.total > 0) {
    recommendations.push({
      priority: 'INFO',
      action: 'Update dependencies',
      description: 'Consider updating to the latest stable versions of dependencies.'
    });
    
    recommendations.push({
      priority: 'INFO',
      action: 'Regular audits',
      description: 'Set up automated security audits in CI/CD pipeline.'
    });
  }
  
  return recommendations;
}

async function main() {
  console.log('='.repeat(80));
  console.log('SECURITY AUDIT REPORT');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Analyze dependencies
    console.log('1. DEPENDENCY ANALYSIS');
    console.log('-'.repeat(80));
    const deps = analyzeDependencies();
    console.log(`   Production Dependencies: ${deps.production}`);
    console.log(`   Development Dependencies: ${deps.development}`);
    console.log(`   Total Dependencies: ${deps.total}`);
    console.log('');

    // Run npm audit
    console.log('2. VULNERABILITY SCAN');
    console.log('-'.repeat(80));
    console.log('   Running npm audit...');
    const auditData = runNpmAudit();
    const severities = categorizeSeverity(auditData);
    
    console.log('');
    console.log('   Vulnerability Summary:');
    console.log(`   - Critical: ${severities.critical}`);
    console.log(`   - High:     ${severities.high}`);
    console.log(`   - Moderate: ${severities.moderate}`);
    console.log(`   - Low:      ${severities.low}`);
    console.log(`   - Info:     ${severities.info}`);
    console.log(`   - Total:    ${severities.total}`);
    console.log('');

    // Top vulnerabilities
    if (severities.total > 0) {
      console.log('3. TOP VULNERABILITIES');
      console.log('-'.repeat(80));
      const topVulns = getTopVulnerabilities(auditData, 10);
      
      if (topVulns.length > 0) {
        topVulns.forEach((v, i) => {
          console.log(`   ${i + 1}. [${v.severity.toUpperCase()}] ${v.package}`);
          console.log(`      ${v.title}`);
          if (v.url) {
            console.log(`      More info: ${v.url}`);
          }
          console.log('');
        });
      } else {
        console.log('   No detailed vulnerability information available.');
        console.log('');
      }
    }

    // Recommendations
    console.log('4. RECOMMENDATIONS');
    console.log('-'.repeat(80));
    const recommendations = generateRecommendations(severities, deps);
    
    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`      ${rec.description}`);
        console.log('');
      });
    } else {
      console.log('   ✓ No vulnerabilities found! Your dependencies are secure.');
      console.log('');
    }

    // Commands to fix
    if (severities.total > 0) {
      console.log('5. SUGGESTED ACTIONS');
      console.log('-'.repeat(80));
      console.log('   To fix vulnerabilities automatically:');
      console.log('   $ npm audit fix');
      console.log('');
      console.log('   To fix including breaking changes:');
      console.log('   $ npm audit fix --force');
      console.log('');
      console.log('   To view detailed audit report:');
      console.log('   $ npm audit');
      console.log('');
    }

    // Summary
    console.log('6. SECURITY SCORE');
    console.log('-'.repeat(80));
    let score = 100;
    score -= severities.critical * 20;
    score -= severities.high * 10;
    score -= severities.moderate * 5;
    score -= severities.low * 2;
    score = Math.max(0, score);
    
    let rating = 'Excellent';
    if (score < 40) rating = 'Poor';
    else if (score < 60) rating = 'Fair';
    else if (score < 80) rating = 'Good';
    
    console.log(`   Score: ${score}/100 (${rating})`);
    console.log(`   Status: ${severities.critical === 0 && severities.high === 0 ? '✓ Acceptable' : '✗ Action Required'}`);
    console.log('');

    console.log('='.repeat(80));

    // Exit with error code if critical or high vulnerabilities exist
    process.exit(severities.critical > 0 || severities.high > 0 ? 1 : 0);

  } catch (error) {
    console.error('✗ ERROR: Failed to run security audit');
    console.error(`   Message: ${error.message}`);
    console.error('');
    console.log('='.repeat(80));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runNpmAudit, analyzeDependencies, categorizeSeverity };
