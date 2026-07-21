import React, { useEffect, useState, useRef } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
  const [kernels, setKernels] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    // Attempt to play audio on mount. 
    // It will play if the user clicked a link to get here. If blocked, it fails silently.
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.6;
      audio.play().catch(err => {
        console.warn("Silent intro: Browser blocked audio autoplay.", err);
      });
    }

    // Generate popcorn kernels
    const numKernels = 12;
    const newKernels = [];
    for (let i = 0; i < numKernels; i++) {
      const angleDeg = -90 + (Math.random() * 100 - 50); 
      const distance = 70 + Math.random() * 90;
      const tx = Math.cos(angleDeg * Math.PI / 180) * distance;
      const ty = Math.sin(angleDeg * Math.PI / 180) * distance;
      const drop = Math.random() * 40 + 20; 

      newKernels.push({
        id: i,
        tx,
        ty,
        drop,
        r: Math.random() * 360,
        delay: 1.4 + Math.random() * 0.2
      });
    }
    setKernels(newKernels);

    // Auto close splash after animation completes
    const timer = setTimeout(() => {
      onFinish();
    }, 5500); // 5.5s total duration

    return () => {
        clearTimeout(timer);
        if (audio) {
            audio.pause();
        }
    };
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <audio ref={audioRef} src="/intro_sound.wav" preload="auto" />
      
      <div className="scene">
        {/* The sweeping projector beam */}
        <div className="projector-beam"></div>

        <div className="logo-container">
            
          {/* Popcorn Bucket & Play Button */}
          <div className="bucket-wrapper">
            {/* SVG Popcorn Bucket */}
            <svg className="bucket-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
              <path d="M15,40 C10,40 5,35 10,25 C5,15 15,10 25,15 C30,5 45,5 50,15 C55,5 70,5 75,15 C85,10 95,15 90,25 C95,35 90,40 85,40 Z" fill="#fcd34d" />
              <polygon points="15,40 85,40 75,115 25,115" fill="#ffffff" />
              <polygon points="25,40 35,40 32,115 28,115" fill="#e50914" />
              <polygon points="45,40 55,40 52,115 48,115" fill="#e50914" />
              <polygon points="65,40 75,40 72,115 68,115" fill="#e50914" />
            </svg>

            {/* Popcorn Kernels */}
            {kernels.map(k => (
              <div 
                key={k.id} 
                className="kernel" 
                style={{
                  '--tx': `${k.tx}px`,
                  '--ty': `${k.ty}px`,
                  '--drop': `${k.drop}px`,
                  '--r': `${k.r}deg`,
                  animationDelay: `${k.delay}s`
                }}
              ></div>
            ))}

            {/* Snapping Play Button */}
            <div className="play-button"></div>
          </div>

          {/* Text and Tagline */}
          <div className="text-wrapper">
            <div className="brand-name">
              <div className="reba-wrapper">
                <span className="reba-text">REBA</span>
                <div className="red-line"></div>
              </div>
              <span className="filme-text">Filme</span>
            </div>
            <div className="tagline"><span>.</span>new films <span>.</span> Big experience</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
