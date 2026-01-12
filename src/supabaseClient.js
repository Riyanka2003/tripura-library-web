import { createClient } from '@supabase/supabase-js';

// GO TO SUPABASE DASHBOARD -> SETTINGS (Gear Icon) -> API
// Copy "Project URL" and "anon public" Key
const supabaseUrl = 'https://ymszlvlzqcqsedvwbarz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltc3psdmx6cWNxc2VkdndiYXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTk2ODcsImV4cCI6MjA4MTYzNTY4N30.fWZNhDmSdftRH-wyR0F4gAx0oveTSP_uMn9nkOndTBo';

export const supabase = createClient(supabaseUrl, supabaseKey);