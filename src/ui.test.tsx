// @vitest-environment jsdom
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { processMock } = vi.hoisted(() => ({ processMock: vi.fn() }));
vi.mock('./process-pdf', () => ({ processPdf: processMock }));

const activeCleanups: Array<() => void> = [];
const originalLanguages = Object.getOwnPropertyDescriptor(navigator, 'languages');
afterEach(() => {
  for (const cleanup of activeCleanups.splice(0)) cleanup();
  document.body.replaceChildren();
  localStorage.removeItem('ember-language');
  localStorage.removeItem('ember-settings');
  if (originalLanguages) Object.defineProperty(navigator, 'languages', originalLanguages);
  else Reflect.deleteProperty(navigator, 'languages');
  vi.restoreAllMocks();
});

async function mountApp() {
  const root = document.createElement('div');
  document.body.append(root);
  const { default: App } = await import('./ui');
  activeCleanups.push(render(() => <App />, root));
  return root;
}

function changeFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function dropFile(zone: HTMLElement, file: File) {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
  zone.dispatchEvent(event);
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('burner interface', () => {
  it('validates selection, supports keyboard and drop, then completes a download', async () => {
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:burnt-result');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    processMock.mockResolvedValue({
      bytes: new Uint8Array([37, 80, 68, 70]),
      preview: 'data:image/jpeg;base64,preview',
      pages: 2,
    });
    const root = await mountApp();
    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    const dropzone = root.querySelector<HTMLElement>('.dropzone')!;
    const inputClick = vi.spyOn(input, 'click');
    const button = root.querySelector<HTMLButtonElement>('.burn-button')!;

    expect(button.disabled).toBe(true);
    dropzone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(inputClick).toHaveBeenCalledOnce();
    changeFile(input, new File(['not pdf'], 'notes.txt', { type: 'text/plain' }));
    expect(root.textContent).toContain('doesn’t look like a PDF');
    expect(button.disabled).toBe(true);

    const oversize = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversize, 'size', { value: 101 * 1024 * 1024 });
    changeFile(input, oversize);
    expect(root.textContent).toContain('smaller than 100 MB');
    expect(button.disabled).toBe(true);

    dropFile(dropzone, new File(['fake source'], 'sample.pdf', { type: 'application/pdf' }));
    expect(button.disabled).toBe(false);
    const slider = root.querySelector<HTMLInputElement>('input[type=range]')!;
    slider.value = '90';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.textContent).toContain('90%');

    button.click();
    expect(button.textContent).toContain('BURNING');
    await flush();
    expect(processMock).toHaveBeenCalledWith(expect.any(File), 90, expect.any(Function));
    expect(download).not.toHaveBeenCalled();
    expect(root.textContent).toContain('2 pages');
    expect(root.textContent).toContain('Your scorched PDF is ready');
    expect(root.querySelector('img')?.getAttribute('src')).toContain('data:image/jpeg');
    const readyButton = root.querySelector<HTMLButtonElement>('.burn-button')!;
    expect(readyButton.textContent).toContain('DOWNLOAD BURNT PDF');
    readyButton.click();
    expect(download).toHaveBeenCalledOnce();
    expect(root.querySelector<HTMLButtonElement>('.burn-button')!.textContent).toContain(
      'BURN THIS PDF',
    );
  });

  it('persists settings and supports Vim-style picker, intensity, and burn keys', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:vim-burnt-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    processMock.mockResolvedValue({
      bytes: new Uint8Array([37, 80, 68, 70]),
      preview: 'data:image/jpeg;base64,preview',
      pages: 1,
    });
    const root = await mountApp();
    root.querySelector<HTMLButtonElement>('.settings-trigger')!.click();
    const toggle = root.querySelector<HTMLInputElement>('.vim-setting input')!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    expect(JSON.parse(localStorage.getItem('ember-settings')!).vimMode).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise((resolve) => setTimeout(resolve, 240));
    expect(root.querySelector('.settings-backdrop')).toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
    expect(click).toHaveBeenCalledOnce();
    dropFile(
      root.querySelector<HTMLElement>('.dropzone')!,
      new File(['pdf'], 'vim.pdf', { type: 'application/pdf' }),
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
    expect(root.textContent).toContain('63%');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    await flush();
    expect(processMock).toHaveBeenCalledWith(expect.any(File), 63, expect.any(Function));
    expect(root.textContent).toContain('1 page');
    const readyButton = root.querySelector<HTMLButtonElement>('.burn-button')!;
    expect(readyButton.textContent).toContain('DOWNLOAD BURNT PDF');
    readyButton.click();
    expect(download).toHaveBeenCalledOnce();
    expect(root.querySelector<HTMLButtonElement>('.burn-button')!.textContent).toContain(
      'BURN THIS PDF',
    );
  });

  it('auto-detects Arabic and switches direction and copy without reloading', async () => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['ar-EG', 'en'] });
    const root = await mountApp();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(root.textContent).toContain('اختار ملفك');
    root.querySelector<HTMLButtonElement>('.language-button')!.click();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(root.textContent).toContain('Choose your document');
  });

  it('shows a friendly processing error and unlocks controls afterward', async () => {
    processMock.mockRejectedValue(new Error('bad PDF'));
    const root = await mountApp();
    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    changeFile(input, new File(['broken'], 'broken.pdf', { type: 'application/pdf' }));
    root.querySelector<HTMLButtonElement>('.burn-button')!.click();
    await flush();
    expect(root.textContent).toContain('I couldn’t read that PDF');
    expect(root.querySelector<HTMLButtonElement>('.burn-button')!.disabled).toBe(false);
  });
});
