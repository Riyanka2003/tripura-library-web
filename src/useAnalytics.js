import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useAnalytics() {
  const [streak, setStreak] = useState(0);

  // 1. AUTOMATIC STREAK CALCULATOR
  useEffect(() => {
    const updateStreak = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;
      const today = new Date().toISOString().split('T')[0];

      let { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (!profile) {
        const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, streak_count: 1, last_active_date: today }]).select().single();
        profile = newProfile;
      }

      if (profile.last_active_date !== today) {
        const lastDate = new Date(profile.last_active_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        let newStreak = profile.streak_count;
        // Check if consecutive day
        if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        await supabase.from('profiles').update({ streak_count: newStreak, last_active_date: today }).eq('id', userId);
        setStreak(newStreak);
      } else {
        setStreak(profile.streak_count);
      }
    };

    updateStreak();
  }, []);

  // 2. EVENT LOGGER (Crucial for your Charts)
  const logEvent = async (eventType, details = {}, bookId = null) => {
    try {
        await supabase.from('analytics_logs').insert([{
            event_type: eventType,
            details: JSON.stringify(details), // Stores Standard, Subject, Category
            book_id: bookId
        }]);
    } catch (e) {
        console.warn("Log failed:", e);
    }
  };

  return { streak, logEvent };
}