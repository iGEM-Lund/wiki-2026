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
              <h2 className="site-footer__heading">Our sponsors</h2>
              <SponsorRotator sponsors={sponsors} />
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
          {socials.length > 0 && (
            <section className="site-footer__section" aria-label="Social media">
              <h2 className="site-footer__heading">Follow us</h2>
              <ul className="site-footer__socials">
                {socials.map((social) => (
                  <li key={social.url}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
                      <NavIcon icon={social.icon} size={22} />
                    </a>
                  </li>
                ))}
              </ul>
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
