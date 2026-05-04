# 🔍 How CertChain Works

> A detailed walkthrough of how CertChain issues, owns, and verifies educational credentials on Cardano blockchain.

---

## The Three-Role Story

CertChain serves three distinct user personas, each with their own interface and workflow. To understand the system, let's follow a real story.

### 🏛️ Role 1: The Issuer (University)

**Meet Ms. Hương** — Academic Affairs Officer at NTU Vietnam.

Each year, NTU graduates **5,000 students**. Currently, Ms. Hương:
- Stores paper records in archives (must keep for 50 years by law)
- Receives **hundreds of verification requests** monthly from companies and embassies
- Manually retrieves files, prints, stamps, and mails verification letters
- Spends significant staff time on this repetitive work

**With CertChain**:

1. Ms. Hương logs into the **Issuer Portal** (`/issuer`)
2. Uploads an Excel file with 5,000 graduate records
3. Clicks **"Issue All Diplomas"**
4. The system:
   - Hashes each student's personal data (privacy-preserving)
   - Creates a Cardano transaction with CIP-20 metadata for each diploma
   - Submits transactions to Cardano blockchain (~0.17 ADA each)
   - Generates a unique QR code linked to each transaction
   - Emails QR codes to graduates

**Total time**: 30 minutes for 5,000 diplomas (vs. days of manual work)

### 🎓 Role 2: The Holder (Student)

**Meet Minh** — A Computer Science graduate from NTU Vietnam, Class of 2027.

Minh receives an email with his digital diploma:

```
Subject: 🎓 Your NTU Diploma is now on Cardano

Congratulations Minh!
Your Bachelor of Computer Science degree has been
issued on Cardano blockchain.

📱 [Open in CertChain Mobile]
🔗 Backup link: https://verify.certchain.app/d/fca1ed...
```

**What Minh can do**:

- Save QR code image to phone (works offline)
- Share QR via email/WhatsApp when applying for jobs
- Display QR at job interviews — employer scans, gets verified diploma in 2 seconds
- Use QR for visa applications, study abroad, professional licensing
- Carry his credentials **for life** — even if NTU's website goes down, the blockchain remains

**No more legalization fees. No more 2-week waits.**

### 🏢 Role 3: The Verifier (Employer)

**Meet Ms. Lan** — HR Manager at FPT Software in Ho Chi Minh City.

Ms. Lan reviews 200 resumes monthly. She needs to verify if candidates' claimed credentials are real.

**Old way**:
- Email/call university registrar
- Wait 5-15 days for response
- Sometimes universities have lost old records
- Some candidates submit fake diplomas she can't easily detect

**With CertChain**:

1. Ms. Lan opens **Verifier App** (`/verifier`) on her laptop or phone
2. Asks candidate to show their CertChain QR code
3. Scans QR with webcam/camera
4. **Within 2 seconds**:
   ```
   ✅ VERIFIED ON CARDANO
   
   Name: Lê Văn Minh
   Degree: Bachelor of Computer Science
   University: Nguyen Tat Thanh University
   Issue Date: 15/06/2027
   GPA: 3.5
   
   🔒 Issued by: NTU-VN (verified signer)
   📅 Block height: 4,328,901
   🔗 TxHash: fca1ed...
   ```

**Decision made instantly. No bureaucracy. No fraud risk.**

---

## Technical Flow

### Step 1: Diploma Issuance

```
University Admin                    CertChain Backend                    Cardano Blockchain
       │                                    │                                    │
       │ Click "Issue Diploma"              │                                    │
       │ {name, MSSV, major, GPA, date}     │                                    │
       ├──────────────────────────────────▶ │                                    │
       │                                    │                                    │
       │                              Hash personal data                         │
       │                              Build CIP-20 metadata                      │
       │                                    │                                    │
       │                                    │ submitTx(metadata, signature)      │
       │                                    ├──────────────────────────────────▶ │
       │                                    │                                    │
       │                                    │              Validate & include    │
       │                                    │              in next block         │
       │                                    │                                    │
       │                                    │ ◀────────────────────────────────  │
       │                                    │              { txHash: "fca1..." } │
       │                              Generate QR code                           │
       │                              with txHash                                │
       │                                    │                                    │
       │ ◀────────────────────────────────  │                                    │
       │ { qrCode: "...", txHash: "..." }   │                                    │
       │                                    │                                    │
```

### Step 2: Verification

```
Employer (Verifier)                 CertChain Frontend                   Cardano Blockchain
       │                                    │                                    │
       │ Scan QR code                       │                                    │
       │ → extracts txHash                  │                                    │
       ├──────────────────────────────────▶ │                                    │
       │                                    │                                    │
       │                                    │ getTransactionMetadata(txHash)     │
       │                                    ├──────────────────────────────────▶ │
       │                                    │                                    │
       │                                    │ ◀────────────────────────────────  │
       │                                    │   { issuer, credential, sig }      │
       │                              Validate signature                         │
       │                              Display result                             │
       │ ◀────────────────────────────────  │                                    │
       │ ✅ VERIFIED                        │                                    │
       │                                    │                                    │
```

---

## Why CIP-20 Metadata (Not Smart Contracts)?

| Approach | Pros | Cons |
|---|---|---|
| **Smart Contracts (Aiken/Plutus)** | Stateful, programmable | Complex, audit-required, attack surface |
| **CIP-20 Metadata** ✅ | Simple, immutable, no audit needed | Read-only after submission |

**For credentials, CIP-20 is the right choice** because:
- Diplomas don't need updateable state
- Simplicity reduces security risk
- Lower cost (~0.17 ADA vs. 1+ ADA for smart contract execution)
- Faster development for hackathon timeline

---

## Privacy Considerations

### What's stored on-chain?

- ✅ Hashed student ID (`sha256(MSSV + salt)`)
- ✅ Hashed full name (`sha256(name + salt)`)
- ✅ Public details: degree type, major, graduation date, GPA
- ✅ Issuer signature (proves university actually signed it)
- ✅ Document hash (proves diploma file integrity)

### What's NOT stored on-chain?

- ❌ Plaintext student name
- ❌ Plaintext student ID number
- ❌ Personal information (address, phone, etc.)
- ❌ Original diploma image/PDF

### How verification works without revealing PII

When a student shares their QR code, they also share a **salt** (off-chain) that allows the verifier to recompute the hash and confirm the on-chain record matches. Without the salt, the on-chain data reveals nothing about the student's identity.

This balances **public verifiability** (anyone can confirm a diploma is real) with **privacy** (no personal data leaks on-chain).

---

## Roadmap Beyond MVP

### Phase 1: Diploma Issuance (M1-M6)
✅ Single university (NTU pilot)
✅ Bachelor degrees
✅ Manual verification by employers

### Phase 2: Multi-University Network (Month 6-12)
- Onboard 30+ Vietnamese universities
- Standardized credential schema
- API for HR systems integration (TopCV, JobStreet)

### Phase 3: Beyond Diplomas (Year 2)
- Professional certifications (IELTS, AWS, Google)
- Course completion certificates (Coursera-style)
- Soft skill credentials (verified by peers/instructors)

### Phase 4: SEA Expansion (Year 3+)
- Singapore, Malaysia, Indonesia, Philippines partnerships
- Cross-border credential portability
- Become **the** digital credential layer for Southeast Asia

---

## Frequently Asked Questions

**Q: What if Cardano blockchain disappears?**
A: Cardano is one of the top 10 blockchains by market cap, with 3,000+ stake pools globally. The probability of complete shutdown is extremely low — much lower than a single university losing records. Plus, off-chain backups can always be created.

**Q: What if a university issues a fake diploma?**
A: The blockchain cryptographically proves which university issued each diploma. If a university issues fakes, it damages their own reputation publicly and permanently. This creates strong incentive against fraud.

**Q: Can a diploma be revoked?**
A: Yes — by issuing a "revocation transaction" linked to the original. The original record stays on-chain (immutability), but verifiers will see the revocation status when checking.

**Q: Is this GDPR / personal data compliant?**
A: Yes. Only **hashes** of personal data are on-chain, not plaintext. Without the off-chain salt, the on-chain data is computationally infeasible to reverse.

**Q: How does this scale?**
A: Cardano can handle ~1M+ transactions per day on mainnet. For Vietnam's 600K diplomas/year, this is well within capacity. For SEA scale (5M+/year), we'd batch issue multiple diplomas in a single transaction (Cardano supports this natively).

---

> Have more questions? Open an [issue](https://github.com/Hunny-17/certchain-cardano/issues) on GitHub.
