# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.x (current) | ✅ Yes |

## Reporting a vulnerability

**Please do not report security vulnerabilities in public GitHub issues.**

If you discover a security vulnerability in Nimantro, please email **security@nimantro.app** with:

- A description of the vulnerability.
- Steps to reproduce.
- Potential impact.
- If you have a suggested fix, please include it.

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 14 days for critical issues.

## Security model

- Firebase Authentication handles all user identity.
- All privileged operations go through Cloud Functions with server-side validation.
- Firestore Security Rules are tested separately.
- Guest invitation tokens are high-entropy and stored only as SHA-256 hashes.
- Storage access is controlled per path with MIME-type validation.
- The Admin SDK bypasses Security Rules — every privileged Cloud Function validates the caller independently.
- Export workers accept only validated template documents, not arbitrary HTML.

## Responsible disclosure

We follow responsible disclosure principles. After a fix is released, we will credit reporters in the changelog unless they prefer anonymity.
