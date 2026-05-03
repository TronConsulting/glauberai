# Multi-API Key System - Quick Reference

## Current State
Your app currently supports **ONE API key per provider**:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

## Goal
Support **HUNDREDS of API keys** so users can:
- Add their own API keys for any model they want
- Manage multiple keys per provider (production + backup)
- Track spending per key
- Auto-rotate on failures
- Set cost limits per key

---

## 3-Step Implementation Path

### Step 1: Database (2 hours)
```prisma
model ProviderApiKey {
  id              String    @id @default(uuid())
  userId          String    // who owns this key
  provider        String    // openai, anthropic, google, etc
  apiKey          String    @encrypted
  keyName         String    // "OpenAI Production"
  isPrimary       Boolean   @default(false)
  failureCount    Int       @default(0)
  costLimit       Decimal?  // $100/month max
  monthlySpent    Decimal   @default(0)
  expiresAt       DateTime?
  createdAt       DateTime  @default(now())
  revokedAt       DateTime?
}
```

**Command:**
```bash
npx prisma migrate dev --name add_provider_api_keys
```

---

### Step 2: API Key Manager Service (4 hours)
```typescript
// lib/multi-key-manager.ts
class MultiKeyManager {
  // Get best available key for provider
  async getOptimalKey(userId, provider, constraints)
  
  // Record usage when key is used
  async recordUsage(keyId, costIncurred, success)
  
  // Rotate to backup key on failure
  async rotateKeyOnFailure(keyId)
  
  // Get key health status
  async getKeyStatus(keyId)
  
  // Revoke a key
  async revokeKey(keyId)
}
```

---

### Step 3: API Endpoints (3 hours)
```
POST   /api/keys              # Add new key
GET    /api/keys              # List user's keys
DELETE /api/keys/[keyId]      # Revoke key
GET    /api/keys/[keyId]/stats # Key usage stats
```

---

## Integration Points

### 1. In AI Client (when calling model):
```typescript
// Before: Use global environment variable
const apiKey = process.env.OPENAI_API_KEY;

// After: Get user's best available key
const optimalKey = await multiKeyManager.getOptimalKey(
  userId,
  'openai',
  { maxCost: user.monthlyBudget }
);
const apiKey = optimalKey.keyValue;
```

### 2. Track Usage:
```typescript
// After successful API call:
await multiKeyManager.recordUsage(keyId, cost, latency, success);
```

### 3. Auto-Rotate on Failure:
```typescript
// If API call fails:
const fallback = await multiKeyManager.rotateKeyOnFailure(keyId);
if (fallback.success) {
  // Retry with fallback.newKeyId
}
```

---

## Features You Get

| Feature | Benefit |
|---------|---------|
| **Multiple Keys per Provider** | Users can add multiple OpenAI keys, rotate between them |
| **Cost Tracking** | Know exactly which key costs what |
| **Cost Limits** | Prevent bill shock: "max $50/month on this key" |
| **Auto-Rotation** | Automatically switch to backup key if primary fails |
| **Primary/Backup** | Mark which key to use first, fallback to others |
| **Expiration Management** | Track when keys expire, send alerts |
| **Revocation** | Instantly disable a compromised key |
| **Usage Analytics** | See cost per provider, per model over time |

---

## Frontend UI

```
┌─ API Keys Management ──────────────────────┐
│                                            │
│  + Add New API Key                        │
│  ├─ Provider: [OpenAI ▼]                  │
│  ├─ Key Name: [My Production Key  ]      │
│  ├─ API Key: [sk-.....................] │
│  ├─ ☑ Set as Primary                      │
│  └─ [Add Key]                             │
│                                            │
│ Your API Keys (4)                         │
│ ┌─────────────────────────────────────┐   │
│ │ OpenAI Production        (Primary) │   │
│ │ sk-...XXXX   Cost: $12.34/mo       │   │
│ │ Status: Healthy   [More] [Revoke]  │   │
│ └─────────────────────────────────────┘   │
│ ┌─────────────────────────────────────┐   │
│ │ OpenAI Backup                       │   │
│ │ sk-...YYYY   Cost: $0.00/mo         │   │
│ │ Status: Healthy   [More] [Revoke]  │   │
│ └─────────────────────────────────────┘   │
│ ┌─────────────────────────────────────┐   │
│ │ Anthropic Prod                      │   │
│ │ sk-ant-...ZZZZ   Cost: $5.67/mo     │   │
│ │ Status: Healthy   [More] [Revoke]  │   │
│ └─────────────────────────────────────┘   │
│                                            │
│ Monthly Spending by Provider               │
│ ├─ OpenAI: $12.34 / Unlimited             │
│ ├─ Anthropic: $5.67 / Unlimited           │
│ └─ Google: $0.00 / Unlimited              │
│                                            │
└────────────────────────────────────────────┘
```

---

## Cost Calculation Example

**Scenario:** User adds 3 OpenAI keys
```
Key 1: sk-abc123 (Primary)
  Cost limit: $50/month
  Usage: $45.23 (90%)
  Status: ✅ Healthy

Key 2: sk-def456 (Backup)
  Cost limit: $30/month
  Usage: $0 (not used)
  Status: ✅ Healthy

Key 3: sk-ghi789 (Backup)
  Cost limit: $20/month
  Usage: $0 (not used)
  Status: ✅ Healthy

Total monthly spend: $45.23
Total capacity: $100/month
Remaining: $54.77 (54%)
```

When Key 1 reaches $50, auto-switch to Key 2

---

## Security Checklist

- [ ] Hash API keys before storing (bcrypt)
- [ ] Only show key prefix to users (sk-...XXXX)
- [ ] Don't log full key values
- [ ] Use HTTPS only for key transmission
- [ ] Implement key expiration
- [ ] Add audit log for key operations
- [ ] Rate limit key addition (prevent spam)
- [ ] Validate key format per provider
- [ ] Encrypt keys at rest (optional, if sensitive)

---

## Testing Checklist

```typescript
// Test scenarios:
1. Add key → ✓ Stored securely
2. Use key → ✓ API call succeeds
3. Key failure → ✓ Rotates to backup
4. Cost tracking → ✓ Recorded correctly
5. Revoke key → ✓ Can't use anymore
6. Expire key → ✓ Auto-disabled
7. Cost limit → ✓ Stops when limit hit
8. Multiple providers → ✓ Each manages independently
```

---

## Migration Strategy (if you have existing users)

```typescript
// Step 1: Create default key entry for each user
for each user:
  if env.OPENAI_API_KEY exists:
    create ProviderApiKey {
      userId: user.id,
      provider: 'openai',
      isPrimary: true,
      keyName: 'Default OpenAI Key'
    }

// Step 2: Update routing to check database first
if user.id:
  key = await multiKeyManager.getOptimalKey(user.id, provider)
else:
  key = process.env[`${provider.toUpperCase()}_API_KEY`]

// Step 3: Gradually encourage users to add their own keys
// Step 4: Deprecate global environment API keys
```

---

## Performance Impact

- **Database queries:** ~1 per request (cached in memory)
- **API call latency:** No impact (key lookup is <10ms)
- **Storage:** ~500 bytes per key record
- **Cost:** Minimal, depends on rotation frequency

---

## Monitoring

```typescript
// Track these metrics:
- Keys added per day (adoption)
- Average cost per key
- Rotation frequency (indicates issues)
- Keys expired per month
- Cost limit breaches per month
- Provider distribution (which providers most used)
```

---

## ROI

**Implementation Cost:** 10-15 hours dev work
**User Benefit:** 
- Can use all 100+ models without provider limits
- Cost transparency
- Automatic failover reduces downtime
- Better resource utilization

**Revenue Impact:**
- Can charge for "unlimited models access" tier
- Reduce support tickets for "why can't I use model X"
- Higher platform stickiness
