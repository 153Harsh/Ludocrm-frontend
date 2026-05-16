declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.svg' {
  import type { ComponentType, SVGProps } from 'react';
  const ReactComponent: ComponentType<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
