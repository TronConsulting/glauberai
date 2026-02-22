# Production-Ready ChatGPT-Style Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform GlauberAI into a production-ready ChatGPT-style platform with enterprise security, streaming responses, and exceptional UX.

**Architecture:** Four-phase incremental evolution - (1) Database + Security foundation, (2) ChatGPT UI with streaming, (3) Enhanced dashboard, (4) Production polish. Each phase ships independently.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Redis (Upstash), Server-Sent Events, Tailwind CSS, Shadcn UI

---

## Phase 1: Foundation (Database + Security Core)

### Task 1: Update Prisma Schema with New Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Conversation model to schema**

```prisma
model Conversation {
  id         String    @id @default(uuid())
  userId     String
  title      String?
  model      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  archivedAt DateTime?

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages   Message[]

  @@index([userId, createdAt])
  @@index([userId, archivedAt])
}
```

**Step 2: Add Message model to schema**

```prisma
model Message {
  id             String   @id @default(uuid())
  conversationId String
  role           String
  content        String   @db.Text
  model          String?
  tokens         Int      @default(0)
  cost           Float    @default(0)
  attachments    Json?
  metadata       Json?
  createdAt      DateTime @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}
```

**Step 3: Add Session model to schema**

```prisma
model Session {
  id           String   @id @default(uuid())
  userId       String
  token        String   @unique
  ipAddress    String
  userAgent    String
  expiresAt    DateTime
  lastActivity DateTime @updatedAt
  createdAt    DateTime @default(now())

  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
}
```

**Step 4: Add AuditLog model to schema**

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  sessionId  String?
  action     String
  resource   String?
  resourceId String?
  ipAddress  String
  userAgent  String
  location   Json?
  metadata   Json?
  changes    Json?
  status     String
  severity   String
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action, status, createdAt])
  @@index([severity, createdAt])
  @@index([ipAddress, createdAt])
}
```

**Step 5: Add ApiKey model to schema**

```prisma
model ApiKey {
  id         String    @id @default(uuid())
  userId     String
  name       String
  keyHash    String    @unique
  prefix     String
  scopes     String[]
  rateLimit  Int?
  expiresAt  DateTime?
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
  revokedAt  DateTime?

  user       User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([keyHash])
}
```

**Step 6: Enhance User model with security fields**

Add to existing User model:

```prisma
model User {
  // ... existing fields ...

  // Security enhancements
  twoFactorEnabled  Boolean   @default(false)
  twoFactorSecret   String?
  backupCodes       String[]  @default([])
  trustedDevices    Json?
  lastLoginAt       DateTime?
  lastLoginIp       String?
  failedLoginCount  Int       @default(0)
  lockedUntil       DateTime?

  // New relations
  sessions          Session[]
  conversations     Conversation[]
  apiKeys           ApiKey[]
}
```

**Step 7: Generate Prisma migration**

Run: `npx prisma migrate dev --name add-conversation-security-models`
Expected: Migration created and applied successfully

**Step 8: Generate Prisma Client**

Run: `npx prisma generate`
Expected: Client generated successfully

**Step 9: Commit database schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add Conversation, Message, Session, AuditLog, ApiKey models

- Add conversation and message models for ChatGPT-style chat
- Add session tracking for enhanced security
- Add audit logging for compliance
- Add API key management
- Enhance User model with 2FA and security fields"
```

---

### Task 2: Create Rate Limiting Service

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/redis.ts`

**Step 1: Create Redis client utility**

File: `lib/redis.ts`

```typescript
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export const getRedis = () => {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('Redis not configured, using in-memory fallback');
      return null;
    }

    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
};

// In-memory fallback for development
class InMemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, options?: { ex?: number; px?: number }) {
    const expiry = Date.now() + (options?.ex ? options.ex * 1000 : options?.px || 3600000);
    this.cache.set(key, { value, expiry });
  }

  async incr(key: string) {
    const current = await this.get(key);
    const newValue = (parseInt(current) || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number) {
    const item = this.cache.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
    }
  }
}

const inMemoryCache = new InMemoryCache();

export const getCacheClient = () => {
  const redis = getRedis();
  return redis || inMemoryCache;
};
```

**Step 2: Create rate limit service**

File: `lib/rate-limit.ts`

```typescript
import { getCacheClient } from './redis';

export interface RateLimitConfig {
  requests: number;
  window: string; // '1m', '1h', '1d'
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

const parseWindow = (window: string): number => {
  const unit = window.slice(-1);
  const value = parseInt(window.slice(0, -1));

  const multipliers: Record<string, number> = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400,
  };

  return value * (multipliers[unit] || 60);
};

export class RateLimiter {
  private cache = getCacheClient();

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const windowSeconds = parseWindow(config.window);
    const key = `ratelimit:${identifier}:${config.window}`;

    try {
      const current = await this.cache.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= config.requests) {
        const ttl = windowSeconds;
        return {
          allowed: false,
          remaining: 0,
          limit: config.requests,
          resetAt: new Date(Date.now() + ttl * 1000),
        };
      }

      const newCount = await this.cache.incr(key);

      if (newCount === 1) {
        await this.cache.expire(key, windowSeconds);
      }

      return {
        allowed: true,
        remaining: Math.max(0, config.requests - newCount),
        limit: config.requests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open for availability
      return {
        allowed: true,
        remaining: config.requests,
        limit: config.requests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  }

  async resetLimit(identifier: string, window: string): Promise<void> {
    const key = `ratelimit:${identifier}:${window}`;
    await this.cache.set(key, 0);
  }
}

export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  // Global IP-based
  GLOBAL_UNAUTHENTICATED: { requests: 50, window: '1h' },
  GLOBAL_AUTHENTICATED: { requests: 2000, window: '1h' },

  // Endpoint-specific
  LOGIN: { requests: 5, window: '15m' },
  SIGNUP: { requests: 3, window: '1h' },
  FORGOT_PASSWORD: { requests: 3, window: '1h' },

  // User-based (by plan)
  STARTER_MESSAGES: { requests: 50, window: '1h' },
  STARTER_DAILY: { requests: 200, window: '1d' },

  PROFESSIONAL_MESSAGES: { requests: 500, window: '1h' },
  PROFESSIONAL_DAILY: { requests: 2000, window: '1d' },
} as const;
```

**Step 3: Install Upstash Redis package**

Run: `npm install @upstash/redis`
Expected: Package installed successfully

**Step 4: Add environment variables**

Add to `.env.example`:

```env
# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Step 5: Commit rate limiting service**

```bash
git add lib/rate-limit.ts lib/redis.ts .env.example package.json package-lock.json
git commit -m "feat(security): add rate limiting service with Redis

- Create Redis client with in-memory fallback
- Implement sliding window rate limiter
- Define rate limits for different endpoints and user plans
- Support for Upstash Redis"
```

---

### Task 3: Create Audit Logging Service

**Files:**
- Create: `lib/audit-log.ts`

**Step 1: Create audit log service**

File: `lib/audit-log.ts`

```typescript
import { prisma } from './prisma';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.failed_login'
  | 'auth.password_change'
  | 'auth.2fa_enabled'
  | 'auth.2fa_disabled'
  | 'query.create'
  | 'conversation.create'
  | 'conversation.update'
  | 'conversation.delete'
  | 'message.create'
  | 'file.upload'
  | 'file.delete'
  | 'payment.success'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'settings.updated'
  | 'security.rate_limit_exceeded'
  | 'security.suspicious_activity'
  | 'security.blocked_request';

export type AuditStatus = 'success' | 'failure' | 'blocked' | 'flagged';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogData {
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  metadata?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
  status: AuditStatus;
  severity?: AuditSeverity;
}

class AuditLogger {
  async log(data: AuditLogData): Promise<void> {
    try {
      // Redact sensitive information
      const sanitizedMetadata = this.redactSensitiveData(data.metadata);
      const sanitizedChanges = data.changes
        ? {
            before: this.redactSensitiveData(data.changes.before),
            after: this.redactSensitiveData(data.changes.after),
          }
        : undefined;

      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          location: data.location as any,
          metadata: sanitizedMetadata as any,
          changes: sanitizedChanges as any,
          status: data.status,
          severity: data.severity || this.getSeverity(data.action, data.status),
        },
      });
    } catch (error) {
      // Never let audit logging break the application
      console.error('Failed to write audit log:', error);
    }
  }

  private getSeverity(action: AuditAction, status: AuditStatus): AuditSeverity {
    // Critical events
    if (action.startsWith('security.') || status === 'blocked') {
      return 'critical';
    }

    // Failed authentication
    if (action === 'auth.failed_login' && status === 'failure') {
      return 'warning';
    }

    // Payment failures
    if (action.startsWith('payment.') && status === 'failure') {
      return 'error';
    }

    // Default to info
    return 'info';
  }

  private redactSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'twoFactorSecret',
    ];

    if (typeof data === 'object') {
      const redacted = { ...data };

      for (const key in redacted) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
          redacted[key] = this.redactSensitiveData(redacted[key]);
        }
      }

      return redacted;
    }

    return data;
  }

  async getRecentLogs(
    userId: string,
    options?: {
      limit?: number;
      action?: AuditAction;
      severity?: AuditSeverity;
    }
  ) {
    return prisma.auditLog.findMany({
      where: {
        userId,
        action: options?.action,
        severity: options?.severity,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  async getSuspiciousActivity(
    options?: {
      since?: Date;
      ipAddress?: string;
    }
  ) {
    return prisma.auditLog.findMany({
      where: {
        OR: [
          { status: 'blocked' },
          { status: 'flagged' },
          { severity: 'critical' },
          { action: 'security.suspicious_activity' },
        ],
        createdAt: options?.since ? { gte: options.since } : undefined,
        ipAddress: options?.ipAddress,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

export const auditLogger = new AuditLogger();

// Helper to get IP address from request
export const getIpAddress = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIp || '0.0.0.0';
};

// Helper to get user agent
export const getUserAgent = (req: Request): string => {
  return req.headers.get('user-agent') || 'Unknown';
};
```

**Step 2: Commit audit logging service**

```bash
git add lib/audit-log.ts
git commit -m "feat(security): add audit logging service

- Comprehensive audit log types for all actions
- Automatic severity classification
- Sensitive data redaction
- Query helpers for recent logs and suspicious activity
- Request metadata extraction helpers"
```

---

### Task 4: Create Input Validation Service

**Files:**
- Create: `lib/validation.ts`

**Step 1: Create validation utilities**

File: `lib/validation.ts`

```typescript
import validator from 'validator';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateQuery = (input: string, userPlan: string): string => {
  // Length limits based on plan
  const maxLength = userPlan === 'ENTERPRISE' ? 50000 : 10000;

  if (!input || typeof input !== 'string') {
    throw new ValidationError('Query must be a non-empty string');
  }

  if (input.length > maxLength) {
    throw new ValidationError(
      `Query exceeds maximum length of ${maxLength} characters`,
      'query'
    );
  }

  // Check for control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(input)) {
    throw new ValidationError('Query contains invalid control characters', 'query');
  }

  // Detect potential prompt injection (log but don't block)
  const suspiciousPatterns = [
    /ignore\s+(previous|all)\s+instructions?/i,
    /you\s+are\s+now\s+(a|an)/i,
    /system\s+prompt/i,
    /\bDAN\b.*\bmode\b/i,
    /roleplay\s+as/i,
  ];

  const hasSuspiciousPattern = suspiciousPatterns.some(p => p.test(input));
  if (hasSuspiciousPattern) {
    console.warn('Potential prompt injection detected:', input.slice(0, 100));
  }

  // Basic XSS sanitization
  const sanitized = validator.escape(input);

  return sanitized;
};

export const validateEmail = (email: string): string => {
  if (!validator.isEmail(email)) {
    throw new ValidationError('Invalid email address', 'email');
  }

  return validator.normalizeEmail(email) || email;
};

export const validatePassword = (password: string): void => {
  if (password.length < 12) {
    throw new ValidationError(
      'Password must be at least 12 characters long',
      'password'
    );
  }

  // Check complexity
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const complexityCount = [hasLowerCase, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;

  if (complexityCount < 3) {
    throw new ValidationError(
      'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters',
      'password'
    );
  }
};

export const validateFileUpload = (
  file: File,
  userPlan: string
): void => {
  // Size limits by plan
  const maxSizes: Record<string, number> = {
    STARTER: 10 * 1024 * 1024,      // 10MB
    PROFESSIONAL: 50 * 1024 * 1024,  // 50MB
    ENTERPRISE: 100 * 1024 * 1024,   // 100MB
  };

  const maxSize = maxSizes[userPlan] || maxSizes.STARTER;

  if (file.size > maxSize) {
    throw new ValidationError(
      `File size exceeds maximum of ${maxSize / 1024 / 1024}MB for ${userPlan} plan`,
      'file'
    );
  }

  // Whitelist MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `File type ${file.type} is not allowed`,
      'file'
    );
  }

  // Validate filename
  const filename = file.name;
  if (filename.length > 255) {
    throw new ValidationError('Filename too long', 'file');
  }

  // Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ValidationError('Invalid filename', 'file');
  }
};

export const sanitizeFilename = (filename: string): string => {
  // Remove any path components
  const basename = filename.split('/').pop()?.split('\\').pop() || 'file';

  // Remove special characters except dots, hyphens, underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return sanitized;
};

export const validateConversationTitle = (title: string): string => {
  if (title.length > 200) {
    throw new ValidationError('Title exceeds maximum length of 200 characters', 'title');
  }

  return validator.escape(title.trim());
};
```

**Step 2: Install validator package**

Run: `npm install validator && npm install -D @types/validator`
Expected: Package installed successfully

**Step 3: Commit validation service**

```bash
git add lib/validation.ts package.json package-lock.json
git commit -m "feat(security): add input validation service

- Query validation with length limits by plan
- Prompt injection detection
- Email and password validation
- File upload validation with MIME type whitelist
- Filename sanitization
- XSS protection"
```

---

### Task 5: Create Enhanced Authentication Middleware

**Files:**
- Create: `lib/auth-enhanced.ts`
- Modify: `lib/auth.ts`

**Step 1: Create enhanced auth utilities**

File: `lib/auth-enhanced.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, getAuthCookie } from './auth';
import { prisma } from './prisma';
import { auditLogger, getIpAddress, getUserAgent } from './audit-log';
import { rateLimiter, RATE_LIMITS } from './rate-limit';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    plan: string;
  };
  session: {
    id: string;
    ipAddress: string;
    userAgent: string;
  };
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const authenticateRequest = async (
  req: NextRequest
): Promise<AuthContext> => {
  const token = await getAuthCookie();

  if (!token) {
    throw new AuthenticationError('Not authenticated');
  }

  const decoded = await verifyJwt(token);

  if (!decoded || typeof decoded === 'string') {
    throw new AuthenticationError('Invalid token');
  }

  const userId = typeof decoded === 'object' && 'id' in decoded
    ? String(decoded.id)
    : null;

  if (!userId) {
    throw new AuthenticationError('Invalid token payload');
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      plan: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('User not found', 404);
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthenticationError(
      `Account locked until ${user.lockedUntil.toISOString()}`,
      403
    );
  }

  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);

  // Verify or create session
  const session = await prisma.session.findFirst({
    where: {
      userId: user.id,
      token,
      expiresAt: { gte: new Date() },
    },
  });

  if (!session) {
    // Create new session
    const newSession = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
      },
      session: {
        id: newSession.id,
        ipAddress,
        userAgent,
      },
    };
  }

  // Update last activity
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivity: new Date() },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
    },
    session: {
      id: session.id,
      ipAddress,
      userAgent,
    },
  };
};

export const requireAuth = (
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
) => {
  return async (req: NextRequest) => {
    try {
      const ctx = await authenticateRequest(req);
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
};

export const withRateLimit = (
  config: { requests: number; window: string },
  getIdentifier: (req: NextRequest, ctx?: AuthContext) => string
) => {
  return (
    handler: (req: NextRequest, ctx?: AuthContext) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest, ctx?: AuthContext) => {
      const identifier = getIdentifier(req, ctx);
      const result = await rateLimiter.checkLimit(identifier, config);

      if (!result.allowed) {
        const ipAddress = getIpAddress(req);
        const userAgent = getUserAgent(req);

        // Log rate limit violation
        await auditLogger.log({
          userId: ctx?.user.id,
          action: 'security.rate_limit_exceeded',
          ipAddress,
          userAgent,
          status: 'blocked',
          severity: 'warning',
          metadata: {
            identifier,
            limit: result.limit,
            resetAt: result.resetAt,
          },
        });

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            limit: result.limit,
            resetAt: result.resetAt,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': result.resetAt.toISOString(),
              'Retry-After': Math.ceil(
                (result.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }

      const response = await handler(req, ctx);

      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

      return response;
    };
  };
};
```

**Step 2: Commit enhanced authentication**

```bash
git add lib/auth-enhanced.ts
git commit -m "feat(security): add enhanced authentication middleware

- Session-based authentication with tracking
- Account lockout support
- Rate limiting middleware
- Audit logging integration
- Request context with user and session info"
```

---

### Task 6: Update Sign-in Endpoint with Security Features

**Files:**
- Modify: `app/api/auth/signin/route.ts`

**Step 1: Update signin route with enhanced security**

Replace contents of `app/api/auth/signin/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createJwt, setAuthCookie } from '@/lib/auth';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { validateEmail } from '@/lib/validation';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);

  // Rate limit by IP
  const rateLimitResult = await rateLimiter.checkLimit(
    `login:${ipAddress}`,
    RATE_LIMITS.LOGIN
  );

  if (!rateLimitResult.allowed) {
    await auditLogger.log({
      action: 'security.rate_limit_exceeded',
      resource: 'signin',
      ipAddress,
      userAgent,
      status: 'blocked',
      severity: 'warning',
    });

    return NextResponse.json(
      {
        error: 'Too many login attempts. Please try again later.',
        resetAt: rateLimitResult.resetAt,
      },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const validatedEmail = validateEmail(email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        plan: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      await auditLogger.log({
        action: 'auth.failed_login',
        resource: 'user',
        ipAddress,
        userAgent,
        status: 'failure',
        metadata: { email: validatedEmail, reason: 'user_not_found' },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await auditLogger.log({
        userId: user.id,
        action: 'auth.failed_login',
        resource: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
        status: 'blocked',
        metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil },
      });

      return NextResponse.json(
        {
          error: `Account locked until ${user.lockedUntil.toISOString()}. Please try again later.`,
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login count
      const newFailedCount = user.failedLoginCount + 1;
      const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newFailedCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION)
            : null,
        },
      });

      await auditLogger.log({
        userId: user.id,
        action: 'auth.failed_login',
        resource: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
        status: 'failure',
        metadata: {
          reason: 'invalid_password',
          failedAttempts: newFailedCount,
          accountLocked: shouldLock,
        },
      });

      if (shouldLock) {
        return NextResponse.json(
          {
            error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION / 60000} minutes.`,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Reset failed login count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Create JWT token
    const token = await createJwt({
      id: user.id,
      email: user.email,
      plan: user.plan,
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set auth cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
      },
    });

    await setAuthCookie(response, token);

    // Log successful login
    await auditLogger.log({
      userId: user.id,
      sessionId: session.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    await auditLogger.log({
      action: 'auth.failed_login',
      ipAddress,
      userAgent,
      status: 'failure',
      severity: 'error',
      metadata: { error: error instanceof Error ? error.message : 'Unknown' },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit enhanced signin endpoint**

```bash
git add app/api/auth/signin/route.ts
git commit -m "feat(security): enhance signin with advanced security

- Rate limiting by IP address
- Account lockout after 5 failed attempts
- Comprehensive audit logging
- Session tracking
- Failed login attempt tracking
- Secure error messages (no user enumeration)"
```

---

## Phase 2: ChatGPT-Style UI with Streaming

### Task 7: Create Conversation API Endpoints

**Files:**
- Create: `app/api/conversations/route.ts`
- Create: `app/api/conversations/[id]/route.ts`

**Step 1: Create conversations list endpoint**

File: `app/api/conversations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-enhanced';
import { prisma } from '@/lib/prisma';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';

export const GET = requireAuth(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: ctx.user.id,
        archivedAt: null,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                {
                  messages: {
                    some: {
                      content: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
            role: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (req, ctx) => {
  try {
    const { title, model } = await req.json();

    const conversation = await prisma.conversation.create({
      data: {
        userId: ctx.user.id,
        title: title || 'New Chat',
        model,
      },
    });

    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    await auditLogger.log({
      userId: ctx.user.id,
      sessionId: ctx.session.id,
      action: 'conversation.create',
      resource: 'conversation',
      resourceId: conversation.id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
});
```

**Step 2: Create conversation detail endpoint**

File: `app/api/conversations/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-enhanced';
import { prisma } from '@/lib/prisma';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { validateConversationTitle } from '@/lib/validation';

export const GET = requireAuth(async (req, ctx) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: ctx.user.id,
        archivedAt: null,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
});

export const PATCH = requireAuth(async (req, ctx) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    const { title, model } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: ctx.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const validatedTitle = title ? validateConversationTitle(title) : undefined;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        title: validatedTitle,
        model,
      },
    });

    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    await auditLogger.log({
      userId: ctx.user.id,
      sessionId: ctx.session.id,
      action: 'conversation.update',
      resource: 'conversation',
      resourceId: id,
      ipAddress,
      userAgent,
      status: 'success',
      changes: {
        before: { title: existing.title, model: existing.model },
        after: { title: conversation.title, model: conversation.model },
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (req, ctx) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: ctx.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.conversation.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    await auditLogger.log({
      userId: ctx.user.id,
      sessionId: ctx.session.id,
      action: 'conversation.delete',
      resource: 'conversation',
      resourceId: id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json({ message: 'Conversation archived' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
});
```

**Step 3: Commit conversation API endpoints**

```bash
git add app/api/conversations/
git commit -m "feat(api): add conversation management endpoints

- GET /api/conversations - list with search and pagination
- POST /api/conversations - create new conversation
- GET /api/conversations/:id - get conversation with messages
- PATCH /api/conversations/:id - update title/model
- DELETE /api/conversations/:id - archive conversation
- Full authentication and audit logging"
```

---

### Task 8: Create Streaming Chat Endpoint

**Files:**
- Create: `app/api/chat/stream/route.ts`
- Create: `lib/streaming.ts`

**Step 1: Create streaming utilities**

File: `lib/streaming.ts`

```typescript
export type StreamEvent =
  | { type: 'metadata'; model: string; provider: string }
  | { type: 'token'; content: string }
  | { type: 'complete'; messageId: string; tokens: number; cost: number }
  | { type: 'error'; message: string };

export const createSSEMessage = (event: StreamEvent): string => {
  return `data: ${JSON.stringify(event)}\n\n`;
};

export const createStreamResponse = (
  stream: ReadableStream
): Response => {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
```

**Step 2: Create streaming chat endpoint**

File: `app/api/chat/stream/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-enhanced';
import { prisma } from '@/lib/prisma';
import { aiRouter } from '@/lib/ai-router';
import { auditLogger, getIpAddress, getUserAgent } from '@/lib/audit-log';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { validateQuery } from '@/lib/validation';
import { createSSEMessage, createStreamResponse } from '@/lib/streaming';
import { aiClient } from '@/lib/ai-client';

const MAX_COMPLETION_TOKENS = 500;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // Authenticate user
    const ctx = await authenticateRequest(req);
    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);

    // Check rate limit
    const rateLimit = ctx.user.plan === 'STARTER'
      ? RATE_LIMITS.STARTER_MESSAGES
      : ctx.user.plan === 'PROFESSIONAL'
      ? RATE_LIMITS.PROFESSIONAL_MESSAGES
      : { requests: -1, window: '1h' };

    if (rateLimit.requests !== -1) {
      const rateLimitResult = await rateLimiter.checkLimit(
        `messages:${ctx.user.id}`,
        rateLimit
      );

      if (!rateLimitResult.allowed) {
        return new Response(
          encoder.encode(
            createSSEMessage({
              type: 'error',
              message: 'Rate limit exceeded. Please upgrade your plan.',
            })
          ),
          {
            status: 429,
            headers: { 'Content-Type': 'text/event-stream' },
          }
        );
      }
    }

    const { conversationId, message, files } = await req.json();

    if (!conversationId || !message) {
      return new Response(
        encoder.encode(
          createSSEMessage({
            type: 'error',
            message: 'Conversation ID and message are required',
          })
        ),
        {
          status: 400,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    // Validate conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: ctx.user.id,
        archivedAt: null,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) {
      return new Response(
        encoder.encode(
          createSSEMessage({
            type: 'error',
            message: 'Conversation not found',
          })
        ),
        {
          status: 404,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );
    }

    // Validate message content
    const validatedMessage = validateQuery(message, ctx.user.plan);

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: validatedMessage,
        attachments: files || null,
      },
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Build context from recent messages
          const context = conversation.messages
            .reverse()
            .map((msg) => `${msg.role}: ${msg.content.slice(0, 200)}`)
            .join('\n\n');

          const enhancedMessage = context
            ? `Previous context:\n${context}\n\nCurrent message:\n${validatedMessage}`
            : validatedMessage;

          // Route to appropriate model
          const routing = await aiRouter.routeQuery(enhancedMessage);

          // Send metadata event
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'metadata',
                model: routing.selectedModel.name,
                provider: routing.selectedModel.provider,
              })
            )
          );

          let fullContent = '';
          let tokenCount = 0;

          // Stream from AI model
          await aiClient.streamModel(
            routing.selectedModel,
            enhancedMessage,
            {
              maxTokens: MAX_COMPLETION_TOKENS,
              onToken: (token: string) => {
                fullContent += token;
                tokenCount++;

                // Send token event
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'token',
                      content: token,
                    })
                  )
                );
              },
              onComplete: async () => {
                // Calculate cost
                const cost = (tokenCount / 1000) * routing.selectedModel.costPer1kTokens;

                // Save assistant message
                const assistantMessage = await prisma.message.create({
                  data: {
                    conversationId,
                    role: 'assistant',
                    content: fullContent,
                    model: routing.selectedModel.name,
                    tokens: tokenCount,
                    cost,
                    metadata: {
                      routing: routing.reasoning,
                      confidence: routing.confidence,
                    } as any,
                  },
                });

                // Also create Request record for analytics
                await prisma.request.create({
                  data: {
                    userId: ctx.user.id,
                    query: validatedMessage,
                    model: routing.selectedModel.name,
                    tokens: tokenCount,
                    cost,
                    status: 'completed',
                    response: fullContent,
                  },
                });

                // Update conversation timestamp and title
                if (!conversation.title || conversation.title === 'New Chat') {
                  const title = validatedMessage.slice(0, 50) + (validatedMessage.length > 50 ? '...' : '');
                  await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { title, updatedAt: new Date() },
                  });
                } else {
                  await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                  });
                }

                // Send completion event
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'complete',
                      messageId: assistantMessage.id,
                      tokens: tokenCount,
                      cost,
                    })
                  )
                );

                // Log audit
                await auditLogger.log({
                  userId: ctx.user.id,
                  sessionId: ctx.session.id,
                  action: 'message.create',
                  resource: 'message',
                  resourceId: assistantMessage.id,
                  ipAddress,
                  userAgent,
                  status: 'success',
                  metadata: {
                    conversationId,
                    model: routing.selectedModel.name,
                    tokens: tokenCount,
                    cost,
                  },
                });

                controller.close();
              },
              onError: (error: Error) => {
                console.error('Streaming error:', error);

                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'error',
                      message: 'Failed to generate response. Please try again.',
                    })
                  )
                );

                controller.close();
              },
            }
          );
        } catch (error) {
          console.error('Stream initialization error:', error);

          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'error',
                message: 'Failed to initialize stream',
              })
            )
          );

          controller.close();
        }
      },
    });

    return createStreamResponse(stream);
  } catch (error) {
    console.error('Chat stream error:', error);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            createSSEMessage({
              type: 'error',
              message: error instanceof Error ? error.message : 'Internal server error',
            })
          )
        );
        controller.close();
      },
    });

    return createStreamResponse(stream);
  }
}
```

**Step 3: Add streaming support to AI client**

Modify `lib/ai-client.ts` to add `streamModel` method:

```typescript
// Add to AIClient class in lib/ai-client.ts

async streamModel(
  model: Model,
  query: string,
  options: {
    maxTokens?: number;
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  // This is a simplified example - actual implementation depends on provider
  try {
    const response = await this.callModel(model, query, {
      maxTokens: options.maxTokens,
      stream: true,
    });

    if (response.success && response.content) {
      // Simulate streaming for non-streaming providers
      const words = response.content.split(' ');
      for (const word of words) {
        options.onToken(word + ' ');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      options.onComplete();
    } else {
      options.onError(new Error(response.error || 'Streaming failed'));
    }
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
```

**Step 4: Commit streaming chat endpoint**

```bash
git add app/api/chat/stream/route.ts lib/streaming.ts lib/ai-client.ts
git commit -m "feat(api): add streaming chat endpoint with SSE

- Server-Sent Events for real-time streaming responses
- Token-by-token streaming to frontend
- Conversation context integration (last 10 messages)
- Rate limiting by user plan
- Automatic conversation title generation
- Full audit logging and analytics tracking"
```

---

### Remaining Phase 2 Tasks (Summary)

**Task 9-15: ChatGPT UI Components**
- Create `ChatInterface` component with 3-column layout
- Build `Sidebar` with conversation list and grouping
- Implement `MessageBubble` with markdown rendering
- Create `InputArea` with auto-resize and file upload
- Add `useStreamingChat` React hook for SSE consumption
- Implement conversation search and filtering
- Add keyboard shortcuts and accessibility features

**Task 16-20: Frontend Integration**
- Replace `/dashboard/query` page with new ChatGPT UI
- Add conversation routing (`/chat/:id`)
- Implement real-time message updates
- Add optimistic UI updates
- Error boundary and fallback UI

---

## Phase 3: Enhanced Dashboard & Analytics

**Task 21-25: Dashboard Homepage**
- Enhanced landing page with quick actions
- Recent conversations preview
- Usage stats visualization
- Onboarding checklist for new users
- Plan upgrade prompts

**Task 26-30: Analytics Dashboard**
- Token usage charts (Recharts)
- Cost breakdown by model
- Message volume trends
- Most used models table
- Export to CSV functionality

**Task 31-33: User Experience**
- Welcome modal for new users
- Interactive product tour
- Contextual help tooltips
- Model recommendation UI

---

## Phase 4: Production Polish & Advanced Features

**Task 34-38: Advanced Security**
- Content moderation integration
- Abuse detection automation
- Security monitoring dashboard
- Incident response automation
- GDPR compliance features (data export, deletion)

**Task 39-43: Performance Optimization**
- Virtual scrolling for long conversations
- Service worker for offline support
- Database query optimization
- Redis caching implementation
- CDN setup for static assets

**Task 44-48: AI Router Enhancements**
- Context-aware model selection
- Cost optimization mode
- Speed priority mode
- Model health monitoring
- Smart context pruning

**Task 49-53: Monitoring & Observability**
- Datadog/New Relic integration
- Sentry error tracking setup
- Custom metrics dashboards
- Alert configuration
- Uptime monitoring

**Task 54-56: Testing**
- Unit tests for security utilities
- Integration tests for API endpoints
- E2E tests with Playwright
- Performance testing with k6

**Task 57-60: Documentation & Deployment**
- API documentation
- User guides
- Admin documentation
- Production deployment checklist

---

## Execution Summary

**Total Estimated Tasks:** 60+ bite-sized tasks across 4 phases

**Phase Breakdown:**
- Phase 1 (Foundation): ~15 tasks - Database, Security, Authentication
- Phase 2 (ChatGPT UI): ~20 tasks - Streaming, UI Components, Frontend
- Phase 3 (Dashboard): ~13 tasks - Analytics, UX Enhancements
- Phase 4 (Polish): ~17 tasks - Security, Performance, Monitoring, Testing

**Key Dependencies:**
- Phase 1 must complete before Phase 2
- Phase 2 can overlap with Phase 3
- Phase 4 can be done incrementally alongside Phase 2-3

**Testing Strategy:**
- TDD approach for all new code
- Commit after each completed task
- Test in staging before production deployment

---

## Next Steps

This plan provides a comprehensive roadmap for transforming GlauberAI into a production-ready platform. The implementation should follow the incremental approach with:

1. **Phase 1** (2-3 weeks): Foundation and security
2. **Phase 2** (3-4 weeks): ChatGPT UI with streaming
3. **Phase 3** (1-2 weeks): Enhanced dashboard
4. **Phase 4** (2-3 weeks): Production polish

**Total Estimated Timeline:** 8-12 weeks for full implementation

Each task is designed to be 2-5 minutes of focused work, following TDD principles with frequent commits.
