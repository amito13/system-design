import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '../config';
import i18n, { applyDocumentLanguage } from '../lib/i18n';
import { Home } from '../pages/Home';
import { NotFound } from '../pages/NotFound';
import { SectionPlaceholder } from '../pages/SectionPlaceholder';
import { Settings } from '../pages/Settings';
import { usePrefs } from '../store/prefs';
import { routeSection, useRoute, type Route } from './router';
import { CommandDialog } from './shell/CommandDialog';
import { TopBar } from './shell/TopBar';
import { useThemeController } from './theme/useThemeController';

function useLanguageSync() {
  const lang = usePrefs((s) => s.lang);
  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
    applyDocumentLanguage(lang);
  }, [lang]);
}

function renderRoute(route: Route, t: (k: string) => string): { title: string; page: ReactNode } {
  const lesson = t('learn.lesson');
  const step = t('learn.step');
  switch (route.name) {
    case 'home':
      return { title: '', page: <Home /> };
    case 'learn':
      return {
        title: t('nav.learn'),
        page: (
          <SectionPlaceholder
            section="learn"
            details={
              route.lessonId
                ? [
                    [lesson, route.lessonId],
                    [step, String(route.step)],
                  ]
                : []
            }
          />
        ),
      };
    case 'practice':
    case 'practice-review':
    case 'practice-lesson':
    case 'practice-module':
    case 'practice-drill': {
      const { name, ...params } = route;
      return {
        title: t('nav.practice'),
        page: (
          <SectionPlaceholder
            section="practice"
            details={[['view', name], ...Object.entries(params)]}
          />
        ),
      };
    }
    case 'lab':
    case 'lab-new':
    case 'lab-design':
    case 'lab-challenge':
    case 'lab-share': {
      const { name, ...params } = route;
      const entries = Object.entries(params).map(
        ([k, v]) => [k, v.length > 60 ? `${v.slice(0, 60)}…` : v] as [string, string],
      );
      return {
        title: t('nav.lab'),
        page: <SectionPlaceholder section="lab" details={[['view', name], ...entries]} />,
      };
    }
    case 'cheatsheets':
    case 'cheatsheet': {
      const { name, ...params } = route;
      return {
        title: t('nav.cheatsheets'),
        page: (
          <SectionPlaceholder
            section="cheatsheets"
            details={[['view', name], ...Object.entries(params)]}
          />
        ),
      };
    }
    case 'settings':
      return { title: t('nav.settings'), page: <Settings /> };
    case 'not-found':
      return { title: t('notFound.title'), page: <NotFound path={route.path} /> };
  }
}

export function App() {
  useThemeController();
  useLanguageSync();
  const { t } = useTranslation();
  const route = useRoute();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const { title, page } = renderRoute(route, t);
  const routeKey = window.location.hash;

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} — interactive system design`;
  }, [title]);

  // On navigation (not first load): scroll to top and move focus to the new page for screen readers.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [routeKey]);

  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t('header.skip')}
      </a>
      <div className="blueprint-bg" aria-hidden="true" />
      <TopBar section={routeSection(route)} />
      <main id="main" ref={mainRef} tabIndex={-1} className="relative z-10 pt-14 outline-none">
        {page}
      </main>
      <CommandDialog />
    </>
  );
}
