# Site Monitoring Scripts

This directory contains scripts for monitoring the health, security, and performance of hari.io.

## Available Scripts

### 1. `check-site-status.js`

Checks the overall health and status of the hari.io website.

**Features:**
- Site availability check
- HTTP status code verification
- Response time measurement
- Security headers analysis
- SSL/TLS certificate validation
- Overall health score

**Usage:**
```bash
node scripts/check-site-status.js
# or
npm run check-status
```

**Output Example:**
```
================================================================================
SITE STATUS CHECK FOR: https://hari.io
================================================================================

1. AVAILABILITY & STATUS
   URL: https://hari.io
   Status: 200 OK
   Status: ✓ ONLINE

2. PERFORMANCE METRICS
   Response Time: 245ms (Excellent)
   Content Length: 15234 bytes

3. SECURITY ANALYSIS
   ✓ Security Headers Present:
     - HSTS: max-age=31536000; includeSubDomains; preload
     - CSP: default-src 'self'...
   
   ✗ Missing Security Headers:
     - None

4. SSL/TLS CERTIFICATE
   ✓ Certificate Valid
   Valid To: 2025-12-31T23:59:59.000Z
   Days Until Expiry: 245

5. SUMMARY
   Overall Health: ✓ HEALTHY
   Security Headers: 0 missing
   Performance: Excellent
```

### 2. `security-audit.js`

Analyzes npm dependencies for security vulnerabilities.

**Features:**
- Dependency count analysis
- Vulnerability scanning by severity
- Top vulnerabilities listing
- Actionable recommendations
- Security score calculation

**Usage:**
```bash
node scripts/security-audit.js
# or
npm run security-audit
```

**Output Example:**
```
================================================================================
SECURITY AUDIT REPORT
================================================================================

1. DEPENDENCY ANALYSIS
   Production Dependencies: 23
   Development Dependencies: 1
   Total Dependencies: 24

2. VULNERABILITY SCAN
   Vulnerability Summary:
   - Critical: 15
   - High:     46
   - Moderate: 26
   - Low:      6
   - Total:    93

3. TOP VULNERABILITIES
   1. [CRITICAL] @babel/traverse
      Babel vulnerable to arbitrary code execution
      More info: https://github.com/advisories/GHSA-...

4. RECOMMENDATIONS
   1. [CRITICAL] Immediate action required
      15 critical vulnerabilities found. Run 'npm audit fix' immediately.

5. SUGGESTED ACTIONS
   To fix vulnerabilities automatically:
   $ npm audit fix

6. SECURITY SCORE
   Score: 20/100 (Poor)
   Status: ✗ Action Required
```

## Running All Checks

To run both security audit and site status check:

```bash
npm run health-check
```

## Automated Monitoring

These scripts are also run automatically via GitHub Actions:

- **On every push to main branch**
- **On every pull request**
- **Weekly on Sundays at midnight UTC**
- **Can be triggered manually**

See `.github/workflows/security-check.yml` for the workflow configuration.

## Integration with CI/CD

### Netlify

The site uses Netlify for deployment. Ensure your Netlify build settings include:

```
Node version: 16
Build command: npm run build
Publish directory: public
```

### GitHub Actions

The workflow is configured to:
1. Use Node.js 16 for compatibility
2. Install dependencies with `npm ci`
3. Run security audits
4. Check site health
5. Continue even if checks fail (to avoid blocking deployments)

## Exit Codes

- **0**: All checks passed, no critical issues
- **1**: Issues found that need attention

## Dependencies

These scripts use only Node.js built-in modules:
- `https` - For making HTTP requests
- `http` - For HTTP protocol support
- `url` - For URL parsing
- `child_process` - For running npm audit
- `fs` - For file system operations

No external dependencies are required!

## Troubleshooting

### Site Check Fails

If the site check fails, possible reasons:
- Site is actually down
- Network connectivity issues
- DNS resolution problems
- Firewall blocking the connection

### Security Audit Shows Many Vulnerabilities

This is expected with older Gatsby versions. See `SITE_ANALYSIS.md` for:
- Detailed vulnerability breakdown
- Update recommendations
- Migration path to newer versions

### Build Fails with Node.js 17+

The current codebase requires Node.js 16. Node.js 17 and later versions are incompatible due to OpenSSL changes. See `.nvmrc` and `SITE_ANALYSIS.md` for details.

## Contributing

When adding new monitoring scripts:
1. Follow the existing pattern
2. Use only Node.js built-in modules when possible
3. Provide clear error messages
4. Document the script in this README
5. Add corresponding npm script in `package.json`
6. Update `.github/workflows/security-check.yml` if needed

## Resources

- [Site Analysis Documentation](../SITE_ANALYSIS.md)
- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Gatsby Documentation](https://www.gatsbyjs.com/docs/)
