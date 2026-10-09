# Information Security Policy


**Owner:** Security Team · **Effective:** 15 January 2024 · **Version:** 3.2


## 1. Passwords and authentication


- Passwords must be at least **14 characters**.
- **Multi-factor authentication (MFA)** is mandatory for all company accounts,
  including email, VPN, HR systems and code repositories.
- Hardware security keys (FIDO2) are issued to engineers and administrators,
  and are **required** for production infrastructure access.
- Password managers are provided free of charge. Reusing a company password on
  a personal site is a **reportable security incident**.


## 2. Device security


- All laptops must have **full-disk encryption** enabled (FileVault / BitLocker).
- Automatic screen lock after **5 minutes** of inactivity.
- Operating system and browser updates must be installed within **14 days** of release.
- Personal devices may access email and Slack only through the MDM-enrolled
  mobile apps; they may **never** store company documents locally.


## 3. Data classification


| Class | Examples | Storage allowed |
|---|---|---|
| **Public** | Marketing site, blog | Anywhere |
| **Internal** | Policies, org charts | Company cloud only |
| **Confidential** | Customer data, contracts | Company cloud, encrypted, need-to-know |
| **Restricted** | Credentials, source code, PII | Approved systems with audit logging |


Restricted data must **never** be copied to personal cloud storage, USB drives,
or personal email.


## 4. Incident reporting


Any suspected security incident must be reported to
**security@company.example** within **1 hour** of discovery, or via the
`#security-incidents` Slack channel. Do not attempt to investigate on your own.
The on-call security engineer will acknowledge within 15 minutes.


## 5. Third-party and SaaS tools


New SaaS tools that will process Internal data or above require a **security
review** before use. Submit a request through the IT portal; reviews take
**5–10 business days**. Tools processing only Public data need no review.


## 6. Access management


- Access follows **least privilege** and is granted by role.
- Access reviews run **quarterly**; managers must confirm or revoke each report's access.
- Deprovisioning happens within **24 hours** of an employee's last day.
- Production access requires a documented business justification and is
  re-approved every **6 months**.


## 7. Compliance


The company maintains **SOC 2 Type II** certification, audited annually, and is
**GDPR** compliant for EU personal data. Data subject access requests must be
routed to **privacy@company.example** within 24 hours of receipt.
