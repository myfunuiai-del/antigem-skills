import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const TestVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
          padding: '32px 48px',
          borderRadius: '24px',
          fontSize: '42px',
          fontWeight: 'bold',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        Remotion Test OK!
      </div>
    </AbsoluteFill>
  );
};
