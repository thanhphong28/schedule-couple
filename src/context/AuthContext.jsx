import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { showToast } from '../components/shared/Toast.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sc_user') || 'null');
    } catch {
      return null;
    }
  });
  const [couple, setCouple] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sc_couple') || 'null');
    } catch {
      return null;
    }
  });
  const [partner, setPartner] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sc_partner') || 'null');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('sc_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('sc_user');
      }
      if (couple) {
        localStorage.setItem('sc_couple', JSON.stringify(couple));
      } else {
        localStorage.removeItem('sc_couple');
      }
      if (partner) {
        localStorage.setItem('sc_partner', JSON.stringify(partner));
      } else {
        localStorage.removeItem('sc_partner');
      }
    } catch (err) {
      console.warn('localStorage full:', err);
    }
  }, [user, couple, partner]);

  const refreshAuth = async () => {
    if (!user?.id) return;
    try {
      // Fetch latest user data
      const { data: freshUser, error: userErr } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (userErr || !freshUser) return logout();
      
      setUser(freshUser);

      if (freshUser.couple_id) {
        const { data: coupleData } = await supabase.from('couples').select('*').eq('id', freshUser.couple_id).single();
        if (coupleData) {
          setCouple(coupleData);
          const partnerId = coupleData.partner1_id === freshUser.id ? coupleData.partner2_id : coupleData.partner1_id;
          if (partnerId) {
            const { data: partnerData } = await supabase.from('users').select('*').eq('id', partnerId).single();
            if (partnerData) setPartner(partnerData);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setIsLoading(false);
    refreshAuth(); // Auto sync on load
  }, []);

  // Real-time listener for connection
  useEffect(() => {
    if (user && !couple) {
      const channel = supabase.channel('user-couple-sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload) => {
           if (payload.new.couple_id && !user.couple_id) {
              refreshAuth();
              window.dispatchEvent(new CustomEvent('show-celebration'));
           }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invitations', filter: `receiver_username=eq.${user.username}` }, (payload) => {
           showToast('💌 Nửa kia vừa gửi lời mời kết nối kìa!', 'success');
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invitations', filter: `sender_id=eq.${user.id}` }, (payload) => {
           if (payload.new.status === 'ACCEPTED') {
              showToast('🎉 Người ấy đã đồng ý kết nối! Giao diện mới đã được mở khóa.', 'success');
           }
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [user, couple]);

  const login = async (username, password) => {
    if (!isSupabaseReady) throw new Error("Chưa kết nối CSDL");
    
    // Tìm user
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password);
      
    if (error) throw new Error(error.message);
    if (!users || users.length === 0) throw new Error("Tài khoản hoặc mật khẩu không đúng.");

    const loggedInUser = users[0];
    setUser(loggedInUser);

    // Tìm couple (nếu đã kết nối)
    // Người dùng chỉ có couple_id nếu họ đã thực sự kết nối thông qua Tab3Profile
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .eq('id', loggedInUser.couple_id)
      .single();
      
    if (!coupleError && coupleData) {
      setCouple(coupleData);

      // Tìm partner
      const partnerId = coupleData.partner1_id === loggedInUser.id 
        ? coupleData.partner2_id 
        : coupleData.partner1_id;

      if (partnerId) {
        const { data: partnerData } = await supabase
          .from('users')
          .select('*')
          .eq('id', partnerId)
          .single();
        if (partnerData) {
          setPartner(partnerData);
        }
      }
    }
    
    return true;
  };

  const register = async ({ username, password, full_name, dob, display_name, gender, love_code }) => {
    if (!isSupabaseReady) throw new Error("Chưa kết nối CSDL");
    
    // 1. Kiểm tra tài khoản tồn tại chưa
    const { data: existingUser } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
    if (existingUser) {
      throw new Error("Tên đăng nhập đã tồn tại!");
    }

    // 2. Tạo user mới với tình trạng chưa có couple_id
    const { data: newUser, error: userError } = await supabase.from('users').insert([{
      username,
      password,
      full_name,
      dob,
      display_name,
      gender,
      love_code
    }]).select().single();

    if (userError) throw new Error("Lỗi tạo tài khoản: " + userError.message);
    
    return true;
  };

  const logout = () => {
    setUser(null);
    setCouple(null);
    setPartner(null);
  };

  return (
    <AuthContext.Provider value={{ user, couple, partner, login, register, logout, isLoading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
