import { useState, useEffect } from "react";
import "../components.css/ImageSlider.css";

const images = [
  {
    url: "https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800&q=80",
    title: "Save Lives",
    subtitle: "Every drop counts",
  },
  {
    url: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80",
    title: "Donate Blood",
    subtitle: "Be a hero today",
  },
  {
    url: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80",
    title: "Modern Facilities",
    subtitle: "Safe & hygienic environment",
  },
  {
    url: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800&q=80",
    title: "Join Our Network",
    subtitle: "Connect with donors worldwide",
  },
  {
    url: "https://images.unsplash.com/photo-1615461065929-4f8ffed6ca40?w=800&q=80",
    title: "Make a Difference",
    subtitle: "Your donation matters",
  },
];

const ImageSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="image-slider">
      {/* Background Images */}
      {images.map((image, index) => (
        <div
          key={index}
          className={`slider-image ${index === currentIndex ? "active" : ""}`}
          style={{ backgroundImage: `url(${image.url})` }}
        />
      ))}

      {/* Overlay */}
      <div className="slider-overlay" />

      {/* Content */}
      <div className="slider-text-content">
        <h1 className="brand-logo">RaktSarthi</h1>
        <p className="brand-tagline">Real-Time Blood Management System</p>

        <div className="slide-caption">
          <h2 className="slide-title">{images[currentIndex].title}</h2>
          <p className="slide-subtitle">{images[currentIndex].subtitle}</p>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="slider-dots">
        {images.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="slider-progress">
        <div
          className="progress-bar"
          style={{ width: `${((currentIndex + 1) / images.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ImageSlider;
