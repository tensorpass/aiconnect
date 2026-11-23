// The address of the PCM worklet, the file beside this module. Bundlers that follow
// `new URL('…', import.meta.url)` copy it with the site's code. The Web Components build puts this module's
// place to the worklet's copy beside its own script.

export const PCM_WORKLET_URL = new URL('./pcmWorklet.js', import.meta.url).href;
