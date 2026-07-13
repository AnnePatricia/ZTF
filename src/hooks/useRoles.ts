// src/hooks/useRoles.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ZtfUser } from '../types/ztf';

export function useRoles() {
  const [currentUser, setCurrentUser] = useState<ZtfUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: userData, error } = await supabase
            .from('ztf_users')
            .select('*')
            .eq('email', user.email)
            .single();

          if (error) {
            console.error('Erreur récupération utilisateur:', error);
          } else if (userData) {
            setCurrentUser(userData as ZtfUser);
          }
        }
      } catch (err) {
        console.error('Erreur useRoles:', err);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'admin' || role === 'administrateur';
  };

  const isChef = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef' || role.startsWith('chef_');
  };

  // ✅ Chef D5 spécifiquement
  const isChefD5 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d5' ||
      role === 'chef super correction' ||
      role === 'chef supercorrection' ||
      role === 'chef réécriture' ||
      role === 'chef reecriture' ||
      role === 'chef';
  };

  const isChefD2 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d2' || role === 'chef transcription' || role === 'chef';
  };

  const isChefD3 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d3' || role === 'chef nettoyage' || role === 'chef';
  };

  const isChefD4 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d4' || role === 'chef réécriture' || role === 'chef';
  };

  const isChefD6 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d6' || role === 'chef correction' || role === 'chef';
  };

  const isChefD7 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d7' || role === 'chef traduction' || role === 'chef';
  };

  const isChefD8 = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase() || '';
    return role === 'chef_d8' || role === 'chef bat' || role === 'chef';
  };

  return {
    currentUser,
    loading,
    isAdmin,
    isChef,
    isChefD2,
    isChefD3,
    isChefD4,
    isChefD5,
    isChefD6,
    isChefD7,
    isChefD8,
  };
}