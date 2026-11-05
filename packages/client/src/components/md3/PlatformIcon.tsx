import React from 'react';
import { Monitor, Smartphone, Tablet, Globe, Server, Laptop } from 'lucide-react';
import type { PlatformType, DeviceType } from '@p2p-share/shared';

interface PlatformIconProps {
  platform?: PlatformType | string;
  deviceType?: DeviceType | string;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  deviceType,
  className = 'w-6 h-6',
}) => {
  if (deviceType === 'mobile' || platform === 'android' || platform === 'ios') {
    return <Smartphone className={className} />;
  }
  if (deviceType === 'tablet') {
    return <Tablet className={className} />;
  }
  if (deviceType === 'server') {
    return <Server className={className} />;
  }
  if (platform === 'linux' || platform === 'macos') {
    return <Laptop className={className} />;
  }
  if (platform === 'windows') {
    return <Monitor className={className} />;
  }
  return <Globe className={className} />;
};
