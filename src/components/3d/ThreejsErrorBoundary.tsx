import React, { Component, ReactNode } from 'react';
import { Building2 } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ThreejsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E6E9FF] flex items-center justify-center">
            <Building2 size={28} className="text-[#6878CA]" />
          </div>
          <div>
            <p className="font-space font-bold text-base text-[#24283B]">3D Viewer Unavailable</p>
            <p className="font-jakarta text-sm text-[#74788C] mt-1">WebGL may not be supported in this environment. The 3D campus will be available when you open this in a compatible browser.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

