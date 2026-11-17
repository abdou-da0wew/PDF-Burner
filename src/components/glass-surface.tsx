import { splitProps } from 'solid-js';
import type { JSX } from 'solid-js';

type Props = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style'> & {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  backgroundOpacity?: number;
  blur?: number;
  brightness?: number;
  saturation?: number;
};

const cssSize = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value;

/** Frosted, specular glass surface; uses native backdrop blur with a layered CSS fallback. */
export default function GlassSurface(props: Props) {
  const [surface, attributes] = splitProps(props, [
    'children',
    'class',
    'width',
    'height',
    'borderRadius',
    'borderWidth',
    'backgroundOpacity',
    'blur',
    'brightness',
    'saturation',
  ]);
  const radius = () => surface.borderRadius ?? 30;
  const border = () => {
    const width = surface.borderWidth ?? 0.1;
    return `${Math.max(0.6, width <= 1 ? width * 10 : width)}px`;
  };
  return (
    <div
      {...attributes}
      class={`glass-surface ${surface.class ?? ''}`.trim()}
      style={`width:${cssSize(surface.width) ?? '100%'};height:${cssSize(surface.height) ?? '72px'};--glass-radius:${radius()}px;--glass-border:${border()};--glass-alpha:${surface.backgroundOpacity ?? 0.14};--glass-blur:${surface.blur ?? 18}px;--glass-brightness:${surface.brightness ?? 1.08};--glass-saturation:${surface.saturation ?? 1.45}`}
    >
      <span class="glass-surface__shine" aria-hidden="true" />
      <span class="glass-surface__rim" aria-hidden="true" />
      <div class="glass-surface__content">{surface.children}</div>
    </div>
  );
}
