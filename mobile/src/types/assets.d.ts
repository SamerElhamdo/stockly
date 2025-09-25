declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.jpeg' {
  const content: number;
  export default content;
}

declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const component: FC<SVGProps<SVGSVGElement>>;
  export default component;
}
