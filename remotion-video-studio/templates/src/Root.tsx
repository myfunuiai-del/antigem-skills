import React from 'react';
import { Composition } from 'remotion';
import { TestVideo } from './TestVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TestVideo"
      component={TestVideo}
      durationInFrames={60}
      fps={30}
      width={720}
      height={720}
    />
  );
};
