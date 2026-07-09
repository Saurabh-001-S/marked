// Double-submit cookie CSRF protection. On login/register we set a
// non-httpOnly `csrfToken` cookie (see authController) that the frontend
// reads via document.cookie and echoes back as the X-CSRF-Token header on
// every mutating request. A cross-site attacker can trick a browser into
// *sending* the httpOnly refresh cookie automatically, but they can't read
// its value to also send a matching header — that's the whole defense.
//
// Only applies to state-changing methods; GET/HEAD/OPTIONS never mutate
// anything so there's nothing to protect there.
export function csrfProtection(req, res, next) {
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isMutating) return next();

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrfToken;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}
