import type { Accessor } from 'solid-js';
import { Show } from 'solid-js';
import { Button, Card } from './ui';
import type { TranslationKey } from '../translations';

type Copy = (key: TranslationKey) => string;
type Props = {
  file: Accessor<File | undefined>;
  level: Accessor<number>;
  busy: Accessor<boolean>;
  progress: Accessor<number>;
  pages: Accessor<number>;
  error: Accessor<TranslationKey | undefined>;
  done: Accessor<boolean>;
  t: Copy;
  onFile: (file?: File) => void;
  onLevel: (level: number) => void;
  onBurn: () => void;
  onDownload: () => void;
  registerPicker: (open: () => void) => void;
};

export default function ControlPanel(props: Props) {
  let input!: HTMLInputElement;
  return (
    <Card class="controls">
      <div class="section-title">
        <span class="number">{props.t('stepOne')}</span>
        <div>
          <b>{props.t('choose')}</b>
          <small>{props.t('localNote')}</small>
        </div>
      </div>
      <div
        class="dropzone"
        role="button"
        aria-label={props.t('drop')}
        tabindex="0"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            input.click();
          }
        }}
        classList={{ 'has-file': !!props.file() }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          props.onFile(event.dataTransfer?.files[0]);
        }}
        onClick={() => input.click()}
      >
        <input
          ref={(element) => {
            input = element;
            props.registerPicker(() => element.click());
          }}
          type="file"
          accept="application/pdf,.pdf"
          aria-label={props.t('choose')}
          hidden
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            props.onFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <div class="upload-icon">
          <i class="ph ph-arrow-up" />
        </div>
        <Show
          when={props.file()}
          fallback={
            <>
              <b>{props.t('drop')}</b>
              <span>
                {props.t('or')} <u>{props.t('browse')}</u>
              </span>
              <small>{props.t('limit')}</small>
            </>
          }
        >
          <b class="filename" dir="auto">
            {props.file()?.name}
          </b>
          <span>
            {((props.file()?.size ?? 0) / 1024 / 1024).toFixed(2)} MB · {props.t('clickChange')}
          </span>
        </Show>
      </div>
      <div class="section-title tune">
        <span class="number">{props.t('stepTwo')}</span>
        <div>
          <b>{props.t('intensity')}</b>
          <small>{props.t('intensityNote')}</small>
        </div>
      </div>
      <div class="intensity">
        <div class="intensity-label">
          <span>{props.t('gentle')}</span>
          <b>
            {props.level()}
            <small>%</small>
          </b>
          <span>{props.t('inferno')}</span>
        </div>
        <input
          aria-label={props.t('sliderLabel')}
          type="range"
          min="15"
          max="100"
          value={props.level()}
          onInput={(event) => props.onLevel(+event.currentTarget.value)}
          style={{ '--pct': `${((props.level() - 15) / 85) * 100}%` }}
        />
        <div class="range-hints">
          <span>{props.t('edges')}</span>
          <span>{props.t('barely')}</span>
        </div>
      </div>
      <Button
        type="button"
        class="burn-button"
        classList={{ 'is-downloading': props.done() }}
        disabled={(!props.file() && !props.done()) || props.busy()}
        onClick={() => (props.done() ? props.onDownload() : props.onBurn())}
      >
        <Show
          when={props.busy()}
          fallback={
            <Show
              when={props.done()}
              fallback={
                <>
                  <i class="ph ph-fire" /> {props.t('burn')}{' '}
                  <i class="ph ph-arrow-up-right arrow" />
                </>
              }
            >
              <i class="ph ph-download-simple" /> {props.t('download')}
            </Show>
          }
        >
          <i class="ph ph-circle-notch spinner" />{' '}
          {props.t('burning').replace('{progress}', `${props.progress()}`)}
        </Show>
      </Button>
      <Show when={props.error()}>
        <p class="error" role="alert">
          {props.t(props.error()!)}
        </p>
      </Show>
      <Show when={props.done()}>
        <p class="success" role="status">
          {props
            .t('success')
            .replace('{pages}', `${props.pages()}`)
            .replace('{pageLabel}', props.t(props.pages() === 1 ? 'page' : 'pages'))}
        </p>
      </Show>
      <p class="privacy">
        <i class="ph ph-lock-key" /> &nbsp;{props.t('privacy')}
      </p>
    </Card>
  );
}
