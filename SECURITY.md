# Security Documentation

This document outlines the security measures implemented in the Caminho Anglicano admin panel and provides guidelines for secure deployment and operation.

## Overview

The application has been audited and hardened against common web security vulnerabilities. This document describes:
- Security measures implemented
- Configuration requirements
- Best practices for deployment
- Monitoring recommendations

---

## Security Measures Implemented

### 1. Input Validation and Sanitization

**Location:** `layers/admin/server/utils/validation.ts`

All user inputs are validated using Zod schemas to ensure:
- Type safety
- Length constraints
- Format validation (emails, URLs)
- Prevention of malicious input

**Protected endpoints:**
- All submission endpoints (public and admin)
- All update/patch endpoints
- Google Places search endpoint

### 2. Mass Assignment Protection

**Fixed in:**
- `layers/admin/server/api/admin/churches/[id].patch.ts`
- `layers/admin/server/api/admin/submissions/[id]/index.patch.ts`

Implementation:
- Strict whitelisting of allowed fields
- Zod schema validation with `.strict()` mode
- Explicit field mapping instead of blind object spreading

### 3. Rate Limiting

**Location:** `layers/admin/server/utils/rateLimit.ts`

Rate limits applied:
- **Authentication:** 5 requests/minute
- **Geocoding operations:** 10 requests/minute (expensive API calls)
- **Admin write operations:** 30 requests/minute
- **Admin read operations:** 100 requests/minute
- **Public submissions:** 10 requests/5 minutes
- **Bulk submissions:** 3 requests/10 minutes

### 4. Audit Logging

**Location:** `layers/admin/server/utils/auditLog.ts`

All critical admin actions are logged:
- Church created/updated/deleted
- Submission approved/rejected/updated
- Bulk submission operations
- Admin login/logout

Each log entry includes:
- Action type
- Resource affected
- Admin email
- IP address
- Timestamp
- Metadata (changes made)

**Note:** Currently logs to console. For production, implement database persistence or external logging service.

### 5. XSS Prevention

**Location:** `layers/admin/server/utils/sanitization.ts`

Protections:
- HTML entity encoding for user-supplied content
- Recursive object sanitization
- Content Security Policy headers

### 6. Error Handling

Improvements:
- Generic error messages in production
- Detailed errors only in development
- No stack traces exposed to clients
- Sanitized logs (no sensitive data)

### 7. Security Headers

**Location:** `server/middleware/security-headers.ts`

Headers implemented:
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection for older browsers
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts browser features
- `Strict-Transport-Security` - HTTPS enforcement (production only)
- `Content-Security-Policy` - Comprehensive CSP

### 8. Authentication & Authorization

**Location:** `layers/admin/server/utils/adminAuth.ts`

Features:
- JWT token verification via Supabase
- Email-based admin authorization
- Protected API routes via middleware
- Server-side authentication check on every request

---

## Google Maps API Security

### Current Configuration

The Google Maps API key is exposed in the frontend (`NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`). This is necessary for client-side map rendering but poses security risks.

### Required Security Measures

**1. API Key Restrictions (Critical)**

In Google Cloud Console, configure the following restrictions for your API key:

**Application restrictions:**
- Set "HTTP referrers (web sites)"
- Add your production domain(s):
  ```
  https://yourdomain.com/*
  https://*.yourdomain.com/*
  ```
- **Never** use `*` or allow all referrers

**API restrictions:**
- Restrict key to only required APIs:
  - Maps JavaScript API
  - Geocoding API
  - Places API

**2. Separate Keys (Recommended)**

Use different API keys for:
- **Frontend:** Restricted to your domain, limited to Maps JavaScript API only
- **Backend:** Not exposed publicly, used for Geocoding and Places API

Update `.env`:
```env
# Frontend key (restricted to domain, minimal permissions)
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-frontend-key

# Backend key (server-side only, more permissions)
GOOGLE_MAPS_SERVER_KEY=your-backend-key
```

Update `nuxt.config.ts`:
```typescript
runtimeConfig: {
  googleMapsServerKey: process.env.GOOGLE_MAPS_SERVER_KEY,
  public: {
    googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
  }
}
```

**3. Monitoring and Quotas**

- Set up billing alerts in Google Cloud
- Monitor API usage regularly
- Set quota limits to prevent abuse
- Enable API usage metrics

**4. Cost Control**

Implement in Google Cloud Console:
- Daily quota limits per API
- Budget alerts
- Cap on requests per day

---

## Environment Variables Security

### Required Variables

```env
# Supabase Configuration
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # NEVER expose to frontend

# Google Maps
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-public-maps-key
GOOGLE_MAPS_SERVER_KEY=your-server-key  # Optional but recommended

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com  # Email of admin user
```

### Security Best Practices

1. **Never commit `.env` to version control**
   - ✅ `.env` is in `.gitignore`
   - ✅ `.env.example` provides template

2. **Service Key Protection**
   - `SUPABASE_SERVICE_KEY` has full database access
   - Never expose in frontend code
   - Only use in server-side code
   - Rotate periodically

3. **Production Deployment**
   - Use environment variables in hosting platform
   - Never hardcode secrets
   - Use different keys for dev/staging/production

---

## Supabase Security

### Row Level Security (RLS)

**Recommended policies to implement:**

```sql
-- Churches table: Public read, admin-only write
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON churches
  FOR SELECT USING (true);

CREATE POLICY "Admin write access" ON churches
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@yourdomain.com'
  );

-- Submissions: No public access, admin-only
ALTER TABLE church_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON church_submissions
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@yourdomain.com'
  );

-- Bulk submissions: No public access, admin-only
ALTER TABLE bulk_church_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON bulk_church_submissions
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@yourdomain.com'
  );
```

### Database Security

1. **Enable RLS on all sensitive tables**
2. **Use service key only server-side**
3. **Regular backups** (enable Point-in-Time Recovery)
4. **Monitor database logs** for suspicious activity
5. **Use prepared statements** (already handled by Supabase client)

---

## Deployment Security Checklist

### Before Production

- [ ] Enable HTTPS/SSL certificate
- [ ] Configure Google Maps API key restrictions
- [ ] Set up separate API keys for frontend/backend
- [ ] Enable Supabase Row Level Security
- [ ] Configure environment variables in hosting platform
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review and adjust CSP headers if needed
- [ ] Test rate limiting in staging environment
- [ ] Set up audit log persistence (database or external service)
- [ ] Enable Supabase Auth email confirmations
- [ ] Configure CORS properly
- [ ] Set up WAF (Web Application Firewall) if available
- [ ] Enable DDoS protection

### Monitoring

Set up monitoring for:
- Failed authentication attempts
- Rate limit violations
- Unusual API usage patterns
- Database errors
- Google Maps API quota usage
- Server errors (500s)

### Regular Security Tasks

**Weekly:**
- Review audit logs for suspicious activity
- Check Google Maps API usage

**Monthly:**
- Review and update dependencies (`npm audit`)
- Check for new Supabase security advisories
- Review access logs

**Quarterly:**
- Rotate API keys
- Review and update security policies
- Security audit of code changes
- Penetration testing (if budget allows)

---

## Incident Response

### If API Key is Compromised

1. Immediately revoke the key in Google Cloud Console
2. Generate new API key with proper restrictions
3. Update environment variables
4. Redeploy application
5. Review billing for unauthorized usage
6. Contact Google Cloud support if charges are excessive

### If Service Key is Compromised

1. Immediately rotate `SUPABASE_SERVICE_KEY` in Supabase dashboard
2. Update environment variables
3. Redeploy application
4. Review database logs for unauthorized access
5. Check for data modifications
6. Consider password reset for admin users

### If Unauthorized Access Detected

1. Review audit logs to determine scope
2. Disable compromised admin accounts
3. Review and revert unauthorized changes
4. Strengthen authentication (consider MFA)
5. Investigate attack vector
6. Implement additional controls to prevent recurrence

---

## Additional Recommendations

### Multi-Admin Support

Current limitation: Only one admin email supported.

**To implement multi-admin:**
1. Create `admin_users` table in Supabase
2. Update `adminAuth.ts` to check against table instead of env variable
3. Implement role-based access control (RBAC)
4. Add admin management UI

### CSRF Protection

Current state: Nuxt provides some default protection.

**For enhanced protection:**
1. Implement explicit CSRF tokens for state-changing operations
2. Use SameSite cookie attributes
3. Validate Origin/Referer headers

### Two-Factor Authentication (2FA)

**Recommendation:**
- Enable 2FA for admin users via Supabase Auth
- Require 2FA for production admin access

### Content Security Policy Refinement

The CSP headers are conservative. As you add features:
1. Review CSP violations in browser console
2. Adjust directives as needed
3. Use CSP report-only mode for testing
4. Never use `unsafe-inline` or `unsafe-eval` unless absolutely necessary

---

## Security Contacts

**Report Security Issues:**
- Create a private security advisory on GitHub
- Or contact: [your-security-email@domain.com]

**Do not:**
- Publicly disclose vulnerabilities before they are fixed
- Share sensitive information in public forums

---

## Compliance Notes

Depending on your jurisdiction and use case, you may need to comply with:
- **GDPR** (EU): Data protection and privacy
- **LGPD** (Brazil): Data protection law
- **CCPA** (California): Consumer privacy
- **PCI DSS**: If handling payment information

Ensure you have:
- Privacy policy
- Terms of service
- Data processing agreements
- Cookie consent mechanism
- Data retention policies
- Right to deletion/access procedures

---

## Version History

- **v1.0** (2024-01-14): Initial security implementation
  - Input validation with Zod
  - Rate limiting
  - Audit logging
  - Security headers
  - Mass assignment protection
  - XSS prevention
  - Error handling improvements

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Nuxt Security Best Practices](https://nuxt.com/docs/guide/going-further/security)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Google Maps API Security](https://developers.google.com/maps/api-security-best-practices)
