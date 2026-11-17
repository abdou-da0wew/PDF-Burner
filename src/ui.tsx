import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { Card } from './components/ui';
import AppHeader from './components/app-header';
import ControlPanel from './components/control-panel';
import SettingsPanel from './components/settings-panel';
import { messages, type Locale, type TranslationKey } from './translations';

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem('ember-language');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    // Private browsing can disable storage; fall back to the browser language.
  }
  const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
  return preferences.some((language) => language.toLowerCase().startsWith('ar')) ? 'ar' : 'en';
}

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('ember-settings') ?? '{}') as {
      intensity?: number;
      vimMode?: boolean;
    };
    return {
      intensity:
        typeof saved.intensity === 'number' && Number.isFinite(saved.intensity)
          ? Math.max(15, Math.min(100, Math.round(saved.intensity)))
          : 68,
      vimMode: saved.vimMode === true,
    };
  } catch {
    return { intensity: 68, vimMode: false };
  }
}

export default function App() {
  const preferences = readPreferences();
  const [locale, setLocale] = createSignal<Locale>(detectLocale());
  const [headerScrolled, setHeaderScrolled] = createSignal(window.scrollY > 8);
  const updateHeaderScroll = () => setHeaderScrolled(window.scrollY > 8);
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
  const [file, setFile] = createSignal<File>(),
    [level, setLevel] = createSignal(preferences.intensity),
    [vimMode, setVimMode] = createSignal(preferences.vimMode),
    [settingsOpen, setSettingsOpen] = createSignal(false),
    [busy, setBusy] = createSignal(false),
    [progress, setProgress] = createSignal(0),
    [preview, setPreview] = createSignal<string>(),
    [pages, setPages] = createSignal(0),
    [error, setError] = createSignal<TranslationKey>(),
    [done, setDone] = createSignal(false),
    [downloadUrl, setDownloadUrl] = createSignal<string>(),
    [downloadName, setDownloadName] = createSignal('');
  let openPicker = () => {};
  let revokeTimer: number | undefined;
  const t = (key: TranslationKey) => messages[locale()][key];
  const clearDownload = () => {
    window.clearTimeout(revokeTimer);
    revokeTimer = undefined;
    const previous = downloadUrl();
    if (previous) URL.revokeObjectURL(previous);
    setDownloadUrl();
    setDownloadName('');
  };

  createEffect(() => {
    const language = locale();
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = messages[language].documentTitle;
    try {
      localStorage.setItem('ember-language', language);
    } catch {
      // Language selection remains active for this session when storage is unavailable.
    }
  });
  createEffect(() => {
    try {
      localStorage.setItem(
        'ember-settings',
        JSON.stringify({ intensity: level(), vimMode: vimMode() }),
      );
    } catch {
      // The current settings still work when browser storage is unavailable.
    }
  });

  const pick = (selected?: File) => {
    if (!selected) return;
    setError();
    setDone(false);
    clearDownload();
    if (selected.size === 0 || selected.size > 100 * 1024 * 1024) {
      setFile();
      setPreview();
      setPages(0);
      setError(selected.size === 0 ? 'empty' : 'tooLarge');
      return;
    }
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setFile();
      setPreview();
      setPages(0);
      setError('invalidType');
      return;
    }
    setFile(selected);
    setPreview();
    setPages(0);
  };

  async function process() {
    const selected = file();
    if (!selected) return;
    clearDownload();
    setBusy(true);
    setError();
    setProgress(0);
    setDone(false);
    try {
      const { processPdf } = await import('./process-pdf');
      const result = await processPdf(selected, level(), setProgress);
      setPages(result.pages);
      setPreview(result.preview);
      setDownloadUrl(
        URL.createObjectURL(new Blob([result.bytes as BlobPart], { type: 'application/pdf' })),
      );
      setDownloadName(`${selected.name.replace(/\.pdf$/i, '')}-burnt.pdf`);
      setDone(true);
    } catch {
      setError('unreadable');
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    const url = downloadUrl();
    const name = downloadName();
    if (!url || !name) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setDone(false);
    revokeTimer = window.setTimeout(() => {
      revokeTimer = undefined;
      if (downloadUrl() === url) clearDownload();
    }, 2000);
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && settingsOpen()) {
      setSettingsOpen(false);
      return;
    }
    if (settingsOpen()) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    )
      return;
    const key = event.key.toLowerCase();
    if (key === '?') {
      event.preventDefault();
      setSettingsOpen(true);
      return;
    }
    const vim = vimMode();
    const openFile = vim ? key === 'o' : (event.ctrlKey || event.metaKey) && key === 'o';
    const burnFile = vim ? key === 'b' : (event.ctrlKey || event.metaKey) && key === 'enter';
    const reduce = vim ? key === '-' : key === '[';
    const increase = vim ? key === '=' || key === '+' : key === ']';
    if (openFile) {
      event.preventDefault();
      openPicker();
    } else if (burnFile && file() && !busy()) {
      event.preventDefault();
      void process();
    } else if (reduce || increase) {
      event.preventDefault();
      setLevel((current) => Math.max(15, Math.min(100, current + (increase ? 5 : -5))));
    }
  };
  window.addEventListener('keydown', handleKeydown);
  onCleanup(() => {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('scroll', updateHeaderScroll);
    clearDownload();
  });

  return (
    <main class="shell">
      <AppHeader
        locale={locale}
        scrolled={headerScrolled}
        t={t}
        onToggleLanguage={() => setLocale(locale() === 'en' ? 'ar' : 'en')}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <section class="hero">
        <div class="eyebrow">
          <span /> {t('eyebrow')}
        </div>
        <h1>
          {t('heroLead')}
          <br />
          {t('heroTail')} <em>{t('heroAccent')}</em>
        </h1>
        <p class="intro">{t('intro')}</p>
        <div class="workspace">
          <ControlPanel
            file={file}
            level={level}
            busy={busy}
            progress={progress}
            pages={pages}
            error={error}
            done={done}
            t={t}
            onFile={pick}
            onLevel={setLevel}
            onBurn={process}
            onDownload={downloadResult}
            registerPicker={(open) => {
              openPicker = open;
            }}
          />
          <Card class="preview">
            <div class="preview-head">
              <div>
                <span class="number">{t('stepThree')}</span>
                <b>{t('after')}</b>
              </div>
              <span class="live-dot">● {t('live')}</span>
            </div>
            <div class="preview-stage">
              <Show
                when={preview()}
                fallback={
                  <div class="empty-preview">
                    <div class="paper-stack">
                      <div />
                      <div />
                      <div>
                        <i class="ph ph-fire" />
                      </div>
                    </div>
                    <b>{t('waiting')}</b>
                    <span>{t('waitingNote')}</span>
                  </div>
                }
              >
                <img src={preview()} alt={t('after')} />
                <span class="preview-stamp">
                  {t('burntStamp').replace('{level}', `${level()}`)}
                </span>
              </Show>
            </div>
            <div class="preview-foot">
              <span>
                <i class="ph ph-eye" /> {t('stillViewable')}
              </span>
              <Show when={pages()}>
                <span>
                  {pages()} {pages() === 1 ? t('page') : t('pages')}
                </span>
              </Show>
            </div>
          </Card>
        </div>
        <footer>
          <span>{t('footer')}</span>
          <span>
            EMBER / PDF <i class="ph ph-fire footer-star" />
          </span>
        </footer>
      </section>
      <SettingsPanel
        open={settingsOpen}
        intensity={level}
        vimMode={vimMode}
        t={t}
        onClose={() => setSettingsOpen(false)}
        onIntensity={setLevel}
        onVimMode={setVimMode}
      />
    </main>
  );
}
