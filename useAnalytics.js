// useAnalytics.js
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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Get current profile
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      // If no profile exists, create one
      if (!profile) {
        const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, streak_count: 1, last_active_date: today }]).select().single();
        profile = newProfile;
      }

      // Check dates
      if (profile.last_active_date !== today) {
        const lastDate = new Date(profile.last_active_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        let newStreak = profile.streak_count;

        if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          // Continuous streak
          newStreak += 1;
        } else {
          // Broken streak
          newStreak = 1;
        }

        // Update DB
        await supabase.from('profiles').update({ streak_count: newStreak, last_active_date: today }).eq('id', userId);
        setStreak(newStreak);
      } else {
        setStreak(profile.streak_count);
      }
    };

    updateStreak();
  }, []);

  // 2. EVENT LOGGER FUNCTION
  const logEvent = async (eventType, details = {}, bookId = null) => {
    await supabase.from('analytics_logs').insert([{
      event_type: eventType,
      details: JSON.stringify(details),
      book_id: bookId
    }]);
  };

  return { streak, logEvent };
}