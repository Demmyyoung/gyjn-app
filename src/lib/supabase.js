import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://bwmeojuvxlufknwvlrbz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWVvanV2eGx1Zmtud3ZscmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mzc2MjgsImV4cCI6MjA5MDExMzYyOH0.E8h-ZNDVGGipPYOjwXJCf0SnPpwm3NxtR0N90EFePFA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
