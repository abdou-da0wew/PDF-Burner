import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';
import { Show } from 'solid-js';
import { Button } from './ui';
import type { TranslationKey } from '../translations';

type Props = {
  open: Accessor<boolean>;
  intensity: Accessor<number>;
  vimMode: Accessor<boolean>;
  t: (key: TranslationKey) => string;
  onClose: () => void;
  onIntensity: (value: number) => void;
  onVimMode: (enabled: boolean) => void;
};

export default function SettingsPanel(props: Props) {
  const [present, setPresent] = createSignal(props.open());
  let panel: HTMLElement | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  createEffect(() => {
    const opened = props.open();
    clearTimeout(closeTimer);
    if (opened) {
      setPresent(true);
      frame = requestAnimationFrame(() =>
        panel?.querySelector<HTMLElement>('button, input')?.focus(),
      );
    } else {
      const delay = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
      closeTimer = setTimeout(() => setPresent(false), delay);
    }
  });
  createEffect(() => {
    if (!props.open()) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'),
      ];
      if (!focusable.length) return;
      const first = focusable[0]!,
        last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    onCleanup(() => {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    });
  });
  onMount(() => {
    if (props.open())
      requestAnimationFrame(() => panel?.querySelector<HTMLElement>('button, input')?.focus());
  });
  onCleanup(() => {
    clearTimeout(closeTimer);
    cancelAnimationFrame(frame);
  });

  const shortcuts = () =>
    props.vimMode()
      ? { choose: 'O', burn: 'B', lower: '−', raise: '=', close: 'Esc' }
      : { choose: '⌘/Ctrl + O', burn: '⌘/Ctrl + Enter', lower: '[', raise: ']', close: 'Esc' };

  return (
    <Show when={present()}>
      <div
        class="settings-backdrop"
        data-open={props.open() ? '' : undefined}
        onClick={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <section
          class="settings-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          aria-describedby="settings-description"
          tabindex="-1"
          ref={panel}
        >
          <header class="settings-header">
            <div>
              <span class="settings-kicker">EMBER / PDF</span>
              <h2 id="settings-title">{props.t('settings')}</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="settings-close"
              aria-label={props.t('close')}
              onClick={props.onClose}
            >
              <i class="ph ph-x" />
            </Button>
          </header>
          <p class="settings-hint" id="settings-description">
            {props.t('settingsHint')}
          </p>
          <label class="setting-field">
            <span class="setting-label">{props.t('defaultIntensity')}</span>
            <span class="setting-value">{props.intensity()}%</span>
            <input
              type="range"
              min="15"
              max="100"
              value={props.intensity()}
              aria-label={props.t('defaultIntensity')}
              onInput={(event) => props.onIntensity(Number(event.currentTarget.value))}
            />
          </label>
          <label class="vim-setting">
            <span class="vim-copy">
              <b>{props.t('vimMode')}</b>
              <small>{props.t('vimDescription')}</small>
            </span>
            <input
              type="checkbox"
              checked={props.vimMode()}
              aria-label={props.t('vimMode')}
              onChange={(event) => props.onVimMode(event.currentTarget.checked)}
            />
          </label>
          <div class="shortcuts">
            <h3>{props.t('shortcutTitle')}</h3>
            <div>
              <span>{props.t('chooseShortcut')}</span>
              <kbd>{shortcuts().choose}</kbd>
            </div>
            <div>
              <span>{props.t('burnShortcut')}</span>
              <kbd>{shortcuts().burn}</kbd>
            </div>
            <div>
              <span>{props.t('lowerShortcut')}</span>
              <kbd>{shortcuts().lower}</kbd>
            </div>
            <div>
              <span>{props.t('raiseShortcut')}</span>
              <kbd>{shortcuts().raise}</kbd>
            </div>
            <div>
              <span>{props.t('closeShortcut')}</span>
              <kbd>{shortcuts().close}</kbd>
            </div>
            <div>
              <span>{props.t('settingsShortcut')}</span>
              <kbd>?</kbd>
            </div>
          </div>
          <p class="settings-saved">
            <i class="ph ph-shield-check" /> {props.t('saved')}
          </p>
        </section>
      </div>
    </Show>
  );
}
