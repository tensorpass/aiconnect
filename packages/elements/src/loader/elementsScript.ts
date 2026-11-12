// Loads the Web Components script once per page, from the address the first element asking for it
// names. A load that fails can be tried again: the next request adds the script anew.

let loading: Promise<void> | null = null;

export function loadElements(src: string): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      script.remove();
      loading = null;
      reject(new Error(`The AI Connect elements did not load from ${src}.`));
    });
    document.head.append(script);
  });
  return loading;
}
