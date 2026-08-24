import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://qhiwtxknsvhybskqqkaw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaXd0eGtuc3ZoeWJza3Fxa2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDU1NzgsImV4cCI6MjA5MTQyMTU3OH0.WHEOYxBxi1whlmqXt_WXmtTRcr_EdDikYU85avof2Ik';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
