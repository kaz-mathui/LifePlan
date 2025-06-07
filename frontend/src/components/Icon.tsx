import React from 'react';
import { IconType } from 'react-icons';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  as: IconType;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ as, className, ...props }) => {
  return React.createElement(as as React.ElementType, { className, ...props });
};

export default Icon; 
