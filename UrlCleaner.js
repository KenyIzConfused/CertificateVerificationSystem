// Clean URLs: swaps /Dir/Page.html addresses for their pretty
// equivalents (e.g. /EventCRUD/EventCRUD.html -> /event-crud)
// via history.replaceState, so the address bar never shows .html.
//
// Pretty URLs are served by the rewrite rules in firebase.json
// (Firebase Hosting) and vercel.json (Vercel). For local development,
// use the rewrite-aware dev server: node scripts/dev-server.js
// (python -m http.server does NOT apply rewrites, so only .html
// links work with it).
const ROUTES = [
  { file: 'index.html', slug: '/' },
  { file: 'eventcrud/eventcrud.html', slug: '/event-crud' },
  { file: 'certificatemanagement/certificatemanagement.html', slug: '/certificate-management' },
  { file: 'attendeemanagement/attendemanagement.html', slug: '/attendee-management' },
  { file: 'login/loginadmin.html', slug: '/admin-login' },
  { file: 'certificateverification/certificateverification.html', slug: '/verify-certificate' },
  { file: 'signup/signupadmin.html', slug: '/signup' },
  { file: 'login/forgotpassword.html', slug: '/forgot-password' },
  { file: 'login/resetpassword.html', slug: '/reset-password' },
  { file: 'eventcrud/settings.html', slug: '/settings' }
];

(function cleanUrl() {
  try {
    const path = location.pathname.toLowerCase().replace(/\/+$/, '');
    for (const route of ROUTES) {
      if (path === '/' + route.file) {
        const pretty = route.slug + location.search + location.hash;
        if (location.pathname + location.search + location.hash !== pretty) {
          history.replaceState(null, '', pretty);
        }
        return;
      }
    }
  } catch (error) {
    // URL cleaning is cosmetic - never break the app over it.
  }
})();
