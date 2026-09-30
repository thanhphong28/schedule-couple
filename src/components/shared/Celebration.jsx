import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Celebration() {
  const [show, setShow] = useState(false);
  const { partner } = useAuth();
  const [prevPartner, setPrevPartner] = useState(partner);

  useEffect(() => {
    // Custom event listener for manual trigger (User B)
    const handleShow = () => {
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    };
    window.addEventListener('show-celebration', handleShow);
    return () => window.removeEventListener('show-celebration', handleShow);
  }, []);


  if (!show || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="text-center transform animate-bounce-in">
        {/* Floating Hearts Animation Background */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center -z-10">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="absolute text-rose-500 opacity-0"
              style={{
                animation: `float-up ${3 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                left: `${(Math.random() - 0.5) * 100}%`,
                top: '50%'
              }}
            >
              <Heart size={24 + Math.random() * 32} fill="currentColor" />
            </div>
          ))}
        </div>
        
        <div className="text-8xl mb-6 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]">🎉💍💘</div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)] mb-3">
          KẾT NỐI THÀNH CÔNG!
        </h1>
        <p className="text-white font-extrabold mt-2 text-lg drop-shadow-md">
          Chào mừng hai bạn đến với không gian chung
        </p>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-up {
          0% { transform: translateY(100px) scale(0.5); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-300px) scale(1.2); opacity: 0; }
        }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
      `}} />
    </div>, 
    document.body
  );
}
