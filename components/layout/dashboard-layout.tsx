'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare,
  BarChart3,
  Key,
  CreditCard,
  Settings,
  Menu,
  LogOut,
  User,
  HelpCircle,
  Bell,
  Moon,
  Sun,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') || undefined;
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading: userLoading, signOut } = useAuth();
  const [notifications] = useState([
    {
      id: 1,
      title: 'New feature available',
      message: 'Advanced analytics dashboard is now live',
      time: '2 minutes ago',
      read: false,
      type: 'info'
    },
    {
      id: 2,
      title: 'Usage alert',
      message: 'You\'ve used 80% of your monthly requests',
      time: '1 hour ago',
      read: false,
      type: 'warning'
    }
  ]);

  const navigation = [
    {
      name: 'Chat',
      href: '/dashboard/chat',
      key: 'chat',
      icon: MessageSquare,
      current: pathname === '/dashboard/chat' || pathname === '/dashboard'
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      key: 'analytics',
      icon: BarChart3,
      current: pathname === '/dashboard/analytics'
    },
    {
      name: 'API Keys',
      href: '/dashboard/api',
      key: 'api',
      icon: Key,
      current: pathname === '/dashboard/api'
    },
    {
      name: 'Billing',
      href: '/dashboard/billing',
      key: 'billing',
      icon: CreditCard,
      current: pathname === '/dashboard/billing'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const NavLinks = () => (
    <nav className="space-y-2">
      {navigation.map((item) => (
        <button
          key={item.name}
          onClick={() => {
            setIsMobileMenuOpen(false);
            router.push(item.href);
          }}
          className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            item.current
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.name}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <Link href="/dashboard/chat" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Image
                  src="/neural.png"
                  alt="Neural Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-xl">GlauberAI</span>
            </Link>
          </div>
          
                <NavLinks />

          <div className="mt-auto">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">All systems operational</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Response time: 95ms
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full">
            <div className="flex h-16 items-center px-6 border-b">
              <Link href="/dashboard/chat" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Image
                    src="/neural.png"
                    alt="Neural Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="font-bold text-lg">GlauberAI</span>
              </Link>
            </div>
            <div className="flex-1 px-6 py-6">
              <NavLinks />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center justify-between">
              {/* Left side - can add search or breadcrumbs here */}
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="lg:hidden">
                  Free Plan
                </Badge>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-4 w-4" />
                      {notifications.filter(n => !n.read).length > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">{notifications.filter(n => !n.read).length}</span>
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center justify-between">
                        <span>Notifications</span>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                          Mark all read
                        </Button>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((notification) => (
                          <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 space-y-1">
                            <div className="flex items-center space-x-2 w-full">
                              {notification.type === 'warning' ? (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{notification.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">{notification.time}</p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-center">
                      View all notifications
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/01.png" alt="@user" />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        {userLoading ? (
                          <div className="animate-pulse h-4 w-24 bg-muted rounded" />
                        ) : user ? (
                          <>
                            <p className="text-sm font-medium leading-none">{user.fullName || user.email}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not signed in</p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/support" className="flex items-center space-x-2">
                        <HelpCircle className="h-4 w-4" />
                        <span>Support</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
