import { ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut, User, CreditCard, LifeBuoy, BarChart3, Key, Settings } from 'lucide-react';
import { BrainCircuit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navLinks = [
  { href: '/dashboard/query', label: 'Query' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/models', label: 'Models' },
  { href: '/dashboard/api', label: 'API Keys' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/support', label: 'Support' },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const displayName = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (fullName) {
      return fullName;
    }

    const email = user?.email?.trim();
    if (email) {
      return email.split('@')[0] || email;
    }

    return 'User';
  }, [user?.fullName, user?.email]);

  const initials = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (fullName) {
      const tokens = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => name.charAt(0).toUpperCase())
        .join('');
      if (tokens) {
        return tokens;
      }
    }

    const email = user?.email?.trim();
    if (email && email.length > 0) {
      return email.charAt(0).toUpperCase();
    }

    return displayName.charAt(0).toUpperCase() || 'U';
  }, [displayName, user?.fullName, user?.email]);

  const planLabel = useMemo(() => {
    if (!user?.plan) {
      return 'Free';
    }
    return user.plan.charAt(0) + user.plan.slice(1).toLowerCase();
  }, [user?.plan]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between h-16 px-6 border-b bg-background/95">
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold">
            <BrainCircuit className="h-7 w-7 text-primary" />
            GlauberAI
          </Link>
          <nav className="ml-10 flex gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-base font-medium hover:text-primary transition',
                  pathname === link.href ? 'text-primary underline' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* User Dropdown */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 h-auto">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">{planLabel}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/support" className="flex items-center">
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 bg-muted/50">{children}</main>
    </div>
  );
} 
