import { resolveTheme, THEME_COLORS } from './resolve.ts';

/** Languages written right-to-left. Kept here so the boot script can set `dir` before paint. */
export const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

/**
 * Builds the inline <script> that runs before first paint (PRD §4.4 "no flash"):
 * sets data-theme, data-motion, lang, dir and the theme-color meta from localStorage.
 * The theme decision reuses `resolveTheme` verbatim, so there is a single source of truth.
 */
export function buildThemeBootScript(): string {
  return `(function(){
var d=document.documentElement;
function read(k){try{return JSON.parse(localStorage.getItem('sc:'+k))}catch(e){return null}}
var resolve=${resolveTheme.toString()};
var theme='light';
try{
  var now=new Date();
  var sys=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  theme=resolve(read('theme'),now.getHours()*60+now.getMinutes(),sys);
}catch(e){}
d.setAttribute('data-theme',theme);
var meta=document.querySelector('meta[name="theme-color"]');
if(meta)meta.setAttribute('content',${JSON.stringify(THEME_COLORS)}[theme]);
var motion=read('motion');
var osReduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
d.setAttribute('data-motion',motion==='off'?'off':(motion==='reduced'||osReduced)?'reduced':'full');
var lang=read('lang');
if(typeof lang==='string'&&/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang)){
  d.setAttribute('lang',lang);
  d.setAttribute('dir',${JSON.stringify(RTL_LANGS)}.indexOf(lang.split('-')[0])>=0?'rtl':'ltr');
}
})();`;
}
