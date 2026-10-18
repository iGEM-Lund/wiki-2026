import { getFooter } from '@/lib/footer';
import { NavIcon } from '@/components/nav-icon';
import { SponsorRotator } from '@/components/sponsor-rotator';

function stripScheme(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export async function SiteFooter() {
  const { sponsors, socials, contact, legal } = await getFooter();
  const hasContact = Boolean(contact.email || contact.address || contact.note);

  return (
    <footer className="site__footer">
      {(sponsors.length > 0 || socials.length > 0 || hasContact) && (
        <div className="site-footer__columns">
          {sponsors.length > 0 && (
            <section className="site-footer__section site-footer__sponsors" aria-label="Sponsors">
              <h2 className="site-footer__heading">Sponsors</h2>
              <SponsorRotator sponsors={sponsors} />
            </section>
          )}
          {socials.length > 0 && (
            <section className="site-footer__section" aria-label="Links">
              <h2 className="site-footer__heading">Links</h2>
              {/* Paints the logos (black image files, which CSS colour can't reach)
                  in the heading colour: the flood, cut to each image's shape.
                  Applied inline on the links: from a stylesheet, the url(#id)
                  would resolve against the CSS file, not this page. */}
              <svg width="0" height="0" aria-hidden="true" className="site-footer__tint">
                <filter id="site-footer-tint" colorInterpolationFilters="sRGB">
                  <feFlood style={{ floodColor: 'var(--heading)' }} />
                  <feComposite in2="SourceAlpha" operator="in" />
                </filter>
              </svg>
              <ul className="site-footer__socials">
                {socials.map((social) => (
                  <li key={social.url}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label} style={{ filter: 'url(#site-footer-tint)' }}>
                      <NavIcon icon={social.icon} size={32} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {hasContact && (
            <section className="site-footer__section" aria-label="Contact">
              <h2 className="site-footer__heading">Contact</h2>
              {contact.email && (
                <p>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </p>
              )}
              {contact.address && <p className="site-footer__address">{contact.address}</p>}
              {contact.note && <p className="site-footer__address">{contact.note}</p>}
            </section>
          )}
        </div>
      )}
      {legal && (
        <p className="site-footer__legal">
          &copy; {legal.year} &middot; Content on this site is licensed under{' '}
          <a href={legal.licenseUrl}>Creative Commons Attribution 4.0 International license</a>. The repository used
          to create this Wiki is available at <a href={legal.repositoryUrl}>{stripScheme(legal.repositoryUrl)}</a>.
        </p>
      )}
    </footer>
  );
}
