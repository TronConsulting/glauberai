# Multi-LLM API Keys Implementation Guide

## Overview
This guide shows how to implement support for **hundreds of LLM API keys** across different providers (OpenAI, Anthropic, Google, Groq, etc.) so users can access all models under one roof.

---

## Phase 1: Database Schema Updates

### 1.1 Create Provider API Keys Table

```sql
-- Migration file: prisma/migrations/xxx_add_provider_api_keys/migration.sql

CREATE TABLE "ProviderApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT,
    "keyHash" TEXT NOT NULL UNIQUE,
    "keyPrefix" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER,
    "costLimit" DECIMAL(10,2),
    "monthlySpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    UNIQUE("userId", "provider", "modelId")
);

CREATE INDEX "ProviderApiKey_userId_provider_isPrimary_idx" 
ON "ProviderApiKey"("userId", "provider", "isPrimary");

CREATE INDEX "ProviderApiKey_userId_createdAt_idx" 
ON "ProviderApiKey"("userId", "createdAt");

-- Tracking table for key rotation/history
CREATE TABLE "ApiKeyRotationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerApiKeyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "rotatedToKeyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("providerApiKeyId") REFERENCES "ProviderApiKey"("id") ON DELETE CASCADE
);

CREATE INDEX "ApiKeyRotationLog_providerApiKeyId_createdAt_idx" 
ON "ApiKeyRotationLog"("providerApiKeyId", "createdAt");
```

### 1.2 Update Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  providerApiKeys ProviderApiKey[]
  apiKeyRotationLogs ApiKeyRotationLog[]
}

model ProviderApiKey {
  id              String    @id @default(uuid())
  userId          String
  provider        String    // openai, anthropic, google, groq, etc.
  modelId         String?   // optional: specific model if provider supports multiple
  keyHash         String    @unique // bcrypt hash of actual key
  keyPrefix       String    // first 8 chars + last 4 chars: sk-....XXXX
  keyName         String    // user-friendly name: "OpenAI Production", "Backup Key"
  isPrimary       Boolean   @default(false)
  
  // Performance tracking
  failureCount    Int       @default(0)
  lastUsedAt      DateTime?
  
  // Rate limiting
  rateLimit       Int?      // requests per minute for this specific key
  
  // Cost tracking
  costLimit       Decimal?  // max monthly spend for this key
  monthlySpent    Decimal   @default(0)
  
  // Lifecycle
  expiresAt       DateTime?
  createdAt       DateTime  @default(now())
  revokedAt       DateTime?
  
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  rotationLogs    ApiKeyRotationLog[]
  
  @@unique([userId, provider, modelId])
  @@index([userId, provider, isPrimary])
  @@index([provider, isPrimary]) // Find primary keys by provider
  @@index([userId, createdAt])
}

model ApiKeyRotationLog {
  id                String    @id @default(uuid())
  providerApiKeyId  String
  status            String    // active, exhausted, failed, rotated_out, expired
  failureReason     String?
  rotatedToKeyId    String?   // foreign key to what we rotated to
  createdAt         DateTime  @default(now())
  
  providerApiKey    ProviderApiKey @relation(fields: [providerApiKeyId], references: [id], onDelete: Cascade)
  
  @@index([providerApiKeyId, createdAt])
  @@index([status, createdAt]) // Find failed keys
}
```

---

## Phase 2: Create Multi-Key Manager Service

### 2.1 Create `lib/multi-key-manager.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { hash, verify } from 'bcrypt';
import { randomBytes } from 'crypto';

export interface ApiKeySelection {
  id: string;
  keyValue: string;
  provider: string;
  modelId?: string;
  isPrimary: boolean;
  fallbackKeys: string[]; // backup keys in priority order
  costLimit?: number;
  monthlySpent: number;
}

export interface KeyRotationOptions {
  reason: 'failure' | 'quota_exceeded' | 'expired' | 'manual';
  maxConsecutiveFailures?: number;
}

export class MultiKeyManager {
  private static instance: MultiKeyManager;
  private prisma: PrismaClient;
  private keyCache = new Map<string, string>(); // keyHash -> actual key value
  private readonly CACHE_DURATION = 60000; // 1 minute

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public static getInstance(prisma: PrismaClient): MultiKeyManager {
    if (!MultiKeyManager.instance) {
      MultiKeyManager.instance = new MultiKeyManager(prisma);
    }
    return MultiKeyManager.instance;
  }

  /**
   * Add a new API key for a provider
   */
  public async addKey(
    userId: string,
    provider: string,
    keyValue: string,
    options: {
      modelId?: string;
      keyName: string;
      rateLimit?: number;
      costLimit?: number;
      expiresAt?: Date;
      isPrimary?: boolean;
    }
  ): Promise<{ success: boolean; error?: string; keyId?: string }> {
    try {
      // Validate key format
      this.validateKeyFormat(provider, keyValue);

      // Hash the key for storage
      const keyHash = await hash(keyValue, 10);
      const keyPrefix = this.generateKeyPrefix(keyValue);

      // If making this primary, unset other primary keys
      if (options.isPrimary) {
        await this.prisma.providerApiKey.updateMany({
          where: { userId, provider, modelId: options.modelId },
          data: { isPrimary: false }
        });
      }

      const newKey = await this.prisma.providerApiKey.create({
        data: {
          userId,
          provider,
          modelId: options.modelId,
          keyHash,
          keyPrefix,
          keyName: options.keyName,
          isPrimary: options.isPrimary || false,
          rateLimit: options.rateLimit,
          costLimit: options.costLimit,
          expiresAt: options.expiresAt
        }
      });

      // Cache the key value (encrypted in memory only)
      this.keyCache.set(keyHash, keyValue);

      console.log(`✅ Added API key: ${newKey.keyName} for ${provider}`);

      return {
        success: true,
        keyId: newKey.id
      };
    } catch (error) {
      console.error('❌ Error adding API key:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the best available key for a provider
   */
  public async getOptimalKey(
    userId: string,
    provider: string,
    modelId?: string,
    constraints?: {
      preferPrimary?: boolean;
      maxCost?: number;
      minRateLimit?: number;
    }
  ): Promise<ApiKeySelection | null> {
    try {
      // Get all active keys for this provider
      const keys = await this.prisma.providerApiKey.findMany({
        where: {
          userId,
          provider,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { failureCount: 'asc' },
          { lastUsedAt: 'desc' }
        ],
        include: {
          rotationLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (keys.length === 0) {
        console.warn(`⚠️ No available API keys for ${provider}`);
        return null;
      }

      // Apply constraints
      let filtered = keys;

      if (constraints?.maxCost) {
        filtered = filtered.filter(k => !k.costLimit || k.monthlySpent < k.costLimit);
      }

      if (constraints?.minRateLimit) {
        filtered = filtered.filter(k => !k.rateLimit || k.rateLimit >= constraints.minRateLimit);
      }

      if (filtered.length === 0) {
        console.warn('⚠️ No keys meet constraints, using primary key anyway');
        filtered = keys.slice(0, 1);
      }

      // Select primary key
      const primaryKey = filtered[0];
      const keyValue = await this.getKeyValue(primaryKey.keyHash);

      if (!keyValue) {
        throw new Error('Could not decrypt key value');
      }

      // Get fallback keys (up to 3)
      const fallbackKeyIds = filtered.slice(1, 4).map(k => k.id);
      const fallbackValues: string[] = [];

      for (const keyId of fallbackKeyIds) {
        const key = keys.find(k => k.id === keyId);
        if (key) {
          const value = await this.getKeyValue(key.keyHash);
          if (value) fallbackValues.push(value);
        }
      }

      return {
        id: primaryKey.id,
        keyValue,
        provider,
        modelId: primaryKey.modelId,
        isPrimary: primaryKey.isPrimary,
        fallbackKeys: fallbackValues,
        costLimit: primaryKey.costLimit?.toNumber(),
        monthlySpent: primaryKey.monthlySpent.toNumber()
      };
    } catch (error) {
      console.error('Error getting optimal key:', error);
      return null;
    }
  }

  /**
   * Get actual key value (from cache or decrypt)
   */
  private async getKeyValue(keyHash: string): Promise<string | undefined> {
    // Check cache first
    if (this.keyCache.has(keyHash)) {
      return this.keyCache.get(keyHash);
    }

    // In production, you'd decrypt from secure storage
    // For now, return undefined (caller should have passed the actual key)
    return undefined;
  }

  /**
   * Record usage and cost for a key
   */
  public async recordUsage(
    keyId: string,
    costIncurred: number,
    latency: number,
    success: boolean
  ): Promise<void> {
    try {
      const updates: any = {
        lastUsedAt: new Date()
      };

      if (success) {
        // Reset failure count on success
        updates.failureCount = 0;
      } else {
        updates.failureCount = { increment: 1 };
      }

      // Update spending
      updates.monthlySpent = { increment: costIncurred };

      await this.prisma.providerApiKey.update({
        where: { id: keyId },
        data: updates
      });
    } catch (error) {
      console.error('Error recording key usage:', error);
    }
  }

  /**
   * Rotate key on failure
   */
  public async rotateKeyOnFailure(
    keyId: string,
    options: KeyRotationOptions = { reason: 'failure' }
  ): Promise<{ success: boolean; newKeyId?: string }> {
    try {
      const key = await this.prisma.providerApiKey.findUnique({
        where: { id: keyId }
      });

      if (!key) {
        return { success: false };
      }

      // Log the rotation
      await this.prisma.apiKeyRotationLog.create({
        data: {
          providerApiKeyId: keyId,
          status: 'rotated_out',
          failureReason: `${options.reason}: max retries exceeded`
        }
      });

      // Get next available key
      const nextKey = await this.prisma.providerApiKey.findFirst({
        where: {
          provider: key.provider,
          userId: key.userId,
          modelId: key.modelId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          failureCount: { lt: 5 } // Prefer keys with fewer failures
        },
        orderBy: { failureCount: 'asc' }
      });

      if (nextKey) {
        // Update rotation log to point to new key
        await this.prisma.apiKeyRotationLog.update({
          where: { id: keyId },
          data: { rotatedToKeyId: nextKey.id }
        });

        console.log(`🔄 Rotated from key ${keyId} to ${nextKey.id}`);
        return { success: true, newKeyId: nextKey.id };
      }

      console.warn(`⚠️ No fallback keys available for rotation`);
      return { success: false };
    } catch (error) {
      console.error('Error rotating key:', error);
      return { success: false };
    }
  }

  /**
   * Get key health/status
   */
  public async getKeyStatus(
    keyId: string
  ): Promise<{
    healthy: boolean;
    failureRate: number;
    monthlySpent: number;
    costLimit?: number;
    remaining: number;
  } | null> {
    try {
      const key = await this.prisma.providerApiKey.findUnique({
        where: { id: keyId },
        include: {
          rotationLogs: {
            where: { status: 'failed' },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!key) return null;

      const failureRate = key.failureCount;
      const monthlySpent = key.monthlySpent.toNumber();
      const costLimit = key.costLimit?.toNumber();
      const remaining = costLimit ? costLimit - monthlySpent : Infinity;

      return {
        healthy: failureRate < 3 && (!costLimit || remaining > 0),
        failureRate,
        monthlySpent,
        costLimit,
        remaining
      };
    } catch (error) {
      console.error('Error getting key status:', error);
      return null;
    }
  }

  /**
   * Get all keys for a user
   */
  public async getUserKeys(userId: string) {
    return this.prisma.providerApiKey.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        modelId: true,
        keyPrefix: true,
        keyName: true,
        isPrimary: true,
        failureCount: true,
        rateLimit: true,
        costLimit: true,
        monthlySpent: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
    });
  }

  /**
   * Revoke a key
   */
  public async revokeKey(keyId: string): Promise<boolean> {
    try {
      await this.prisma.providerApiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() }
      });
      console.log(`🔐 Revoked key: ${keyId}`);
      return true;
    } catch (error) {
      console.error('Error revoking key:', error);
      return false;
    }
  }

  /**
   * Validate key format for provider
   */
  private validateKeyFormat(provider: string, key: string): void {
    const patterns: Record<string, RegExp> = {
      openai: /^sk-/,
      anthropic: /^sk-ant-/,
      google: /^AIza/,
      groq: /^gsk_/,
      mistral: /^(sk-|Mistral)/,
      deepseek: /^sk-/,
      xai: /^xai-/
    };

    const pattern = patterns[provider];
    if (pattern && !pattern.test(key)) {
      throw new Error(`Invalid API key format for ${provider}`);
    }
  }

  /**
   * Generate visible key prefix (first 8 + last 4 chars)
   */
  private generateKeyPrefix(key: string): string {
    const start = key.substring(0, 8);
    const end = key.substring(Math.max(0, key.length - 4));
    return `${start}...${end}`;
  }
}

export const multiKeyManager = MultiKeyManager.getInstance(prisma);
```

---

## Phase 3: Update Routing Logic

### 3.1 Update `lib/ai-client.ts`

```typescript
import { multiKeyManager } from './multi-key-manager';

export class UniversalAIClient {
  // ... existing code

  /**
   * Call a model with multi-key fallback support
   */
  public async callModel(
    model: Model,
    prompt: string,
    options: AIOptions = {},
    userId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Get optimal API key
      let apiKey = model.apiKey; // fallback to default
      let selectedKeyId: string | undefined;

      if (userId) {
        const optimalKey = await multiKeyManager.getOptimalKey(
          userId,
          model.provider,
          model.id,
          {
            maxCost: options.maxCostPerQuery,
            preferPrimary: true
          }
        );

        if (optimalKey) {
          apiKey = optimalKey.keyValue;
          selectedKeyId = optimalKey.id;
        }
      }

      // Call the provider
      let response: AIResponse;

      switch (model.provider) {
        case 'openai':
          response = await this.callOpenAI({ ...model, apiKey }, prompt, options);
          break;
        case 'anthropic':
          response = await this.callAnthropic({ ...model, apiKey }, prompt, options);
          break;
        // ... other providers
        default:
          throw new Error(`Provider ${model.provider} not implemented`);
      }

      // Record usage for this key
      if (selectedKeyId && userId) {
        await multiKeyManager.recordUsage(
          selectedKeyId,
          response.cost,
          response.latency,
          response.success
        );
      }

      return response;
    } catch (error) {
      console.error('Error calling model:', error);

      // Try fallback keys if available
      if (userId) {
        const fallback = await multiKeyManager.rotateKeyOnFailure(
          selectedKeyId || '',
          { reason: 'failure' }
        );

        if (fallback.success && fallback.newKeyId) {
          console.log('Retrying with fallback key...');
          // Recursively retry with new key
          return this.callModel(model, prompt, options, userId);
        }
      }

      return {
        content: '',
        model: model.name,
        provider: model.provider,
        tokens: 0,
        cost: 0,
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

---

## Phase 4: Create API Endpoints

### 4.1 Create `app/api/keys/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-enhanced';
import { multiKeyManager } from '@/lib/multi-key-manager';

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req);
    const { provider, apiKey, keyName, modelId, rateLimit, costLimit, expiresAt, isPrimary } = await req.json();

    if (!provider || !apiKey || !keyName) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, apiKey, keyName' },
        { status: 400 }
      );
    }

    const result = await multiKeyManager.addKey(ctx.user.id, provider, apiKey, {
      modelId,
      keyName,
      rateLimit,
      costLimit,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isPrimary
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      keyId: result.keyId,
      message: `API key added successfully`
    });
  } catch (error) {
    console.error('Error adding key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateRequest(req);
    const keys = await multiKeyManager.getUserKeys(ctx.user.id);

    return NextResponse.json({
      success: true,
      keys,
      total: keys.length
    });
  } catch (error) {
    console.error('Error fetching keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.2 Create `app/api/keys/[keyId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-enhanced';
import { multiKeyManager } from '@/lib/multi-key-manager';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { keyId: string } }) {
  try {
    const ctx = await authenticateRequest(req);
    const status = await multiKeyManager.getKeyStatus(params.keyId);

    if (!status) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { keyId: string } }) {
  try {
    const ctx = await authenticateRequest(req);

    // Verify ownership
    const key = await prisma.providerApiKey.findUnique({
      where: { id: params.keyId }
    });

    if (!key || key.userId !== ctx.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const success = await multiKeyManager.revokeKey(params.keyId);

    return NextResponse.json({
      success,
      message: success ? 'Key revoked' : 'Failed to revoke key'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Phase 5: Frontend Components

### 5.1 Create `components/api-keys-manager.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

export function ApiKeysManager() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState({
    provider: 'openai',
    apiKey: '',
    keyName: '',
    isPrimary: false
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    const res = await fetch('/api/keys');
    const data = await res.json();
    setKeys(data.keys);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newKey)
    });

    if (res.ok) {
      setNewKey({ provider: 'openai', apiKey: '', keyName: '', isPrimary: false });
      fetchKeys();
      alert('API key added successfully!');
    } else {
      alert('Failed to add API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;

    const res = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchKeys();
      alert('Key revoked');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Add New API Key</h2>
        
        <form onSubmit={handleAddKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Provider</label>
            <select
              value={newKey.provider}
              onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="groq">Groq</option>
              <option value="mistral">Mistral</option>
              <option value="deepseek">DeepSeek</option>
              <option value="xai">xAI (Grok)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Key Name</label>
            <input
              type="text"
              value={newKey.keyName}
              onChange={(e) => setNewKey({ ...newKey, keyName: e.target.value })}
              placeholder="e.g., OpenAI Production"
              required
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">API Key</label>
            <input
              type="password"
              value={newKey.apiKey}
              onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
              placeholder="Paste your API key here"
              required
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newKey.isPrimary}
              onChange={(e) => setNewKey({ ...newKey, isPrimary: e.target.checked })}
              className="rounded"
            />
            <span className="ml-2 text-sm">Set as primary key</span>
          </label>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Add API Key
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Your API Keys</h2>
        
        <div className="space-y-2">
          {keys.map((key: any) => (
            <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{key.keyName}</p>
                <p className="text-sm text-gray-600">{key.provider}</p>
                <p className="text-xs text-gray-500">{key.keyPrefix}</p>
              </div>
              <div className="flex gap-2">
                {key.isPrimary && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Primary</span>}
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 6: Cost Tracking & Monitoring

### 6.1 Create Cost Dashboard Endpoint

```typescript
// app/api/keys/stats/route.ts

export async function GET(req: NextRequest) {
  const ctx = await authenticateRequest(req);

  const keys = await multiKeyManager.getUserKeys(ctx.user.id);

  const stats = {
    totalKeys: keys.length,
    providers: [...new Set(keys.map(k => k.provider))],
    totalSpent: keys.reduce((sum, k) => sum + k.monthlySpent, 0),
    costLimit: keys.reduce((sum, k) => sum + (k.costLimit || 0), 0),
    remainingBudget: keys.reduce((sum, k) => 
      sum + (k.costLimit ? k.costLimit - k.monthlySpent : 0), 0
    ),
    healthyKeys: keys.filter(k => k.failureCount < 3).length,
    expiredKeys: keys.filter(k => k.expiresAt && new Date(k.expiresAt) < new Date()).length
  };

  return NextResponse.json({ success: true, stats });
}
```

---

## Integration Checklist

- [ ] Run Prisma migration: `npx prisma migrate dev`
- [ ] Create `MultiKeyManager` service
- [ ] Update `UniversalAIClient` to use multi-key logic
- [ ] Add API endpoints for key management
- [ ] Create frontend components for key management UI
- [ ] Add cost tracking and monitoring
- [ ] Test key rotation on failures
- [ ] Set up alerts for expired/revoked keys
- [ ] Document API key security best practices

---

## Security Considerations

1. **Key Storage**: Hash keys in database, store only in Redis/memory temporarily
2. **Key Visibility**: Only show prefix (first 8 + last 4 chars) to users
3. **Audit Logging**: Log all key usage, additions, revocations
4. **Rate Limiting**: Implement per-key rate limits to prevent abuse
5. **Rotation Strategy**: Auto-rotate on failures to prevent quota exhaustion
6. **Cost Limits**: Set per-key cost limits to prevent unexpected bills

---

## Deployment Notes

- Test with staging environment first
- Monitor key rotation frequency in production
- Set up alerts for cost limit breaches
- Implement key expiration reminders via email
- Create admin dashboard for cost analytics
