// External packages
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { useState } from "react";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const useSupabase = () => {
  const updateBookWithTies = async (
    bookId: string, 
    tiedBookIds: string[], 
    userId: string
  ) => {
    // First verify all tied books belong to the user
    const { data: tiedBooks, error: verifyError } = await supabase
      .from('user_books')
      .select('book_id')
      .in('book_id', tiedBookIds)
      .eq('user_id', userId);

    if (verifyError) throw verifyError;

    // If not all books belong to user, throw error
    if (tiedBooks?.length !== tiedBookIds.length) {
      throw new Error('Cannot tie books that don\'t belong to you');
    }

    // If verification passes, proceed with update
    return await supabase
      .from('user_books')
      .update({ tied_book_ids: tiedBookIds })
      .eq('book_id', bookId)
      .eq('user_id', userId);
  };

  return {
    supabase,
    updateBookWithTies,
  };
};
