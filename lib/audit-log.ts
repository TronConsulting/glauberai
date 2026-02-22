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

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.redactSensitiveData(item));
    }

    // Handle objects
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
