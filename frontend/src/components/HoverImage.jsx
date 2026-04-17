import { useState, useEffect, useRef } from 'react';
import '../components.css/HoverImage.css';

const images = [
  'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1615461065929-4f8ffed6ca40?w=400&h=300&fit=crop',
];

const HoverImage = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [imageTrail, setImageTrail] = useState([]);
  const [isMoving, setIsMoving] = useState(false);
  const containerRef = useRef(null);
  const moveTimeoutRef = useRef(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const imageIndexRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current && isHovering) {
        const rect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;
        
        setMousePos({ x: newX, y: newY });

        // Check if mouse is actually moving
        const distance = Math.sqrt(
          Math.pow(newX - lastPosRef.current.x, 2) + 
          Math.pow(newY - lastPosRef.current.y, 2)
        );

        if (distance > 5) {
          setIsMoving(true);
          
          // Add image to trail with cycling through images
          const newImage = {
            id: Date.now() + Math.random(),
            x: newX,
            y: newY,
            image: images[imageIndexRef.current % images.length]
          };
          
          imageIndexRef.current += 1;
          
          setImageTrail(prev => {
            const newTrail = [...prev, newImage];
            // Keep only last 8 images
            return newTrail.slice(-8);
          });

          lastPosRef.current = { x: newX, y: newY };
        }

        // Clear existing timeout
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }

        // Set timeout to detect when mouse stops
        moveTimeoutRef.current = setTimeout(() => {
          setIsMoving(false);
          setImageTrail([]); // Clear trail when stopped
        }, 150);
      }
    };

    if (isHovering) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, [isHovering]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    setIsMoving(false);
    setImageTrail([]);
    imageIndexRef.current = 0;
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsMoving(false);
    setImageTrail([]);
  };

  return (
    <div 
      className="hover-image-container"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovering && !isMoving && (
        <div 
          className="hover-image static"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        >
          <img 
            src={images[0]} 
            alt="Blood donation impact" 
            loading="lazy"
          />
        </div>
      )}
      
      {isMoving && imageTrail.map((item, index) => (
        <div 
          key={item.id}
          className="hover-image trail"
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            opacity: 0.3 + (index / imageTrail.length) * 0.7,
            transform: `translate(-50%, -50%) scale(${0.6 + (index / imageTrail.length) * 0.4})`
          }}
        >
          <img 
            src={item.image} 
            alt="Blood donation impact" 
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};

export default HoverImage;
