import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Heart, Sparkles, User, Lock, Tag, Users, CheckCircle } from 'lucide-react';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const originalTheme = document.body.className;
    document.body.className = 'theme-minimal';
    return () => {
      document.body.className = originalTheme;
    };
  }, []);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [loveCode, setLoveCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!username || !password) throw new Error("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu");
        await login(username, password);
      } else {
        if (!username || !password || !fullName || !dob || !displayName || !loveCode) {
          throw new Error("Vui lòng nhập đầy đủ thông tin");
        }
        if (loveCode.length !== 6) {
          throw new Error("Mã tình yêu phải có đúng 6 ký tự");
        }
        await register({
          username,
          password,
          full_name: fullName,
          dob,
          display_name: displayName,
          gender,
          love_code: loveCode
        });
        setSuccess("Đăng ký thành công! Vui lòng đăng nhập.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center relative text-white px-4">
      {/* Background with animated gradients */}
      <div 
        className="fixed inset-0 z-0 bg-[#09090b] pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(14, 165, 233, 0.15) 0%, transparent 50%),
            #09090b
          `
        }}
      />
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 z-0 pointer-events-none mix-blend-screen" />

      {/* Floating Elements */}
      <div className="absolute top-20 left-[20%] text-rose-500/30 animate-float" style={{ animationDelay: '0s' }}>
        <Heart size={32} fill="currentColor" />
      </div>
      <div className="absolute bottom-32 right-[20%] text-pink-500/20 animate-float" style={{ animationDelay: '1s' }}>
        <Heart size={48} fill="currentColor" />
      </div>
      <div className="absolute top-1/3 right-[15%] text-amber-300/40 animate-pulse-subtle">
        <Sparkles size={24} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-tr from-rose-500 to-pink-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] mb-6 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <Heart size={40} className="text-white animate-heartbeat" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-white">
            Schedule Couple
          </h1>
          <p className="text-zinc-400 text-sm font-medium">
            Nơi lưu giữ kỷ niệm và kế hoạch của chúng mình
          </p>
        </div>

        <div className="liquid-glass-heavy rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glow inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-[40px] pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-2xl flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-2xl flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>{success}</p>
              </div>
            )}

            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Họ và tên" 
                    className="input-romantic pl-11"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">📅</span>
                  <input 
                    type="date" 
                    className="input-romantic pl-11"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tên hiển thị (VD: Vợ Yêu)" 
                    className="input-romantic pl-11"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('MALE')}
                    className={`flex-1 py-3 rounded-2xl border ${gender === 'MALE' ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-white/5 border-white/10 text-zinc-400'} transition-all font-semibold`}
                  >
                    👦 Anh ấy
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('FEMALE')}
                    className={`flex-1 py-3 rounded-2xl border ${gender === 'FEMALE' ? 'bg-rose-500/20 border-rose-400 text-rose-300' : 'bg-white/5 border-white/10 text-zinc-400'} transition-all font-semibold`}
                  >
                    👧 Cô ấy
                  </button>
                </div>
              </>
            )}

            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Tên đăng nhập" 
                className="input-romantic pl-11"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                className="input-romantic pl-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div className="relative mt-2">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400">
                  <Tag size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Mã tình yêu (6 ký tự)" 
                  maxLength={6}
                  className="input-romantic pl-11 border-rose-500/30 focus:border-rose-500 font-bold uppercase tracking-widest text-rose-200 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                  value={loveCode}
                  onChange={(e) => setLoveCode(e.target.value.toUpperCase())}
                />
                <p className="text-[11px] text-zinc-400 mt-2 px-2 text-center">
                  Nhập chung 1 mã để ghép đôi với nửa kia của bạn.
                </p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full mt-4 py-4 text-[15px] shadow-[0_8px_24px_rgba(244,63,94,0.4)] disabled:opacity-70 disabled:scale-100"
            >
              {loading ? 'Đang xử lý...' : isLogin ? 'Bắt Đầu Yêu ✨' : 'Tạo Không Gian Riêng 💕'}
            </button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-[13px] text-zinc-400 hover:text-white transition-colors"
            >
              {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <span className="text-rose-400 font-bold ml-1">
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
