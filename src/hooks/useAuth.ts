import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
          router.push('/admin/login');
          return;
        }
      } catch {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);
}