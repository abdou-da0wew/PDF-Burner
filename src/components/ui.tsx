import type { JSX } from 'solid-js';

/** Solid-native shadcn-style primitives: class-based variants, composable slots, native semantics. */
type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'danger';
  size?: 'default' | 'sm' | 'icon';
};

export function Button(props: ButtonProps) {
  const variant = () => props.variant ?? 'default';
  const size = () => props.size ?? 'default';
  return (
    <button
      {...props}
      class={`ui-button button-${variant()} button-${size()} ${props.class ?? ''}`.trim()}
    />
  );
}

type CardProps = JSX.HTMLAttributes<HTMLDivElement>;

export function Card(props: CardProps) {
  return <div {...props} class={`ui-card ${props.class ?? ''}`.trim()} />;
}

export function CardHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} class={`ui-card-header ${props.class ?? ''}`.trim()} />;
}

export function CardContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} class={`ui-card-content ${props.class ?? ''}`.trim()} />;
}
