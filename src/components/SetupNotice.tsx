import { AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function SetupNotice() {
  if (isSupabaseConfigured) return null;

  return (
    <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
        <div>
          <h2 className="font-semibold">Supabase environment missing</h2>
          <p className="mt-1 text-sm">
            Copy <code>.env.example</code> to <code>.env</code>, then add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> before using complaint submission or admin features.
          </p>
        </div>
      </div>
    </div>
  );
}
