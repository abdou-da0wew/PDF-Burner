import type { Accessor } from 'solid-js';
import { Button } from './ui';
import LanguageSwitch from './language-switch';
import type { Locale, TranslationKey } from '../translations';

type Props = {
  locale: Accessor<Locale>;
  scrolled: Accessor<boolean>;
  t: (key: TranslationKey) => string;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
};

export default function AppHeader(props: Props) {
  return (
    <header class="topbar" data-scrolled={props.scrolled() ? '' : undefined}>
      <a class="brand" href="/" aria-label="Ember PDF home">
        <i class="ph ph-fire brand-mark" />{' '}
        <span>
          EMBER<span class="brand-light">/PDF</span>
        </span>
      </a>
      <LanguageSwitch
        locale={props.locale}
        label={props.t('switchLanguage')}
        onToggle={props.onToggleLanguage}
      />
      <div class="header-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="settings-trigger"
          aria-label={props.t('openSettings')}
          aria-haspopup="dialog"
          onClick={props.onOpenSettings}
        >
          <i class="ph ph-gear-six" /> <span>{props.t('settings')}</span>
        </Button>
      </div>
    </header>
  );
}
