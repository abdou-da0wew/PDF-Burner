import { splitProps } from 'solid-js';
import type { JSX } from 'solid-js';

/** Solid-native shadcn-style primitives with shared feedback and composable class variants. */
type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'danger';
  size?: 'default' | 'sm' | 'icon';
};

export function Button(props: ButtonProps) {
  const [local, attributes] = splitProps(props, ['variant', 'size', 'class', 'children']);
  return (
    <button
      {...attributes}
      class={`ui-button button-${local.variant ?? 'default'} button-${local.size ?? 'default'} ${local.class ?? ''}`.trim()}
    >
      <span class="button-label-slot">{local.children}</span>
    </button>
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
