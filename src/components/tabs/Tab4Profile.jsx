import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp, PRESET_WALLPAPERS } from '../../context/AppContext.jsx';
import { supabase } from '../../lib/supabase.js';
import { compressImage } from '../../lib/utils.js';
import { showToast } from '../shared/Toast.jsx';

import { LogOut, Palette, Link as LinkIcon, User, Camera } from 'lucide-react';

export default function Tab4Profile() {
  const { user, partner, logout, refreshAuth } = useAuth();
  const { 
    themeId, setThemeId,
    wallpaper, setWallpaper, 
    customWallpapers, addCustomWallpaper, deleteCustomWallpaper 
  } = useApp();
  
  const fileInputRef = useRef(null);
  const wpFileInputRef = useRef(null);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  // Pending Invites
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showAcceptModal, setShowAcceptModal] = useState(null);
  const [acceptCode, setAcceptCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Edit Profile
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.display_name || '');
  const [editGender, setEditGender] = useState(user?.gender || 'MALE');

  // Poll for invites
  useEffect(() => {
    if (!user || partner) return;
    
    const fetchInvites = async () => {
      const { data } = await supabase
        .from('invitations')
        .select(`*, sender:sender_id(display_name, gender, username)`)
        .eq('receiver_username', user.username)
        .eq('status', 'PENDING');
      
      if (data) setPendingInvites(data);
    };

    fetchInvites();
    
    const channel = supabase.channel('invitations-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `receiver_username=eq.${user.username}` }, fetchInvites)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [user, partner]);

  const handleSendInvite = async () => {
    if (!inviteUsername.trim() || !inviteCode.trim()) {
      return showToast('Nhập thiếu thông tin rồi người ơi! 🥺', 'error');
    }
    setLoading(true);
    try {
      // Create invitation
      const { error } = await supabase.from('invitations').insert({
        sender_id: user.id,
        receiver_username: inviteUsername.trim(),
        love_code: inviteCode.trim(),
        status: 'PENDING'
      });
      if (error) throw error;
      showToast('Thả thính thành công! Đợi người ta dính mồi nhé 🎣💕', 'success');
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
      showToast('Chưa tới duyên rồi, thử lại xem sao 🥺', 'error');
    }
    setLoading(false);
  };

  const handleAcceptInvite = async (invite) => {
    if (acceptCode !== invite.love_code) {
      return showToast('Mã tình yêu sai bét rồi, định ngoại tình hả? 😤', 'error');
    }
    setLoading(true);
    try {
      // 1. Create Couple
      const { data: coupleData, error: coupleErr } = await supabase.from('couples').insert({
        partner1_id: invite.sender_id,
        partner2_id: user.id,
        love_code: invite.love_code
      }).select().single();
      if (coupleErr) throw coupleErr;

      // 2. Update users
      const { data: updatedUsers, error: updateErr } = await supabase
        .from('users')
        .update({ couple_id: coupleData.id })
        .in('id', [user.id, invite.sender_id])
        .select();
        
      if (updateErr) throw updateErr;
      if (!updatedUsers || updatedUsers.length === 0) {
         throw new Error("Không thể cập nhật tài khoản. Vui lòng tắt RLS cho bảng users trong Supabase!");
      }

      // 3. Update invite status
      await supabase.from('invitations').update({ status: 'ACCEPTED' }).eq('id', invite.id);

      showToast('Chốt đơn! Hai bạn đã thuộc về nhau 💍💘', 'success');
      setShowAcceptModal(null);
      // Sync UI and trigger celebration without reload
      await refreshAuth();
      window.dispatchEvent(new CustomEvent('show-celebration'));
    } catch (err) {
      console.error(err);
      showToast('Lỗi: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!editDisplayName.trim()) return showToast('Nhập thiếu tên rồi bạn ơi 🧐', 'error');
    setLoading(true);
    try {
      const { error } = await supabase.from('users').update({
        display_name: editDisplayName,
        gender: editGender
      }).eq('id', user.id);
      
      if (error) throw error;
      
      showToast('Sửa thông tin đẹp phết! Đã lưu nhé ✨', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast('Lỗi lưu thông tin 🥺', 'error');
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      // Compress and get base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result;
        
        const { error } = await supabase.from('users').update({
          avatar_url: base64Url
        }).eq('id', user.id);
        
        if (error) throw error;
        showToast('Avatar xinh lung linh! Đã cập nhật 🌟', 'success');
        await refreshAuth();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast('Ảnh bự quá hoặc lỗi mạng rồi 🥺', 'error');
    }
    setLoading(false);
  };

  const handleWpUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const compressedUrl = await compressImage(file, 1280, 1920, 0.82);
      let cleanName = file.name ? file.name.replace(/\.[^/.]+$/, '').trim() : '';
      if (!cleanName || /^(image|img[_\-]?\d+|photo)/i.test(cleanName)) {
        const d = new Date();
        cleanName = `Kỷ niệm ${d.getDate()}/${d.getMonth() + 1} 💕`;
      } else {
        cleanName = cleanName.slice(0, 24);
      }
      addCustomWallpaper({ name: cleanName, url: compressedUrl });
      showToast('Đã thêm ảnh nền thành công! ✨', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải ảnh: ' + err.message, 'error');
    } finally {
      setLoading(false);
      if (wpFileInputRef.current) wpFileInputRef.current.value = '';
    }
  };

  // No need for allWps, just use customWallpapers
  return (
    <div className="px-3 sm:px-4 py-2 space-y-4 animate-fadeInUp">
      {/* User Profile */}
      <section className="glass-panel p-4 rounded-[28px] border border-white/10 shadow-lg text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-rose-500/20 to-transparent -z-10" />
        
        <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-full border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] mb-3 flex items-center justify-center relative overflow-hidden group">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">{user?.gender === 'MALE' ? '👦' : '👧'}</span>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleAvatarUpload} 
            className="hidden" 
          />
          <button 
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
          >
            <Camera size={24} />
          </button>
        </div>
        
        <h2 className="text-lg font-black text-white">{user?.display_name || 'Tên của bạn'}</h2>
        <p className="text-xs font-bold text-zinc-400">@{user?.username}</p>
        
        {/* Connection Status */}
        <div className="mt-4 p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
          {partner ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-[10px] font-black text-rose-300 uppercase tracking-wide">Đã kết nối với</div>
              <div className="flex items-center gap-2">
                {partner?.avatar_url ? (
                  <img src={partner.avatar_url} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-rose-400" />
                ) : (
                  <span className="text-xl">{partner?.gender === 'MALE' ? '👦' : '👧'}</span>
                )}
                <span className="text-sm font-extrabold text-white">{partner?.display_name}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">Chưa kết nối người yêu</div>
              
              {pendingInvites.length > 0 && (
                <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-2 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs text-rose-300"><b>{pendingInvites[0].sender?.display_name}</b> muốn kết nối với bạn!</p>
                  </div>
                  <button onClick={() => setShowAcceptModal(pendingInvites[0])} className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-rose-600 transition-all">
                    Chấp nhận
                  </button>
                </div>
              )}

              <button 
                onClick={() => setShowInviteModal(true)}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-extrabold text-white bg-rose-500/90 hover:bg-rose-600 shadow-md transition-all active:scale-95"
              >
                <LinkIcon size={14} /> Mời kết nối ngay
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Theme / Wallpaper Settings */}
      <section className="glass-panel p-4 rounded-[28px] border border-white/10 shadow-lg">
        <h3 className="text-sm font-black text-white mb-3 flex items-center gap-1.5">
          <Palette size={16} className="text-rose-400" />
          Tùy chỉnh giao diện (Theme & Hình nền)
        </h3>
        
        {/* THẾ GIỚI GIAO DIỆN (THEMES) */}
        <div className="mb-5">
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5">Thế giới giao diện (Theme)</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ocean', name: 'Ocean Liquid Glass', emoji: '🌊', color: 'from-cyan-500 to-blue-500' },
              { id: 'aurora', name: 'Aurora Fantasy', emoji: '🌌', color: 'from-purple-500 to-indigo-500' },
              { id: 'winter', name: 'Winter Dream', emoji: '❄️', color: 'from-sky-200 to-blue-300' },
              { id: 'surprise', name: 'Neon City', emoji: '🎨', color: 'from-rose-500 to-amber-400' },
            ].map(t => {
              const isActive = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setThemeId(t.id);
                    setWallpaper(null);
                  }}
                  className={`relative overflow-hidden rounded-2xl p-3 text-left transition-all group ${
                    isActive 
                      ? 'border-2 border-white/30 scale-[1.02] shadow-lg ring-2 ring-white/10' 
                      : 'border border-white/5 bg-white/5 hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${t.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
                  {isActive && <div className={`absolute inset-0 bg-gradient-to-r ${t.color} opacity-30`} />}
                  
                  <div className="relative z-10 flex flex-col gap-1">
                    <span className="text-xl">{t.emoji}</span>
                    <div className={`font-black text-[11px] ${isActive ? 'text-white drop-shadow-md' : 'text-zinc-300'}`}>
                      {t.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CUSTOM BACKGROUND */}
        <div>
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5 flex items-center justify-between">
            <span>Tùy chỉnh nền cá nhân</span>
            <span className="text-[9px] lowercase opacity-70 font-normal">(Chỉ dùng ảnh bạn tải lên)</span>
          </h4>
          <input 
            type="file" 
            ref={wpFileInputRef} 
            accept="image/*" 
            onChange={handleWpUpload} 
            className="hidden" 
          />
          <div className="grid grid-cols-2 gap-2">
            {/* Upload Button */}
            <button
              onClick={() => wpFileInputRef.current?.click()}
              className="relative rounded-xl h-24 overflow-hidden border-2 border-dashed border-rose-400/50 flex flex-col items-center justify-center text-rose-300 hover:bg-rose-500/10 hover:border-rose-400 transition-all active:scale-95"
            >
              <Camera size={20} className="mb-1" />
              <span className="text-[10px] font-bold">Thêm ảnh của bạn</span>
            </button>

            {/* User Custom */}
            {customWallpapers.map(wp => {
              return (
                <button
                  key={wp.id}
                  onClick={() => setWallpaper(wp.id)}
                  className={`relative rounded-xl h-24 overflow-hidden border-2 transition-all ${
                    wallpaper === wp.id ? 'border-rose-400 scale-95 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-[0.98]'
                  }`}
                >
                  <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-2">
                    <span className="text-[10px] font-bold text-white text-left leading-tight drop-shadow-md">
                      {wp.name}
                    </span>
                  </div>
                  <div 
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-zinc-300 hover:text-rose-400 hover:bg-black/80 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Xóa ảnh nền này?')) deleteCustomWallpaper(wp.id);
                    }}
                  >
                    <span className="text-xs">✕</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="glass-panel rounded-[28px] border border-white/10 shadow-lg overflow-hidden">
        <button 
          onClick={() => setShowEditModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300"><User size={16} /></div>
            <span className="text-sm font-bold text-zinc-200">Sửa thông tin cá nhân</span>
          </div>
        </button>
        <button onClick={logout} className="w-full flex items-center justify-between p-4 hover:bg-rose-500/10 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors"><LogOut size={16} /></div>
            <span className="text-sm font-bold text-rose-400 group-hover:text-rose-300">Đăng xuất</span>
          </div>
        </button>
      </section>

      {/* Invite Modal */}
      {showInviteModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="bottom-sheet flex flex-col p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-white text-center mb-1">Mời kết nối 💕</h3>
            <p className="text-xs text-zinc-400 text-center mb-4">Nhập tên đăng nhập của nửa kia và mã tình yêu của bạn để gửi lời mời.</p>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Tên đăng nhập (username) của nửa kia" 
                className="input-romantic"
                value={inviteUsername}
                onChange={e => setInviteUsername(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Mã tình yêu (6 ký tự)" 
                className="input-romantic uppercase tracking-widest text-center font-black"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                maxLength={6}
              />
              
              <button 
                onClick={handleSendInvite} 
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 text-sm shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Gửi lời mời kết nối'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Accept Modal */}
      {showAcceptModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowAcceptModal(null)}>
          <div className="bottom-sheet flex flex-col p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-white text-center mb-1">Chấp nhận kết nối 💕</h3>
            <p className="text-xs text-zinc-400 text-center mb-4">Vui lòng nhập mã tình yêu chung của 2 bạn để xác nhận với <b>{showAcceptModal.sender?.display_name}</b>.</p>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Mã tình yêu (6 ký tự)" 
                className="input-romantic uppercase tracking-widest text-center font-black"
                value={acceptCode}
                onChange={e => setAcceptCode(e.target.value)}
                maxLength={6}
              />
              
              <button 
                onClick={() => handleAcceptInvite(showAcceptModal)} 
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 text-sm shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                {loading ? 'Đang kết nối...' : 'Chấp nhận & Kết nối'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Profile Modal */}
      {showEditModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="bottom-sheet flex flex-col p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-white text-center mb-4">Sửa thông tin cá nhân 📝</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Tên hiển thị</label>
                <input 
                  type="text" 
                  className="input-romantic"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Giới tính</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditGender('MALE')}
                    className={`flex-1 py-3 rounded-2xl border ${editGender === 'MALE' ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-white/5 border-white/10 text-zinc-400'} transition-all font-semibold`}
                  >
                    👦 Nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGender('FEMALE')}
                    className={`flex-1 py-3 rounded-2xl border ${editGender === 'FEMALE' ? 'bg-rose-500/20 border-rose-400 text-rose-300' : 'bg-white/5 border-white/10 text-zinc-400'} transition-all font-semibold`}
                  >
                    👧 Nữ
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleUpdateProfile} 
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 text-sm shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
