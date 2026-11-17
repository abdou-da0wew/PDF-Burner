import { Show } from 'solid-js';
import { Button } from './ui';

type Props = {
  locale: () => 'en' | 'ar';
  label: string;
  onToggle: () => void;
};

export default function LanguageSwitch(props: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="language-button"
      data-locale={props.locale()}
      aria-label={props.label}
      aria-pressed={props.locale() === 'ar'}
      onClick={props.onToggle}
    >
      <i class="ph ph-translate language-glyph" />
      <span class="language-label">
        <Show
          when={props.locale() === 'en'}
          fallback={<span class="language-label-in">English</span>}
        >
          <span class="language-label-in">العربية</span>
        </Show>
      </span>
    </Button>
  );
}
