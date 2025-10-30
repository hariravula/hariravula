#!/usr/bin/env node

/**
 * Site Status Checker for hari.io
 * 
 * This script checks the status, performance, and security of hari.io
 * It performs the following checks:
 * - Site availability and response time
 * - HTTP status code
 * - Security headers
 * - SSL/TLS certificate validity
 * - Response time metrics
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const SITE_URL = 'https://hari.io';
const TIMEOUT = 10000; // 10 seconds

// Security headers to check
const SECURITY_HEADERS = {
  'strict-transport-security': 'HSTS',
  'content-security-policy': 'CSP',
  'x-frame-options': 'X-Frame-Options',
  'x-content-type-options': 'X-Content-Type-Options',
  'x-xss-protection': 'X-XSS-Protection',
  'referrer-policy': 'Referrer-Policy',
  'permissions-policy': 'Permissions-Policy',
};

function checkSite(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Site-Status-Checker/1.0'
      }
    };

    const req = protocol.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = {
          url: url,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          responseTime: responseTime,
          headers: res.headers,
          contentLength: data.length,
          certificate: res.socket?.getPeerCertificate?.(),
        };
        resolve(result);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TIMEOUT}ms`));
    });

    req.end();
  });
}

function analyzeSecurity(headers) {
  const findings = {
    present: [],
    missing: [],
    warnings: []
  };

  // Check for security headers
  for (const [header, name] of Object.entries(SECURITY_HEADERS)) {
    if (headers[header]) {
      findings.present.push({
        name: name,
        header: header,
        value: headers[header]
      });
    } else {
      findings.missing.push({
        name: name,
        header: header,
        recommendation: `Add ${name} header for improved security`
      });
    }
  }

  // Check for server header exposure
  if (headers['server']) {
    findings.warnings.push({
      issue: 'Server header exposed',
      value: headers['server'],
      recommendation: 'Consider hiding or obfuscating server information'
    });
  }

  // Check for X-Powered-By header
  if (headers['x-powered-by']) {
    findings.warnings.push({
      issue: 'X-Powered-By header exposed',
      value: headers['x-powered-by'],
      recommendation: 'Remove X-Powered-By header to avoid exposing technology stack'
    });
  }

  return findings;
}

function analyzePerformance(result) {
  const metrics = {
    responseTime: result.responseTime,
    contentLength: result.contentLength,
    rating: 'Unknown'
  };

  // Rate response time
  if (result.responseTime < 200) {
    metrics.rating = 'Excellent';
  } else if (result.responseTime < 500) {
    metrics.rating = 'Good';
  } else if (result.responseTime < 1000) {
    metrics.rating = 'Fair';
  } else {
    metrics.rating = 'Poor';
  }

  return metrics;
}

function analyzeCertificate(certificate) {
  if (!certificate || Object.keys(certificate).length === 0) {
    return { valid: false, message: 'No certificate information available' };
  }

  const now = new Date();
  const validFrom = new Date(certificate.valid_from);
  const validTo = new Date(certificate.valid_to);

  const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

  return {
    valid: now >= validFrom && now <= validTo,
    subject: certificate.subject,
    issuer: certificate.issuer,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
    daysUntilExpiry: daysUntilExpiry,
    warning: daysUntilExpiry < 30 ? 'Certificate expires soon!' : null
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('SITE STATUS CHECK FOR: ' + SITE_URL);
  console.log('='.repeat(80));
  console.log('');

  try {
    console.log('Checking site status...\n');
    const result = await checkSite(SITE_URL);

    // Basic Status
    console.log('1. AVAILABILITY & STATUS');
    console.log('-'.repeat(80));
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.statusCode} ${result.statusMessage}`);
    console.log(`   Status: ${result.statusCode >= 200 && result.statusCode < 300 ? '✓ ONLINE' : '✗ ISSUE DETECTED'}`);
    console.log('');

    // Performance
    console.log('2. PERFORMANCE METRICS');
    console.log('-'.repeat(80));
    const performance = analyzePerformance(result);
    console.log(`   Response Time: ${performance.responseTime}ms (${performance.rating})`);
    console.log(`   Content Length: ${performance.contentLength} bytes`);
    console.log('');

    // Security Headers
    console.log('3. SECURITY ANALYSIS');
    console.log('-'.repeat(80));
    const security = analyzeSecurity(result.headers);
    
    if (security.present.length > 0) {
      console.log('   ✓ Security Headers Present:');
      security.present.forEach(h => {
        console.log(`     - ${h.name}: ${h.value.substring(0, 60)}${h.value.length > 60 ? '...' : ''}`);
      });
    }
    console.log('');

    if (security.missing.length > 0) {
      console.log('   ✗ Missing Security Headers:');
      security.missing.forEach(h => {
        console.log(`     - ${h.name} (${h.header})`);
        console.log(`       → ${h.recommendation}`);
      });
    }
    console.log('');

    if (security.warnings.length > 0) {
      console.log('   ⚠ Security Warnings:');
      security.warnings.forEach(w => {
        console.log(`     - ${w.issue}: ${w.value}`);
        console.log(`       → ${w.recommendation}`);
      });
    }
    console.log('');

    // SSL Certificate
    console.log('4. SSL/TLS CERTIFICATE');
    console.log('-'.repeat(80));
    const certInfo = analyzeCertificate(result.certificate);
    if (certInfo.valid) {
      console.log(`   ✓ Certificate Valid`);
      console.log(`   Valid From: ${certInfo.validFrom}`);
      console.log(`   Valid To: ${certInfo.validTo}`);
      console.log(`   Days Until Expiry: ${certInfo.daysUntilExpiry}`);
      if (certInfo.warning) {
        console.log(`   ⚠ ${certInfo.warning}`);
      }
    } else {
      console.log(`   ✗ ${certInfo.message}`);
    }
    console.log('');

    // Summary
    console.log('5. SUMMARY');
    console.log('-'.repeat(80));
    const isHealthy = result.statusCode >= 200 && result.statusCode < 300 && 
                      performance.responseTime < 2000;
    console.log(`   Overall Health: ${isHealthy ? '✓ HEALTHY' : '⚠ NEEDS ATTENTION'}`);
    console.log(`   Security Headers: ${security.missing.length} missing`);
    console.log(`   Performance: ${performance.rating}`);
    console.log('');

    console.log('='.repeat(80));

    process.exit(isHealthy && security.missing.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('✗ ERROR: Unable to check site status');
    console.error(`   Message: ${error.message}`);
    console.error('');
    console.error('   Possible reasons:');
    console.error('   - Site is down or unreachable');
    console.error('   - Network connectivity issues');
    console.error('   - DNS resolution failed');
    console.error('   - Firewall or security restrictions');
    console.error('');
    console.log('='.repeat(80));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkSite, analyzeSecurity, analyzePerformance, analyzeCertificate };
